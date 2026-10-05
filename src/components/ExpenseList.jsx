import { categoryIcon, categoryLabel } from '../categories'
import { sumAmount } from '../calc'

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const PAYMENT_LABEL = { linepay: 'LINE Pay', applepay: 'Apple Pay', cash: '現金', card: '信用卡', other: '其他' }

export default function ExpenseList({ expenses, categories, onDelete, onEdit, emptyText = '這天還沒有花費紀錄' }) {
  const total = sumAmount(expenses)

  return (
    <div className="panel expense-list">
      <div className="expense-list-head">
        <span>共 {expenses.length} 筆</span>
        <span className="expense-list-total">${fmt(total)}</span>
      </div>

      {expenses.length === 0 ? (
        <p className="muted empty-hint">{emptyText}</p>
      ) : (
        <ul className="expense-rows">
          {expenses.map((e) => (
            <li key={e.id} className="expense-row">
              <span className="expense-icon" onClick={onEdit ? () => onEdit(e) : undefined}>{categoryIcon(categories, e.category)}</span>
              <div className={'expense-main' + (onEdit ? ' tappable' : '')} onClick={onEdit ? () => onEdit(e) : undefined}>
                <div className="expense-title">
                  {categoryLabel(categories, e.category)}
                  {e.note ? <span className="expense-note"> · {e.note}</span> : null}
                </div>
                <div className="expense-sub">
                  {PAYMENT_LABEL[e.paymentMethod] || e.paymentMethod}
                  {e.source === 'shortcut' ? <span className="badge-shortcut">捷徑</span> : null}
                </div>
              </div>
              <span className="expense-amount" onClick={onEdit ? () => onEdit(e) : undefined}>${fmt(e.amount)}</span>
              {onDelete && (
                <button className="icon-btn ghost" onClick={() => onDelete(e.id)} aria-label="刪除">✕</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
