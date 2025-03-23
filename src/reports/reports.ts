import { Keyboard } from "grammy";
import { bot } from "../bot";
import { requireAuth } from "../middleware/auth";
import { MyContext } from "../types";
import { Errors } from "../texts";

bot.command("report", requireAuth, async (ctx) => {
    try {
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          familyId: ctx.session.familyName,
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
