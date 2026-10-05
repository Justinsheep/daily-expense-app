import { useState } from 'react'
import NumberPad from './NumberPad'
import { PAYMENT_METHODS } from '../categories'

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

export default function EditExpenseModal({ expense, categories, onSave, onDelete, onClose }) {
  const [amount, setAmount] = useState(String(expense.amount))
  const [category, setCategory] = useState(expense.category)
  const [paymentMethod, setPaymentMethod] = useState(expense.paymentMethod)
  const [note, setNote] = useState(expense.note || '')
  const [date, setDate] = useState(expense.date)
  const [showPad, setShowPad] = useState(false)

  const valid = Number(amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)

  function save() {
    if (!valid) return
    onSave(expense.id, { amount: Number(amount), category, paymentMethod, note, date })
    onClose()
  }

  function remove() {
    if (!confirm('確定要刪除這筆紀錄嗎？')) return
    onDelete(expense.id)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="edit-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span />
          <h2>編輯這筆</h2>
          <button className="icon-btn" onClick={onClose} aria-label="關閉">✕</button>
        </div>

        <button type="button" className="amount-display" onClick={() => setShowPad(true)}>
          <span className="amount-label">金額</span>
          <span className="amount-value">${fmt(amount)}</span>
        </button>

        <div className="field">
          <span className="field-label">分類</span>
          <div className="chip-grid">
            {categories.map((c) => (
              <button
                key={c.key} type="button"
                className={'chip' + (category === c.key ? ' active' : '')}
                onClick={() => setCategory(c.key)}
              ><span className="chip-icon">{c.icon}</span>{c.label}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">付款方式</span>
          <div className="chip-row">
            {PAYMENT_METHODS.map((p) => (
              <button
                key={p.key} type="button"
                className={'chip' + (paymentMethod === p.key ? ' active' : '')}
                onClick={() => setPaymentMethod(p.key)}
              >{p.label}</button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <span className="field-label">日期</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div className="field grow">
            <span className="field-label">備註</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="例如：午餐" />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn danger" onClick={remove}>刪除</button>
          <button className="btn primary" onClick={save} disabled={!valid}>儲存</button>
        </div>

        {showPad && (
          <NumberPad title="修改金額" value="" onCommit={setAmount} onClose={() => setShowPad(false)} />
        )}
      </div>
    </div>
  )
}
