'use client'

import { useState, useTransition } from 'react'
import { addComment, getComments } from '@/app/actions/comment-actions'
import { createPortal } from 'react-dom'

type Comment = {
  id: string
  body: string
  createdAt: Date
  author: {
    id: string
    email: string
    name: string | null
  }
}

type Props = {
  taskId: string
  taskTitle: string
  commentCount: number
}

export default function TaskComments({ taskId, taskTitle, commentCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loaded, setLoaded] = useState(false)

  const handleOpen = () => {
    setIsOpen(true)
    if (!loaded) {
      startTransition(async () => {
        const result = await getComments(taskId)
        if (result.ok) {
          setComments(result.comments)
          setLoaded(true)
        }
      })
    }
  }

  const handleSubmit = () => {
    if (!newComment.trim()) return
    startTransition(async () => {
      const result = await addComment(taskId, newComment)
      if (result.ok && result.comment) {
        setComments(prev => [...prev, result.comment!])
        setNewComment('')
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-[10px] text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600 px-2 py-0.5 rounded bg-gray-800 transition-colors"
      >
        💬 コメント ({commentCount})
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="modal-card max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', width: '90vw' }}
          >
            <h3 className="text-lg font-bold text-white mb-1 truncate">
              💬 {taskTitle}
            </h3>
            <p className="text-xs text-gray-400 mb-4">コメントスレッド</p>

            {/* コメント一覧 */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[100px] max-h-[50vh] pr-1">
              {isPending && !loaded ? (
                <p className="text-sm text-gray-400 text-center py-8">読み込み中...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  まだコメントはありません。最初のコメントを投稿しましょう。
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                        {(comment.author.name || comment.author.email)[0].toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-blue-300">
                        {comment.author.name || comment.author.email}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(comment.createdAt).toLocaleString('ja-JP', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap pl-8">
                      {comment.body}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* 新規コメント入力 */}
            <div className="border-t border-gray-700 pt-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                className="form-control text-sm w-full h-20 resize-none mb-2"
                placeholder="コメントを入力... (Ctrl+Enter で送信)"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="btn btn-secondary text-sm px-4"
                >
                  閉じる
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending || !newComment.trim()}
                  className="btn btn-primary text-sm px-4"
                >
                  {isPending ? '...' : '送信'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
