import { Bot, Context, session } from "grammy";
import { PrismaClient } from "@prisma/client";
import { prismaSessionStorage } from "./session-storage";
import { MyContext, SessionData } from "./types";

export const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);

bot.use(
  session({
    initial: (): SessionData => ({ isLoggedIn: false, familyId: "", familyName: "" }),
    storage: prismaSessionStorage,
  })
);

// Используем единый экземпляр Prisma
const prisma = new PrismaClient();

bot.use(async (ctx, next) => {
  ctx.prisma = prisma;
  await next();
});
