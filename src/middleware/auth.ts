import { Middleware } from "grammy";
import { MyContext } from "../types";
import { Errors } from "../texts";

export const requireAuth: Middleware<MyContext> = async (ctx, next) => {
  if (
    !ctx.session.isLoggedIn ||
    !ctx.session.familyId ||
    ctx.session.familyId === ""
  ) {
    await ctx.reply(Errors.NOT_LOGGED_IN);
    return;
  }
  await next();
};
