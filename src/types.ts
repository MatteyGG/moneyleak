import { PrismaClient } from "@prisma/client";
import { Context, SessionFlavor } from "grammy";

export interface SessionData {
  isLoggedIn: boolean;
  familyId: string;
  transactionFlow?: {
    type: "expense" | "income";
    category?: string;
    amount?: number;
  };
}

export type MyContext = {
  prisma: PrismaClient;
} & Context & SessionFlavor<SessionData>;
