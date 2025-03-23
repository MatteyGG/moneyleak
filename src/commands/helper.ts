import { Keyboard } from "grammy";
import { StartMessage } from "../texts";
import { MyContext } from "../types";
import { bot } from "../bot";

bot.command("start", async (ctx: MyContext) => {
  await ctx.reply(StartMessage, {
    reply_markup: new Keyboard().text("/login").text("/help"),
  });
});

bot.command("help", async (ctx: MyContext) => {
  await ctx.reply(`📚 Доступные команды:\n${StartMessage}`, {
    reply_markup: new Keyboard()
      .text("/login")
      .text("/register")
      .row()
      .text("/expense")
      .text("/income")
      .row()
      .text("/report")
      .text("/help")
      .resized(),
  });
});

bot.on("message", async (ctx) => {
  if (ctx.message.text?.startsWith("/")) {
    await ctx.reply(
      `🤷 Неизвестная команда. Используйте /start для списка команд`
    );
  }
});

bot.on("callback_query:data", async (ctx) => {
  console.warn("Unknown callback data:", ctx.callbackQuery.data);
  await ctx.answerCallbackQuery("⚠️ Устаревшая кнопка");
});