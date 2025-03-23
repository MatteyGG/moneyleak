import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { InputFile } from "grammy";
import { bot } from "../bot";
import { MyContext } from "../types";

const prisma = new PrismaClient();

// Функция для генерации Excel-отчета
async function generateExcelReport(
  familyName: string,
  startDate: Date,
  endDate: Date
) {
  // 1. Получаем данные из БД через Prisma
  const transactions = await prisma.transaction.findMany({
    where: {
      familyId: familyName,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 2. Создаем Excel-документ
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Транзакции");

  // 3. Заголовки столбцов
  worksheet.columns = [
    { header: "Дата", key: "date", width: 15 },
    { header: "Категория", key: "category", width: 20 },
    { header: "Тип", key: "type", width: 12 },
    {
      header: "Сумма",
      key: "amount",
      width: 15,
      style: { numFmt: "#,##0.00" },
    },
    { header: "Описание", key: "description", width: 30 },
  ];

  // 4. Стили для заголовков
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F81BD" },
    };
  });

  // 5. Добавляем данные
  transactions.forEach((transaction) => {
    worksheet.addRow({
      date: transaction.createdAt.toLocaleDateString("ru-RU"),
      category: transaction.category,
      type: transaction.type === "income" ? "Доход" : "Расход",
      amount: transaction.amount,
      description: transaction.description || "",
    });
  });

  // 6. Добавим итоги доходов и расходов
  const incomeTotal = worksheet.addRow({
    date: "ИТОГО ДОХОДЫ:",
    amount: {
      formula: `SUMIFS(D2:D${worksheet.rowCount}, C2:C${worksheet.rowCount}, "Доход")`,
    },
  });
  incomeTotal.getCell("amount").numFmt = "#,##0.00";
  incomeTotal.font = { bold: true };

  const expenseTotal = worksheet.addRow({
    date: "ИТОГО РАСХОДЫ:",
    amount: {
      formula: `SUMIFS(D2:D${worksheet.rowCount}, C2:C${worksheet.rowCount}, "Расход")`,
    },
  });
  expenseTotal.getCell("amount").numFmt = "#,##0.00";
  expenseTotal.font = { bold: true };

  // 7. Сохраняем в буфер
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// Пример использования в обработчике команды бота (Grammy)
bot.command("excel_report", async (ctx: MyContext) => {
  try {
    // Получаем данные за текущий месяц
    const startDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const endDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    );
    const excelBuffer = await generateExcelReport(
      ctx.session.familyName,
      startDate,
      endDate
    );

    // Отправляем файл пользователю
    await ctx.replyWithDocument(
      new InputFile(
        Buffer.from(excelBuffer),
        `report_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
    );
  } catch (error) {
    await ctx.reply("Ошибка генерации отчета 😢");
    console.error(error);
  }
});

