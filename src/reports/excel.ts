import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { InlineKeyboard, InputFile } from "grammy";
import { bot } from "../bot";
import { MyContext } from "../types";
import { ExcelReportTexts, Errors, Categories } from "../texts";
import { getPeriodDates } from "./utils";

const prisma = new PrismaClient();

// Функция для генерации Excel-отчета
async function generateExcelReport(
  familyName: string,
  startDate: Date,
  endDate: Date
) {
  // Получаем данные из БД через Prisma
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

  // Создаем Excel-документ
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Транзакции");

  // Добавляем заголовок отчета
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Отчет по семье: ${familyName}`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:E2');
  const periodCell = worksheet.getCell('A2');
  periodCell.value = `Период: ${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`;
  periodCell.font = { italic: true };
  periodCell.alignment = { horizontal: 'center' };

  // Добавляем пустую строку
  worksheet.addRow([]);

  // Запоминаем начальную позицию для таблицы данных
  const tableStartRow = worksheet.rowCount + 1;
  const tableStartCell = 'A' + tableStartRow;

  // Добавляем заголовки столбцов
  const headerRow = worksheet.addRow(['Дата', 'Категория', 'Тип', 'Сумма', 'Описание']);
  
  // Стили для заголовков
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F81BD" },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Устанавливаем ширину столбцов
  worksheet.columns = [
    { width: 15 },
    { width: 20 },
    { width: 12 },
    { width: 15 },
    { width: 30 },
  ];

  // Добавляем данные
  if (transactions.length === 0) {
    const noDataRow = worksheet.addRow(['Нет данных для отображения']);
    worksheet.mergeCells(`A${noDataRow.number}:E${noDataRow.number}`);
  } else {
    // Запоминаем номер строки, с которой начинаются данные
    const dataStartRow = worksheet.rowCount + 1;
    
    // Добавляем данные транзакций
    transactions.forEach((transaction) => {
      const row = worksheet.addRow([
        transaction.createdAt.toLocaleDateString("ru-RU"),
        transaction.category,
        transaction.type === "income" ? "Доход" : "Расход",
        transaction.amount,
        transaction.description || "",
      ]);
      
      // Форматируем ячейку с суммой
      row.getCell(4).numFmt = '#,##0.00 ₽';
    });
    
    // Запоминаем номер строки, на которой заканчиваются данные
    const dataEndRow = worksheet.rowCount;
    const tableEndCell = 'E' + dataEndRow;
    const tableRange = tableStartCell + ':' + tableEndCell;

    // Создаем смарт-таблицу
    worksheet.addTable({
      name: 'TransactionTable',
      ref: tableRange,
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
      columns: [
        { name: 'Дата', filterButton: true },
        { name: 'Категория', filterButton: true },
        { name: 'Тип', filterButton: true },
        { name: 'Сумма', filterButton: false },
        { name: 'Описание', filterButton: true },
      ],
      rows: transactions.map((transaction) => [
        transaction.createdAt.toLocaleDateString("ru-RU"),
        transaction.category,
        transaction.type === "income" ? "Доход" : "Расход",
        transaction.amount,
        transaction.description || "",
      ]),
    });

    // Добавляем пустую строку для разделения данных и итогов
    worksheet.addRow([]);

    // Добавляем итоги ПОСЛЕ таблицы (они не будут включены в фильтр)
    const incomeTotal = worksheet.addRow([
      "ИТОГО ДОХОДЫ:",
      "",
      "",
      {
        formula: `SUMIF(TransactionTable[Тип], "Доход", TransactionTable[Сумма])`
      },
      ""
    ]);
    
    incomeTotal.getCell(4).numFmt = '#,##0.00 ₽';
    incomeTotal.font = { bold: true };
    incomeTotal.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6FFE6" },
    };

    const expenseTotal = worksheet.addRow([
      "ИТОГО РАСХОДЫ:",
      "",
      "",
      {
        formula: `SUMIF(TransactionTable[Тип], "Расход", TransactionTable[Сумма])`
      },
      ""
    ]);
    
    expenseTotal.getCell(4).numFmt = '#,##0.00 ₽';
    expenseTotal.font = { bold: true };
    expenseTotal.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFE6E6" },
    };

    // Добавляем баланс
    const balanceRow = worksheet.addRow([
      "БАЛАНС:",
      "",
      "",
      {
        formula: `D${incomeTotal.number}-D${expenseTotal.number}`
      },
      ""
    ]);
    
    balanceRow.getCell(4).numFmt = '#,##0.00 ₽';
    balanceRow.font = { bold: true };
    balanceRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };

    // Добавляем анализ по категориям
    worksheet.addRow([]); // Пустая строка
    
    const analysisTitle = worksheet.addRow(["АНАЛИЗ ПО КАТЕГОРИЯМ"]);
    analysisTitle.font = { bold: true, size: 14 };
    worksheet.mergeCells(`A${analysisTitle.number}:E${analysisTitle.number}`);
    
    // Анализ расходов по категориям
    Categories.expense.forEach(category => {
      // Очищаем категорию от эмодзи для точного сравнения
      const cleanCategory = category.replace(/^[^\w]*\s/, '');
      
      const categoryRow = worksheet.addRow([
        category,
        "",
        "",
        {
          formula: `SUMIFS(TransactionTable[Сумма], TransactionTable[Категория], "*${cleanCategory}*", TransactionTable[Тип], "Расход")`
        },
        ""
      ]);
      
      categoryRow.getCell(4).numFmt = '#,##0.00 ₽';
    });
  }

  // Сохраняем в буфер
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// Обработчик команды /excel_report
bot.command("excel_report", async (ctx: MyContext) => {
  // Проверяем авторизацию
  if (!ctx.session.familyName) {
    await ctx.reply(Errors.NOT_LOGGED_IN);
    return;
  }

  // Создаем клавиатуру с выбором периода
  const keyboard = new InlineKeyboard()
    .text(ExcelReportTexts.week, "excel_report_week")
    .text(ExcelReportTexts.month, "excel_report_month")
    .row()
    .text(ExcelReportTexts.year, "excel_report_year")
    .text(ExcelReportTexts.all, "excel_report_all");

  await ctx.reply(ExcelReportTexts.selectRange, { reply_markup: keyboard });
});

// Тип для периода отчета
type ReportPeriod = 'week' | 'month' | 'year' | 'all';

// Обработчик callback-запросов для отчетов
bot.callbackQuery(/^excel_report_(week|month|year|all)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery();
    
    // Проверяем авторизацию
    if (!ctx.session.familyName) {
      await ctx.reply(Errors.NOT_LOGGED_IN);
      return;
    }
    
    const period = ctx.match![1] as ReportPeriod;

    let startDate: Date, endDate: Date;

    // Для всех периодов, кроме "all", используем утилиту getPeriodDates
    if (period === "all") {
      const firstTransaction = await prisma.transaction.findFirst({
        where: {
          familyId: ctx.session.familyName,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      
      startDate = firstTransaction ? firstTransaction.createdAt : new Date(2000, 0, 1);
      endDate = new Date();
    } else {
      // Для периода "year" устанавливаем корректные даты
      if (period === "year") {
        const now = new Date();
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
      } else {
        // Для остальных периодов используем утилиту
        [startDate, endDate] = getPeriodDates(period);
      }
    }

    // Уведомляем пользователя о начале генерации
    if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
      await ctx.editMessageText(ExcelReportTexts.generating);
    }

    // Генерируем и отправляем отчет
    const excelBuffer = await generateExcelReport(
      ctx.session.familyName,
      startDate,
      endDate
    );

    // Создаем безопасное название периода для использования в тексте
    const periodTextMap: Record<ReportPeriod, string> = {
      week: ExcelReportTexts.week,
      month: ExcelReportTexts.month,
      year: ExcelReportTexts.year,
      all: ExcelReportTexts.all
    };

    await ctx.replyWithDocument(
      new InputFile(
        Buffer.from(excelBuffer),
        `report_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`
      ),
      {
        caption: `Отчет за ${periodTextMap[period]} - ${ctx.session.familyName}`
      }
    );
  } catch (error) {
    await ctx.reply(Errors.GENERIC_ERROR);
    console.error("Ошибка генерации Excel отчета:", error);
  }
});