import { Keyboard, InlineKeyboard } from "grammy";
import { MyContext } from "../types";
import { Categories, AmountButtons } from "../texts";

export const createCategoryKeyboard = (type: 'expense' | 'income') => {
  return new InlineKeyboard()
    .row(...Categories[type].map((c) => ({
      text: c,
      callback_data: `category_${c.replace(/ /g, '_')}`,
    })));
};

export async function startTransactionFlow(
  ctx: MyContext,
  type: "expense" | "income"
) {
  ctx.session.transactionFlow = { type };

  await ctx.reply(
    `Выберите категорию ${type === "expense" ? "расхода" : "дохода"}:`,
    { reply_markup: createCategoryKeyboard(type) }
  );
}


export async function handleCategoryInput(ctx: MyContext) {
  if (!ctx.session.transactionFlow) return;

  const category = ctx.callbackQuery?.data;
  if (!category) return;

  ctx.session.transactionFlow.category = category
    .replace(/[^a-zA-Zа-яА-Я ]/g, "")
    .trim();

  const amountKeyboard = new InlineKeyboard()
    .row(
      ...AmountButtons.preset.map((a) => ({
        text: `${a} ₽`,
        callback_data: `amount_${a}`,
      }))
    )
    .row({ text: AmountButtons.custom, callback_data: "custom_amount" });

  await ctx.editMessageText(
    `Выбрана категория: ${category}\nТеперь укажите сумму:`,
    { reply_markup: amountKeyboard }
  );
}

export async function handleAmountInput(ctx: MyContext) {
  if (!ctx.session.transactionFlow) return;

  // Обработка пресетных сумм
  if (ctx.callbackQuery?.data?.startsWith("amount_")) {
    const amount = Number(ctx.callbackQuery.data.split("_")[1]);

    if (isNaN(amount)) {
      await ctx.answerCallbackQuery("❌ Ошибка распознавания суммы");
      return;
    }

    // Сохраняем транзакцию
    await saveTransaction(ctx, amount);

    // Удаляем клавиатуру
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.answerCallbackQuery();
    return;
  }

  // Обработка кастомной суммы
  if (ctx.callbackQuery?.data === "custom_amount") {
    await ctx.editMessageText("💵 Введите сумму в рублях:");
    ctx.session.transactionFlow.amount = undefined;
    await ctx.answerCallbackQuery();
    return;
  }
}

export async function saveTransaction(ctx: MyContext, amount?: number) {
  if (!ctx.session.transactionFlow) return;

  const finalAmount = amount || Number(ctx.message?.text);
  if (isNaN(finalAmount)) {
    await ctx.reply("❌ Неверный формат суммы. Попробуйте еще раз.");
    return;
  }

  try {
    await ctx.prisma.transaction.create({
      data: {
        amount: finalAmount,
        type: ctx.session.transactionFlow.type,
        category: ctx.session.transactionFlow.category || "Другое",
        familyId: ctx.session.familyId,
      },
    });

    await ctx.reply(
      `✅ ${
        ctx.session.transactionFlow.type === "expense" ? "Расход" : "Доход"
      } ` + `на сумму ${finalAmount} ₽ успешно сохранен!`,
      { reply_markup: new Keyboard().text("/report").resized() }
    );

    ctx.session.transactionFlow = undefined;
  } catch (error) {
    console.error("Transaction error:", error);
    await ctx.reply("❌ Ошибка при сохранении. Попробуйте позже.");
  }
}

