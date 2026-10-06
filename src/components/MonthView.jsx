import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { listForMonth, byCategory, sumAmount, availableMonths, monthKey, todayStr, dailyTrend } from '../calc'
import CategoryBreakdown from './CategoryBreakdown'

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function MonthView({ expenses, categories }) {
  const months = useMemo(() => availableMonths(expenses), [expenses])
  const [month, setMonth] = useState(monthKey(todayStr()))

  const list = useMemo(() => listForMonth(expenses, month), [expenses, month])
  const breakdown = useMemo(() => byCategory(list), [list])
  const trend = useMemo(() => dailyTrend(expenses, month), [expenses, month])
  const total = sumAmount(list)
  const canGoNext = months.includes(shiftMonth(month, 1)) || shiftMonth(month, 1) <= monthKey(todayStr())

  // 日均：本月只算到今天為止的天數，過去的月份算整個月
  const today = todayStr()
  const daysCounted = month === monthKey(today) ? Number(today.slice(8, 10)) : trend.length
  const dailyAvg = daysCounted ? total / daysCounted : 0

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

      <div className="panel stat-row">
        <div><div className="stat-num">${fmt(dailyAvg)}</div><div className="muted">日均</div></div>
        <div><div className="stat-num">{list.length}</div><div className="muted">筆數</div></div>
        <div><div className="stat-num">${fmt(Math.max(0, ...trend.map((d) => d.total)))}</div><div className="muted">單日最高</div></div>
      </div>

      <div className="panel">
        <h3 className="panel-title">每日花費</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} width={44} />
            <Tooltip formatter={(v) => [`$${fmt(v)}`, '花費']} labelFormatter={(l) => `${l} 日`} />
            <Bar dataKey="total" fill="var(--accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3 className="panel-title">分類佔比</h3>
        <CategoryBreakdown breakdown={breakdown} categories={categories} />
      </div>
    </div>
  )
}
