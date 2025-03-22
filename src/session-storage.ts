import { PrismaClient } from "@prisma/client";
import { StorageAdapter } from "grammy";
import { SessionData } from "./types";

const prisma = new PrismaClient();

export const prismaSessionStorage: StorageAdapter<SessionData> = {
  async read(key: string) {
    const session = await prisma.session.findUnique({ where: { key } });
    return session?.value ? JSON.parse(session.value) : undefined;
  },

  async write(key: string, value: SessionData) {
    await prisma.session.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  },

  async delete(key: string) {
    await prisma.session.delete({ where: { key } });
  },
};
