export const Errors = {
  NOT_LOGGED_IN: "🔒 Для выполнения действия требуется авторизация",
  INVALID_INPUT: "❌ Неверный формат команды",
  DB_ERROR: "📂 Ошибка доступа к данным. Попробуйте позже",
  REGISTER_FORMAT: "❌ Формат: /register [ID семьи] [пароль]",
  FAMILY_EXISTS: "❌ Семья с таким ID уже существует",
  GENERIC_ERROR: "⚠️ Произошла ошибка, попробуйте позже",
  SESSION_ERROR: "⚠️ Ошибка сессии. Перезайдите в систему",
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

export const Categories = {
  expense: [
    "🍔 Фаст-фуд",
    "🛒 Продукты",
    "🏠 Быт",
    "🚕 Транспорт",
    "🏫 Учеба",
    "🎮 Развлечения",
    "👕 Одежда",
    "❔ Другое",
  ],
  income: [
    "💼 Зарплата",
    "🎁 Подарок",
    "📈 Инвестиции",
    "🔄 Возврат",
    "❔ Другое",
  ],
};

export const AmountButtons = {
  preset: [500, 1000, 1500, 2000],
  custom: "🔢 Другая сумма",
};

export const CallbackActions = {
  CATEGORY_PREFIX: "category_",
  AMOUNT_PREFIX: "amount_",
  CUSTOM_AMOUNT: "custom_amount",
  CONFIRM: "confirm_transaction",
  CANCEL: "cancel_transaction",
  SKIP_DESCRIPTION: "skip_description",
};

export const Messages = {
  DESCRIPTION_SKIPPED: "Описание пропущено",
};