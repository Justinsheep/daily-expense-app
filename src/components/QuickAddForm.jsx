import { useState } from 'react'
import NumberPad from './NumberPad'
import { PAYMENT_METHODS } from '../categories'

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

export default function QuickAddForm({ categories, date, onDateChange, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categories[0]?.key || 'other')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [showPad, setShowPad] = useState(false)

  const valid = Number(amount) > 0

  function submit() {
    if (!valid) return
    onSubmit({ amount: Number(amount), category, paymentMethod, note, date })
    setAmount('')
    setNote('')
  }

  return (
    <div className="panel quick-add">
      <button type="button" className="amount-display" onClick={() => setShowPad(true)}>
        <span className="amount-label">金額</span>
        <span className={'amount-value' + (valid ? '' : ' placeholder')}>
          {valid ? `$${fmt(amount)}` : '點一下輸入'}
        </span>
      </button>

      <div className="field">
        <span className="field-label">分類</span>
        <div className="chip-grid">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              className={'chip' + (category === c.key ? ' active' : '')}
              onClick={() => setCategory(c.key)}
            >
              <span className="chip-icon">{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">付款方式</span>
        <div className="chip-row">
          {PAYMENT_METHODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={'chip' + (paymentMethod === p.key ? ' active' : '')}
              onClick={() => setPaymentMethod(p.key)}
            >{p.label}</button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <span className="field-label">日期</span>
          <input type="date" value={date} onChange={(e) => e.target.value && onDateChange(e.target.value)} className="input" />
        </div>
        <div className="field grow">
          <span className="field-label">備註（選填）</span>
          <input
            type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="例如：午餐、7-11" className="input"
          />
        </div>
      </div>

      <button type="button" className="btn primary submit-btn" onClick={submit} disabled={!valid}>
        記下這筆
      </button>

      {showPad && (
        <NumberPad title="輸入金額" value={amount} onCommit={setAmount} onClose={() => setShowPad(false)} />
      )}
    </div>
  )
}
