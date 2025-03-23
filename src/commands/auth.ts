// src/commands/auth.ts
import { bot } from "../bot";
import bcrypt from "bcrypt";
import prisma from "../database";
import { Keyboard } from "grammy";
import { Errors, HelpMessages, StartMessage } from "../texts";

// Стартовая команда
bot.command("start", async (ctx) => {
  const keyboard = new Keyboard()
    .text("/login")
    .text("/register")
    .row()
    .text("/help");

  await ctx.reply(StartMessage, {
    reply_markup: keyboard.resized(),
  });
});

// Регистрация семьи
bot.command("register", async (ctx) => {
  const args = ctx.match.split(" ");

  if (args.length < 2) {
    return ctx.reply(Errors.REGISTER_FORMAT);
  }

  const [familyId, password] = args;

  try {
    const exists = await prisma.family.findUnique({ where: { familyId } });
    if (exists) return ctx.reply(Errors.FAMILY_EXISTS);

    const hash = await bcrypt.hash(password, 10);
    await prisma.family.create({ data: { familyId, passwordHash: hash } });

    await ctx.reply("✅ Семья зарегистрирована! Теперь войдите через /login");
  } catch (error) {
    console.error("Registration error:", error);
    ctx.reply(Errors.DB_ERROR);
  }
});

// Авторизация
bot.command("login", async (ctx) => {
  const args = ctx.match.trim().split(" ");

  if (ctx.session.isLoggedIn) {
    return ctx.reply("❌ Вы уже авторизованы", {
      reply_markup: new Keyboard().text("/logout").resized(),
    });
  }

  if (args.length < 2) {
    return ctx.reply(HelpMessages.LOGIN_HELP, {
      reply_markup: { remove_keyboard: true },
    });
  }

  const [familyId, password] = args;

  try {
    const family = await prisma.family.findUnique({ where: { familyId } });

    if (!family) {
      return ctx.reply(`❌ Семья "${familyId}" не найдена`, {
        reply_markup: new Keyboard().text("/register").resized(),
      });
    }

    const valid = await bcrypt.compare(password, family.passwordHash);
    if (!valid) return ctx.reply("❌ Неверный пароль");

    // Сохраняем данные в сессии
    ctx.session.isLoggedIn = true;
    ctx.session.familyId = family.id;
    ctx.session.familyName = family.familyId;
    ctx.session.username = ctx.from?.username || "Неизвестный пользователь";
    // Показываем новую клавиатуру
    const financeKeyboard = new Keyboard()
      .text("/expense")
      .text("/income")
      .row()
      .text("/report")
      .text("/logout");

    await ctx.reply(`✅ Успешный вход, ${ctx.session.username}!`, {
      reply_markup: financeKeyboard.resized(),
    });
  } catch (error) {
    console.error("Login error:", error);
    ctx.reply(Errors.GENERIC_ERROR);
  }
});

// Выход из системы
bot.command("logout", async (ctx) => {
  if (!ctx.session.isLoggedIn) {
    return ctx.reply(Errors.NOT_LOGGED_IN);
  }

  ctx.session.isLoggedIn = false;
  ctx.session.familyId = '';
  ctx.session.username = '';

  await ctx.reply("✅ Вы вышли из системы", {
    reply_markup: new Keyboard().text("/login").text("/register").text("/help"),
  });
});

