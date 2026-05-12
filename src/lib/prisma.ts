import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null; prismaError: string | null }

function createPrisma() {
  try {
    const client = new PrismaClient()
    return client
  } catch (e: any) {
    console.error('PrismaClient init error:', e?.message || e)
    globalForPrisma.prismaError = e?.message || String(e)
    return null
  }
}

export const prisma = globalForPrisma.prisma || createPrisma()
if (process.env.NODE_ENV !== 'production' && prisma) globalForPrisma.prisma = prisma