import { PrismaClient } from "@prisma/client";
import { APP } from '@/dat/const';

const prismaClientSingleton = () => (new PrismaClient());

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (APP.DEBUG) globalThis.prismaGlobal = prisma;
