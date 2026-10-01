import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { listForYear, byCategory, sumAmount, monthlyTrend, availableYears, yearKey, todayStr } from '../calc'
import CategoryBreakdown from './CategoryBreakdown'

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

export default function YearView({ expenses, categories }) {
  const years = useMemo(() => availableYears(expenses), [expenses])
  const [year, setYear] = useState(yearKey(todayStr()))

  const list = useMemo(() => listForYear(expenses, year), [expenses, year])
  const breakdown = useMemo(() => byCategory(list), [list])
  const trend = useMemo(() => monthlyTrend(expenses, year), [expenses, year])
  const total = sumAmount(list)
  const idx = years.indexOf(year)

  return (
    <div className="tab-content">
      <div className="panel month-header">
        <button className="icon-btn" onClick={() => setYear(years[idx + 1])} disabled={idx >= years.length - 1} aria-label="上一年">‹</button>
        <div className="month-title">
          <div className="month-total">${fmt(total)}</div>
          <div className="muted">{year} 年</div>
        </div>
        <button className="icon-btn" onClick={() => setYear(years[idx - 1])} disabled={idx <= 0} aria-label="下一年">›</button>
      </div>

      <div className="panel">
        <h3 className="panel-title">每月趨勢</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={44} />
            <Tooltip formatter={(v) => [`$${fmt(v)}`, '花費']} />
            <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
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
