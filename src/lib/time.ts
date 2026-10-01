const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 45) return 'agora mesmo'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day')
  return dateFmt.format(new Date(iso))
}

export const fullDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
