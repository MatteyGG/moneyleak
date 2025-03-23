import { PrismaClient } from "@prisma/client";
import { Context, SessionFlavor } from "grammy";

export interface SessionData {
  isLoggedIn: boolean;
  familyName: string;
  username?: string;
  familyId: string;
  transactionFlow?: {
    type: "expense" | "income";
    category?: string;
    amount?: number;
    description?: string;
    username?: string;
  };
}

export type MyContext = {
  prisma: PrismaClient;
} & Context & SessionFlavor<SessionData>;
