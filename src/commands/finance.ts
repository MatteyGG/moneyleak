import { bot } from "../bot";
import { MyContext } from "../types";
import { Categories, AmountButtons, Errors, CallbackActions, Messages } from "../texts";
import { InlineKeyboard } from "grammy";
import { requireAuth } from "../middleware/auth";

bot.command("expense", requireAuth, async (ctx) => {
  startTransactionFlow(ctx, "expense");
});

bot.command("income", requireAuth, async (ctx) => {
  startTransactionFlow(ctx, "income");
});

async function startTransactionFlow(ctx: MyContext, type: "expense" | "income") {
  ctx.session.transactionFlow = { type, step: "category" };

  const keyboard = new InlineKeyboard();
  Categories[type].forEach((category, index) => {
    if (index % 2 === 0) {
      keyboard.row();
    }
    keyboard.text(category, `${CallbackActions.CATEGORY_PREFIX}${category}`);
  });

  await ctx.reply(
    `Выберите категорию ${type === "expense" ? "расхода" : "дохода"}:`,
    { reply_markup: keyboard }
  );
}

bot.callbackQuery(new RegExp(CallbackActions.CATEGORY_PREFIX), requireAuth, async (ctx) => {
  if (!validateTransactionFlow(ctx)) return;

  const category = ctx.callbackQuery.data.replace(CallbackActions.CATEGORY_PREFIX, "");
  ctx.session.transactionFlow = {
    ...ctx.session.transactionFlow,
    category,
    step: "amount",
    type: ctx.session.transactionFlow!.type // Ensure type is defined
  };

  await ctx.editMessageText(`Категория: ${category}\nВыберите сумму:`, {
    reply_markup: createAmountKeyboard(),
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(new RegExp(CallbackActions.AMOUNT_PREFIX), requireAuth, async (ctx) => {
  if (!validateTransactionFlow(ctx)) return;

  const amount = parseInt(ctx.callbackQuery.data.split("_")[1]);
  ctx.session.transactionFlow!.amount = amount;
  await requestDescription(ctx);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(CallbackActions.CUSTOM_AMOUNT, requireAuth, async (ctx) => {
  if (!validateTransactionFlow(ctx)) return;

  await ctx.editMessageText("Введите сумму в рублях:");
  ctx.session.transactionFlow!.step = "amount";
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(CallbackActions.SKIP_DESCRIPTION, requireAuth, async (ctx) => {
  if (!validateTransactionFlow(ctx)) return;

  ctx.session.transactionFlow!.description = "";
  await handleTransactionConfirmation(ctx);
  await ctx.answerCallbackQuery();
});

// Обработчик текстовых сообщений
bot.on("message:text", requireAuth, async (ctx, next) => {
  if (!ctx.session.transactionFlow) return next();

  const flow = ctx.session.transactionFlow;
  const text = ctx.message.text;

  if (flow.step === "amount") {
    const amount = parseFloat(text);
    if (isNaN(amount)) {
      await ctx.reply("Пожалуйста, введите корректное число:");
      return;
    }
    ctx.session.transactionFlow.amount = amount;
    await requestDescription(ctx);
    return;
  }

  if (flow.step === "description") {
    ctx.session.transactionFlow.description = text;
    await handleTransactionConfirmation(ctx);
    return;
  }

  await next();
});

async function requestDescription(ctx: MyContext) {
  ctx.session.transactionFlow!.step = "description";

  const keyboard = new InlineKeyboard()
    .text("Пропустить", CallbackActions.SKIP_DESCRIPTION);

  await ctx.reply("Введите описание транзакции:", {
    reply_markup: keyboard
  });
}

async function handleTransactionConfirmation(ctx: MyContext) {
  const flow = ctx.session.transactionFlow;
  if (!flow || !flow.amount) return;

  const confirmationKeyboard = new InlineKeyboard()
    .text("✅ Подтвердить", CallbackActions.CONFIRM)
    .text("❌ Отменить", CallbackActions.CANCEL);

  const message = [
    `Подтвердите операцию:`,
    `Тип: ${flow.type === 'expense' ? 'расход' : 'доход'}`,
    `Категория: ${flow.category || 'Не указана'}`,
    `Сумма: ${flow.amount} ₽`,
    `Описание: ${flow.description || 'нет'}`
  ].join("\n");

  await ctx.reply(message, { reply_markup: confirmationKeyboard });
}

bot.callbackQuery(CallbackActions.CONFIRM, requireAuth, async (ctx) => {
  if (!validateTransactionFlow(ctx)) return;

  const flow = ctx.session.transactionFlow!;
  try {
    await ctx.prisma.transaction.create({
      data: {
        amount: flow.amount!,
        type: flow.type,
        category: flow.category || "Другое",
        description: flow.description,
        familyId: ctx.session.familyName,
        username: ctx.session.username || "unknown",
      },
    });

    const formatter = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    });

    await ctx.reply(`✅ Успешно сохранено!\n${formatter.format(flow.amount!)}${flow.description ? `\nОписание: ${flow.description}` : ''}`);
    ctx.session.transactionFlow = undefined;
  } catch (error) {
    console.error("Transaction error:", error);
    await ctx.reply(Errors.GENERIC_ERROR);
    ctx.session.transactionFlow = undefined;
  }
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(CallbackActions.CANCEL, requireAuth, async (ctx) => {
  ctx.session.transactionFlow = undefined;
  await ctx.editMessageText("❌ Операция отменена");
  await ctx.answerCallbackQuery();
});

// Вспомогательные функции
function validateTransactionFlow(ctx: MyContext): boolean {
  if (!ctx.session.transactionFlow) {
    ctx.reply(Errors.SESSION_ERROR);
    return false;
  }
  return true;
}

function createAmountKeyboard() {
  return new InlineKeyboard()
    .row(
      ...AmountButtons.preset.map(amount => ({
        text: `${amount} ₽`,
        callback_data: `${CallbackActions.AMOUNT_PREFIX}${amount}`,
      }))
    )
    .row(
      { text: AmountButtons.custom, callback_data: CallbackActions.CUSTOM_AMOUNT }
    );
}
