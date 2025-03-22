export const Errors = {
  NOT_LOGGED_IN: "🔒 Для выполнения действия требуется авторизация",
  INVALID_INPUT: "❌ Неверный формат команды",
  DB_ERROR: "📂 Ошибка доступа к данным. Попробуйте позже",
  REGISTER_FORMAT: "❌ Формат: /register [ID семьи] [пароль]",
  FAMILY_EXISTS: "❌ Семья с таким ID уже существует",
  GENERIC_ERROR: "⚠️ Произошла ошибка, попробуйте позже",
};

export const HelpMessages = {
  LOGIN_HELP:
    "Формат:\n/login СемейныйID Пароль\nПример:\n/login family123 qwerty",
  EXPENSE_HELP:
    "Формат:\n/expense Сумма Категория\nПример:\n/expense 1500 Продукты",
  INCOME_HELP:
    "Формат:\n/income Сумма Категория\nПример:\n/income 1500 Зарплата",
};

export const StartMessage = `👋 Привет! Я помогу вам вести учёт финансов семьи.

📌 Основные команды:
/start - Начало работы
/login [ID семьи] [пароль] - Войти в семью
/register [ID семьи] [пароль] - Создать семью
/expense [сумма] [категория] - Добавить расход
/income [сумма] [категория] - Добавить доход
/report - Отчёт за месяц

⚠️ ВАЖНО: Никому не сообщайте пароль!`;