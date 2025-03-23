import { bot } from "../bot";
import { MyContext } from "../types";
import {
  startTransactionFlow,
  handleCategoryInput,
  handleAmountInput,
  saveTransaction,
} from "./transactionFlow";
import { requireAuth } from "../middleware/auth";
import { Keyboard } from "grammy";
import { Categories, Errors } from "../texts";

bot.command(["expense", "income"], requireAuth, async (ctx) => {
  const type = ctx.message?.text.slice(1) as "expense" | "income";
  await startTransactionFlow(ctx, type);
});

bot.callbackQuery(/^(amount_|category_)/, requireAuth, async (ctx) => {
  try {
    if (!ctx.session.transactionFlow) return;

    // Обработка категорий
    if (ctx.callbackQuery.data.startsWith("category_")) {
      const category = ctx.callbackQuery.data.replace("category_", "");
      await handleCategoryInput(ctx);
      return;
    }

    // Обработка сумм
    if (ctx.callbackQuery.data.startsWith("amount_")) {
      const amount = parseInt(ctx.callbackQuery.data.replace("amount_", ""));
      await handleAmountInput(ctx);
      return;
    }

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Callback error:", error);
    await ctx.answerCallbackQuery("⚠️ Произошла ошибка");
  }
});

bot.on("message", requireAuth, async (ctx, next) => {
  if (ctx.session.transactionFlow?.amount === undefined) {
    await saveTransaction(ctx);
    return;
  }
  await next();
});

bot.command("report", requireAuth, async (ctx) => {
  try {
    const transactions = await ctx.prisma.transaction.findMany({
      where: {
        familyId: ctx.session.familyId,
      },
    });

    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;

    await ctx.reply(
      `💰 Баланс: ${balance} ₽\n` +
        `💸 Доходы: ${income} ₽\n` +
        `💸 Расходы: ${expenses} ₽`,
      {
        reply_markup: new Keyboard().text("/logout").resized(),
      }
    );
  } catch (error) {
    console.error("Report error:", error);
    ctx.reply(Errors.GENERIC_ERROR);
  }
});

