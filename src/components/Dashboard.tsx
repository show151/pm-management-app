// src/components/Dashboard.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type TaskData = {
  id: string
  title: string
  status: string
  estimatedMinutes: number | null
  actualMinutes: number | null
}

export default function Dashboard({ tasks }: { tasks: TaskData[] }) {
  // 完了済みで、かつ時間の記録があるタスクだけを抽出
  const completedTasks = tasks.filter(
    (t) => t.status === 'DONE' && t.actualMinutes !== null && t.estimatedMinutes !== null
  )

  // グラフ用にデータを整形（タスク名、予定時間、実績時間）
  const chartData = completedTasks.map((t) => ({
    name: t.title.length > 10 ? t.title.substring(0, 10) + '...' : t.title, // 長い名前は省略
    予定: t.estimatedMinutes || 0,
    実績: t.actualMinutes || 0,
  }))

  // 合計時間の計算
  const totalEstimated = completedTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0)
  const totalActual = completedTasks.reduce((acc, t) => acc + (t.actualMinutes || 0), 0)
  
  // 見積もり精度（実績 ÷ 予定）
  // 1.0に近いほど優秀。1.0超えは「見積もりが甘かった」、1.0未満は「余裕を持ちすぎた」
  const accuracyRatio = totalEstimated > 0 ? (totalActual / totalEstimated).toFixed(2) : '---'

  if (completedTasks.length === 0) {
    return null // データがない場合は何も表示しない
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-pink-500 p-6 rounded-xl shadow-lg border border-blue-400 mb-8">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        📊 メタ認知ダッシュボード
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-600 p-4 rounded-lg text-center border border-blue-400">
          <p className="text-xs text-blue-100 font-bold mb-1">完了タスク数</p>
          <p className="text-2xl font-black text-white">{completedTasks.length}</p>
        </div>
        <div className="bg-pink-600 p-4 rounded-lg text-center border border-pink-400">
          <p className="text-xs text-pink-100 font-bold mb-1">総実績時間</p>
          <p className="text-2xl font-black text-white">{totalActual}<span className="text-sm ml-1">分</span></p>
        </div>
        <div className={`p-4 rounded-lg text-center border ${Number(accuracyRatio) > 1.2 ? 'bg-red-600 border-red-400' : 'bg-green-600 border-green-400'}`}>
          <p className="text-xs font-bold mb-1 text-gray-200">見積もり対実績比</p>
          <p className="text-2xl font-black text-white">x{accuracyRatio}</p>
          <p className="text-[10px] text-gray-300 mt-1">1.0に近いほど高精度</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 12}} />
            <YAxis />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            <Bar dataKey="予定" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="実績" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <p className="text-xs text-center text-gray-300 mt-2">
        青い棒（実績）が灰色（予定）を突き抜けている場合、見積もりが甘い傾向にあります。
      </p>
    </div>
  )
}