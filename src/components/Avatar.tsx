const PALETTE = ['#ff5b26', '#ffd23f', '#9bd35a', '#7cc6e8', '#f49ac1', '#c9a7ff']

export function Avatar({ id, nickname, size = 40 }: { id: string; nickname: string; size?: number }) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const initial = nickname.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink font-display font-extrabold text-ink"
      style={{ width: size, height: size, background: PALETTE[h % PALETTE.length], fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  )
}
