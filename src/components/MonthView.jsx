import { useMemo, useState } from 'react'
import { listForMonth, byCategory, sumAmount, availableMonths, monthKey, todayStr } from '../calc'
import CategoryBreakdown from './CategoryBreakdown'
import ExpenseList from './ExpenseList'

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function MonthView({ expenses, categories, onDelete }) {
  const months = useMemo(() => availableMonths(expenses), [expenses])
  const [month, setMonth] = useState(monthKey(todayStr()))

  const list = useMemo(() => listForMonth(expenses, month), [expenses, month])
  const breakdown = useMemo(() => byCategory(list), [list])
  const total = sumAmount(list)
  const canGoNext = months.includes(shiftMonth(month, 1)) || shiftMonth(month, 1) <= monthKey(todayStr())

  return (
    <div className="tab-content">
      <div className="panel month-header">
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="上個月">‹</button>
        <div className="month-title">
          <div className="month-total">${fmt(total)}</div>
          <div className="muted">{month}</div>
        </div>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={!canGoNext} aria-label="下個月">›</button>
      </div>

      <div className="panel">
        <CategoryBreakdown breakdown={breakdown} categories={categories} />
      </div>

      <ExpenseList expenses={list} categories={categories} onDelete={onDelete} emptyText="這個月還沒有花費紀錄" />
    </div>
  )
}
