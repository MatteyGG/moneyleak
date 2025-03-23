import { bot } from "./bot";
import { connectDB } from "./database";

import "./commands/auth";
import "./commands/helper";

async function main() {
  try {
    // 1. Подключаемся к БД
    await connectDB();
    console.log("✅ Подключение к БД успешно");

    // 2. Проверяем подключение к Telegram API
    const me = await bot.api.getMe();
    console.log(`🤖 Бот @${me.username} запущен`);

    // 3. Запускаем long polling
    console.log("🔄 Ожидаем сообщения...");
    bot.start({
      onStart: (info) => console.log(`🚀 Бот запущен (${info.username})`),
      allowed_updates: ["message", "callback_query"],
    });
  } catch (error) {
    console.error("💥 Критическая ошибка при запуске:", error);
    process.exit(1);
  }
}

// Типизированная обработка ошибок
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`⚠️ Ошибка в обработчике ${ctx.update.update_id}:`, err.error);
  
  ctx.reply("😔 Произошла техническая ошибка").catch(console.error);
});

// Запускаем приложение
main();


