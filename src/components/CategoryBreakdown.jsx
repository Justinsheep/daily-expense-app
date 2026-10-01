import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { categoryIcon, categoryLabel } from '../categories'
import { sumAmount } from '../calc'

const COLORS = ['#b23d0d', '#2f7d5c', '#2d6ca8', '#a3762e', '#6b4f9e', '#8f2f42', '#3f8c8c', '#9c7a1a', '#555']
const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

export default function CategoryBreakdown({ breakdown, categories }) {
  const total = sumAmount(breakdown.map((b) => ({ amount: b.total })))
  if (!breakdown.length) return <p className="muted empty-hint">還沒有花費紀錄</p>

  return (
    <div className="category-breakdown">
      <div className="pie-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={breakdown} dataKey="total" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
              {breakdown.map((entry, i) => (
                <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v, n) => [`$${fmt(v)}`, categoryLabel(categories, n)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="category-rows">
        {breakdown.map((b, i) => (
          <li key={b.category} className="category-row">
            <span className="cat-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="cat-icon">{categoryIcon(categories, b.category)}</span>
            <span className="cat-label">{categoryLabel(categories, b.category)}</span>
            <span className="cat-pct">{total ? Math.round((b.total / total) * 100) : 0}%</span>
            <span className="cat-amount">${fmt(b.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
