import { Dices } from 'lucide-react'

const ANIMALS = ['tatu', 'capivara', 'arara', 'jabuti', 'onca', 'tucano', 'boto', 'sabia', 'mico', 'coruja', 'lontra', 'ema']
const COLORS = ['azul', 'verde', 'dourado', 'roxo', 'laranja', 'prateado', 'vermelho', 'amarelo', 'rosa', 'turquesa']
const PLACES = ['na praia', 'no rio', 'na serra', 'na feira', 'no quintal', 'na lua', 'no sertao', 'na horta', 'no mercado', 'na ponte']

function pick<T>(list: T[]) {
  const [n] = crypto.getRandomValues(new Uint32Array(1))
  return list[n % list.length]
}

export function suggestRecoveryKey() {
  const [n] = crypto.getRandomValues(new Uint32Array(1))
  return `${pick(ANIMALS)} ${pick(COLORS)} ${pick(PLACES)} ${10 + (n % 90)}`
}

/** Mirrors the server: case, accents and separators don't matter. */
export function normalizeRecoveryKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\s._-]+/g, ' ')
    .trim()
}

export const RECOVERY_KEY_MIN = 8

export function isRecoveryKeyLongEnough(value: string) {
  return normalizeRecoveryKey(value).length >= RECOVERY_KEY_MIN
}

export function RecoveryKeyField({
  id,
  value,
  onChange,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  return (
    <>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          className="field min-w-0 text-lg"
          placeholder="Ex.: tatu azul na praia"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={64}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="btn btn-sun shrink-0 px-3"
          onClick={() => onChange(suggestRecoveryKey())}
          aria-label="Sugerir uma chave"
          title="Sugerir uma chave"
        >
          <Dices size={20} />
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Uma frase que só você vai lembrar, com pelo menos {RECOVERY_KEY_MIN} caracteres. Maiúsculas e acentos não
        importam. Evite seu nome ou datas óbvias.
      </p>
    </>
  )
}
