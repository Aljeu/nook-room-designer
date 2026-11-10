import { useEffect, useId, useState } from 'react'

/** Accept only exact, non-negative metric values, preserving integer millimeters. */
export function parseMetric(text: string, millimetersPerUnit: 10 | 1000): number | null {
  const value = text.trim()
  const digits = millimetersPerUnit === 10 ? 1 : 3
  if (!new RegExp('^\\d+(?:\\.\\d{1,' + digits + '})?$').test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  const result = Number(whole) * millimetersPerUnit + Number(fraction.padEnd(digits, '0'))
  return Number.isSafeInteger(result) ? result : null
}

export function NumberField({ label, value, unit, scale, help, limits, onCommit }: {
  label: string; value: number; unit: 'm' | 'cm'; scale: 10 | 1000; help?: string;
  limits?: readonly [number, number]; onCommit: (millimeters: number) => string | null
}) {
  const id = useId()
  const [text, setText] = useState(String(value / scale))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setText(String(value / scale)); setError(null) }, [value, scale])
  function commit() {
    const next = parseMetric(text, scale)
    if (next === null) { setError('Enter a non-negative number with up to ' + (scale === 10 ? 'one decimal place.' : 'three decimal places.')); return }
    if (limits && (next < limits[0] || next > limits[1])) { setError('Use a value from ' + limits[0] / scale + ' to ' + limits[1] / scale + ' ' + unit + '.'); return }
    setError(onCommit(next))
  }
  return <div className="field">
    <label htmlFor={id}>{label}<span className="sr-only"> ({unit})</span></label>
    <div className={'input-wrap' + (error ? ' invalid' : '')}><input id={id} value={text} inputMode="decimal" autoComplete="off" spellCheck={false} aria-invalid={!!error} aria-describedby={[help ? id + '-help' : '', error ? id + '-error' : ''].filter(Boolean).join(' ') || undefined}
      onChange={(event) => { setText(event.target.value); setError(null) }} onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setText(String(value / scale)); setError(null) }
      }} /><span aria-hidden="true">{unit}</span></div>
    {help && <small id={id + '-help'}>{help}</small>}
    {error && <p id={id + '-error'} className="field-error" role="alert">{error}</p>}
  </div>
}
