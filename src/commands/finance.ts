// src/commands/finance.ts
import { bot } from "../bot";
import { Errors, HelpMessages } from "../texts";
import { Keyboard } from "grammy";
import { requireAuth } from "../middleware/auth";


bot.command("expense", async (ctx) => {
  const args = ctx.match.trim().split(" ");

  if (args.length < 2) {
    return ctx.reply(HelpMessages.EXPENSE_HELP, {
      reply_markup: { remove_keyboard: true },
    });
  }

  const [amount, category] = args;

  try {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber)) {
      return ctx.reply(Errors.INVALID_INPUT);
    }

    await ctx.prisma.transaction.create({
      data: {
        amount: amountNumber,
        category,
        familyId: ctx.session.familyId!,
        type: "expense",
      },
    });

    await ctx.reply(`✅ Расход ${amountNumber} ₽ added to ${category}`, {
      reply_markup: new Keyboard().text("/report").resized(),
    });
  } catch (error) {
    console.error("Expense error:", error);
    ctx.reply(Errors.GENERIC_ERROR);
  }
});

bot.command("income", requireAuth, async (ctx) => {
  const args = ctx.match.trim().split(" ");

  if (args.length < 2) {
    return ctx.reply(HelpMessages.INCOME_HELP, {
      reply_markup: { remove_keyboard: true },
    });
  }

  const [amount, category] = args;

  try {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber)) {
      return ctx.reply(Errors.INVALID_INPUT);
    }

    await ctx.prisma.transaction.create({
      data: {
        amount: amountNumber,
        category,
        familyId: ctx.session.familyId, // Теперь точно string
        type: "income",
      },
    });

    await ctx.reply(`✅ Доход ${amountNumber} ₽ added to ${category}`, {
      reply_markup: new Keyboard().text("/report").resized(),
    });
  } catch (error) {
    console.error("Income error:", error);
    ctx.reply(Errors.GENERIC_ERROR);
  }
});

bot.command("report", async (ctx) => {
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
