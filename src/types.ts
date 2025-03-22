import { PrismaClient } from "@prisma/client";
import { Context, SessionFlavor } from "grammy";

export interface SessionData {
  isLoggedIn: boolean;
  familyId: string;
}

export type MyContext = {
  prisma: PrismaClient;
} & Context & SessionFlavor<SessionData>;
