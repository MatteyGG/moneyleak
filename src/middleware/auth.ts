import { Middleware } from "grammy";
import { MyContext } from "../types";
import { Errors } from "../texts";

export const requireAuth: Middleware<MyContext> = async (ctx, next) => {
  const text = ctx.message?.text?.split(" ")[0];
  if (text === "/start" || text === "/help" || text === "/register" || text === "/login") {
    await next();
    return;
  }

  if (!ctx.session.isLoggedIn) {
    await ctx.reply(Errors.NOT_LOGGED_IN);
    return;
  }

  if (!ctx.session.familyId) {
    await ctx.reply(Errors.SESSION_ERROR);
    return;
  }

  await next();
};

