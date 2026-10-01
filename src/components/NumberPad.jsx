import { useState, useEffect } from 'react'
import { evalExpr } from '../calcExpr'

const ROWS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['⌫', '0', '.', '+'],
]
const KEY_MAP = { '÷': '/', '×': '*', '−': '-' }
const fmtNum = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })

export default function NumberPad({ title, value, onCommit, onClose }) {
  const [expr, setExpr] = useState(value != null && value !== '' ? String(value) : '')

  const tap = (k) => {
    if (k === '⌫') { setExpr((e) => e.slice(0, -1)); return }
    setExpr((e) => e + (KEY_MAP[k] || k))
  }
  const clear = () => setExpr('')

  const hasOp = /[+\-*/]/.test(expr.replace(/^-/, ''))
  const result = evalExpr(expr)
  const preview = hasOp && result != null ? result : null
  const valid = result != null && result > 0

  function commit() {
    if (valid) { onCommit(String(result)); onClose() }
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9.+\-*/]$/.test(e.key)) { e.preventDefault(); tap(e.key); return }
      if (e.key === 'Backspace') { e.preventDefault(); tap('⌫'); return }
      if (e.key === 'Delete') { e.preventDefault(); clear(); return }
      if (e.key === 'Enter') { e.preventDefault(); commit(); return }
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="numpad" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span />
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="關閉">✕</button>
        </div>

        <div className="numpad-display">
          <span className="numpad-expr">{expr || '0'}</span>
          {preview != null && <span className="numpad-preview">= {fmtNum(preview)}</span>}
        </div>

        <div className="numpad-grid">
          {ROWS.flat().map((k) => (
            <button
              key={k} type="button"
              className={'numpad-key' + (/[÷×−+]/.test(k) ? ' op' : '') + (k === '⌫' ? ' fn' : '')}
              onClick={() => tap(k)}
            >{k}</button>
          ))}
        </div>
        <button type="button" className="numpad-clear" onClick={clear}>清除</button>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={commit} disabled={!valid}>確定</button>
        </div>
      </div>
    </div>
  )
}
