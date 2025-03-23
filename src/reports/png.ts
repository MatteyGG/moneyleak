import { PrismaClient } from "@prisma/client";
import { InputFile } from "grammy";
import { bot } from "../bot";
import { requireAuth } from "../middleware/auth";
import axios from "axios";

const prisma = new PrismaClient();

// Генерация PNG-отчета (круговая диаграмма по категориям)
export async function generateSpendingPieChart(
  familyName: string,
  periodDays = 30
) {
  // 1. Получаем данные из БД
  const startDate = new Date(Date.now() - periodDays * 86400000);

  console.log(`Generating chart for ${familyName} for the last ${periodDays} days`);

  const transactions = await prisma.transaction.findMany({
    where: {
      familyId: familyName,
      type: "expense",
    },
    select: { category: true, amount: true, createdAt: true, username: true },
  });

  console.log(`Transactions count: ${transactions.length}`);

  // 2. Группируем по категориям
  const categories: Record<string, number> = {};
  transactions.forEach((t) => {
    const category = t.category || "Uncategorized";
    categories[category] = (categories[category] || 0) + t.amount;
  });

  console.log("Categories:", categories);

  // 3. Формируем данные для графика
  const chartData = {
    type: "pie",
    data: {
      labels: Object.keys(categories),
      datasets: [
        {
          data: Object.values(categories),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#FFCD56",
            "#47DBCD",
          ],
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: `Расходы за последние ${periodDays} дней`,
      },
    },
  };

  console.log("Chart data:", chartData);

  // 4. Генерируем URL для QuickChart
  const encodedConfig = encodeURIComponent(JSON.stringify(chartData));
  const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}&width=600&height=400`;

  return chartUrl;
}

async function generateTrendChart(familyName: string) {
  const transactions = await prisma.transaction.findMany({
    where: {
      familyId: familyName,
      type: "expense",
    },
    select: { amount: true, createdAt: true },
  });

  const dailyExpenses: Record<string, number> = {};
  transactions.forEach((t) => {
    const day = t.createdAt.toISOString().slice(0, 10); // Extract date
    dailyExpenses[day] = (dailyExpenses[day] || 0) + t.amount;
  });

  const labels = Object.keys(dailyExpenses);
  const data = Object.values(dailyExpenses);

  return `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify({
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Расходы",
            data,
            borderColor: "#FF6384",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderWidth: 2,
            pointBackgroundColor: "#FF6384",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "#FF6384",
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: "Тренды расходов",
          fontSize: 18,
          fontColor: "#333",
        },
        legend: {
          display: true,
          position: "top",
          labels: {
            fontColor: "#333",
            fontSize: 12,
          },
        },
      },
    })
  )}`;
}

// Отправка отчета в боте
bot.command("spending_chart", requireAuth, async (ctx) => {
  if (!ctx.from) {
    await ctx.reply("Ошибка: не могу определить ваш ID");
    return;
  }

  try {
    const pieChartUrl = await generateSpendingPieChart(ctx.session.familyName.toString());
    const trendChartUrl = await generateTrendChart(ctx.session.familyName.toString());

    console.log("Pie Chart URL:", pieChartUrl);
    console.log("Trend Chart URL:", trendChartUrl);

    // Скачиваем изображения для отправки как файлы
    const pieResponse = await axios.get(pieChartUrl, { responseType: "arraybuffer" });
    const pieImageBuffer = Buffer.from(pieResponse.data, "binary");

    const trendResponse = await axios.get(trendChartUrl, { responseType: "arraybuffer" });
    const trendImageBuffer = Buffer.from(trendResponse.data, "binary");

    await ctx.replyWithPhoto(new InputFile(pieImageBuffer, "pie_chart.png"), {
      caption: "Ваши расходы по категориям",
    });

    await ctx.replyWithPhoto(new InputFile(trendImageBuffer, "trend_chart.png"), {
      caption: "Тренды ваших расходов",
    });
  } catch (error) {
    await ctx.reply("Ошибка генерации отчета ");
    console.error("Chart error:", error);
  }
});

