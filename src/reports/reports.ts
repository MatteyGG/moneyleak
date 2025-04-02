import { Keyboard } from "grammy";
import { bot } from "../bot";
import { requireAuth } from "../middleware/auth";
import { MyContext } from "../types";
import { Errors } from "../texts";
import { formatCurrency, getPeriodDates } from "./utils";

async function generateReport(ctx: MyContext, period: string) {
  try {
    console.log(`Generating report for period: ${period}`);
    const [startDate, endDate] = getPeriodDates(period);
    console.log(`Start Date: ${startDate}, End Date: ${endDate}`);

    const transactions = await ctx.prisma.transaction.findMany({
      where: {
        familyId: ctx.session.familyName,
        ...(period !== "all" && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
    });

    console.log(`Found ${transactions.length} transactions`);

    if (transactions.length === 0) {
      console.log("No transactions found for the given period");
      return ctx.reply("Нет данных для отчета за выбранный период");
    }

    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;

    console.log(`Income: ${income}, Expenses: ${expenses}, Balance: ${balance}`);

    await ctx.reply(
      `💰 Баланс: ${formatCurrency(balance)}\n` +
        `📈 Доходы: ${formatCurrency(income)}\n` +
        `📉 Расходы: ${formatCurrency(expenses)}\n\n` +
        `📅 Период: ${
          period === "all"
            ? "все время"
            : period === "month"
            ? "за месяц"
            : period === "week"
            ? "за неделю"
            : "за день"
        }
        Экспорт в Excel:\n
        /excel_report
        Графики:\n
        /charts
        `,
      {
        reply_markup: new Keyboard()
          .text("/report_week")
          .text("/report_day")
          .text("/report_all")
          .resized(),
      }
    );
  } catch (error) {
    console.error("Report error:", error);
    ctx.reply(Errors.GENERIC_ERROR);
  }
}

bot.command("report", requireAuth, async (ctx) => {
  await generateReport(ctx, "month");
});

bot.command("report_week", requireAuth, async (ctx) => {
  await generateReport(ctx, "week");
});

bot.command("report_day", requireAuth, async (ctx) => {
  await generateReport(ctx, "day");
});

bot.command("report_all", requireAuth, async (ctx) => {
  await generateReport(ctx, "all");
});

