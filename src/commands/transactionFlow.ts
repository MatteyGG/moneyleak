import { MyContext } from "../types";
import { InlineKeyboard } from "grammy";
import { Categories, AmountButtons } from "../texts";

export async function startTransactionFlow(
  ctx: MyContext,
  type: "expense" | "income"
) {
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

export async function handleCategoryInput(ctx: MyContext, category: string) {
  if (!ctx.session.transactionFlow) return;

  ctx.session.transactionFlow.category = category;

  const amountKeyboard = new InlineKeyboard();
  AmountButtons.preset.forEach((amount) => {
    amountKeyboard.text(`${amount} ₽`, `amount_${amount}`);
  });
  amountKeyboard.row().text(AmountButtons.custom, "custom_amount");

  await ctx.editMessageText(`Категория: ${category}\nВыберите сумму:`, {
    reply_markup: amountKeyboard,
  });
}

export async function saveTransaction(ctx: MyContext, amount?: number) {
  if (!ctx.session.transactionFlow) return;

  const finalAmount = amount || Number(ctx.message?.text);
  if (isNaN(finalAmount)) {
    await ctx.reply("❌ Неверная сумма");
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

    await ctx.reply(`✅ Успешно сохранено: ${finalAmount} ₽`, {
      reply_markup: new InlineKeyboard().text("Отчет", "/report"),
    });

    ctx.session.transactionFlow = undefined;
  } catch (error) {
    console.error("Ошибка сохранения:", error);
    await ctx.reply("❌ Ошибка сохранения");
  }
}
