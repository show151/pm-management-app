// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. 念のため既存データを削除（クリーンアップ）
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // 2. ダミーユーザーの作成
  // ※Better AuthのユーザーIDを使いますが、テスト用に適当なIDを作ります
  const user = await prisma.user.create({
    data: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'テストユーザー',
    },
  })

  // 3. プロジェクトの作成
  const project = await prisma.project.create({
    data: {
      title: 'PM-Master開発プロジェクト',
      description: '最強のタスク管理アプリを作る',
      userId: user.id,
    },
  })

  // 4. タスクの作成（PM要素とメタ認知要素を含む）
  await prisma.task.create({
    data: {
      title: 'データベース設計を完了する',
      status: 'TODO',
      importance: 5, // 重要度MAX
      urgency: 4,    // 緊急度高め
      estimatedMinutes: 60, // 見積もり60分
      confidenceScore: 3,   // 自信度3（普通）
      projectId: project.id,
    },
  })

  console.log('🎉 シードデータの投入が完了しました！')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })