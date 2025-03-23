import { bot } from "../bot";
import { MyContext } from "../types";
import { Categories, AmountButtons, Errors } from "../texts";
import { InlineKeyboard } from "grammy";
import { requireAuth } from "../middleware/auth";

bot.command("expense", requireAuth, async (ctx) => {
  startTransactionFlow(ctx, "expense");
});

bot.command("income", requireAuth, async (ctx) => {
  startTransactionFlow(ctx, "income");
});

async function startTransactionFlow(ctx: MyContext, type: "expense" | "income") {
  ctx.session.transactionFlow = { type };

  const keyboard = new InlineKeyboard();
  Categories[type].forEach((category) => {
    keyboard.text(category, `category_${category}`);
  });

  await ctx.reply(
    `Выберите категорию ${type === "expense" ? "расхода" : "дохода"}:`,
    { reply_markup: keyboard }
  );
}

bot.callbackQuery(/category_/, requireAuth, async (ctx) => {
  const category = ctx.callbackQuery.data.replace("category_", "");

  if (!ctx.session.transactionFlow) {
    return;
  }
  ctx.session.transactionFlow.category = category;

  const keyboard = new InlineKeyboard()
    .row(
      { text: "500 ₽", callback_data: "amount_500" },
      { text: "1000 ₽", callback_data: "amount_1000" }
    )
    .row(
      { text: "2000 ₽", callback_data: "amount_2000" },
      { text: "Другая сумма", callback_data: "custom_amount" }
    );

  await ctx.editMessageText(`Категория: ${category}\nВыберите сумму:`, {
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/amount_/, requireAuth, async (ctx) => {
  const amount = parseInt(ctx.callbackQuery.data.split("_")[1]);

  await handleTransaction(ctx, amount);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("custom_amount", requireAuth, async (ctx) => {
  const type = ctx.session.transactionFlow?.type;
  if (type === undefined) {
    return;
  }

  ctx.session.transactionFlow = {
    type,
  };

  await ctx.editMessageText("Введите сумму в рублях:");
  await ctx.answerCallbackQuery();
});

// Обработчик для текстового ввода суммы
bot.on("message:text", requireAuth, async (ctx, next) => {
  if (ctx.session.transactionFlow) {
    const amount = parseFloat(ctx.message.text);

    if (isNaN(amount)) {
      await ctx.reply("Пожалуйста, введите корректное число:");
      return;
    }

    await handleTransaction(ctx, amount);
    return;
  }

  await next();
});

async function handleTransaction(ctx: MyContext, amount: number) {
  if (!ctx.session.transactionFlow) return;

  try {
    await ctx.prisma.transaction.create({
      data: {
        amount,
        type: ctx.session.transactionFlow.type,
        category: ctx.session.transactionFlow.category || "Другое",
        familyId: ctx.session.familyName,
        username: ctx.session.username || "unknown",
      },
    });

    await ctx.reply(`✅ Успешно сохранено: ${amount} ₽`);
    ctx.session.transactionFlow = undefined;
  } catch (error) {
    console.error("Transaction error:", error);
    await ctx.reply(Errors.GENERIC_ERROR);
  }
}

