// lib/prisma.ts (または src/lib/prisma.ts)

import { PrismaClient } from '@prisma/client'

// グローバル変数に prisma を追加（開発環境での再利用のため）
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // 実行されたSQLログをターミナルに表示（デバッグに便利）
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// アプリケーション終了時にクリーンアップ
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}