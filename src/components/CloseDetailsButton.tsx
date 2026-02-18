'use client'

type CloseDetailsButtonProps = {
  className?: string
  children?: React.ReactNode
}

export default function CloseDetailsButton({ className, children }: CloseDetailsButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const details = e.currentTarget.closest('details')
    if (details) {
      details.removeAttribute('open')
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children ?? 'キャンセル'}
    </button>
  )
}

