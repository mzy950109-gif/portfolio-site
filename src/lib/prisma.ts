import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

let prismaClient: PrismaClient

try {
  prismaClient = globalForPrisma.prisma || new PrismaClient()
} catch (e: any) {
  console.error('PrismaClient init error:', e?.message || e)
  throw e
}

export const prisma = prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
