// 統計用的彙總函式。expenses 一律是 store.listExpenses() 回來的、已經過濾掉 deleted 的陣列。

const pad2 = (n) => String(n).padStart(2, '0')
export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
export const dayKey = (d) => String(d || '').slice(0, 10)
export const monthKey = (d) => String(d || '').slice(0, 7)
export const yearKey = (d) => String(d || '').slice(0, 4)

export const sumAmount = (list) => list.reduce((s, e) => s + Number(e.amount || 0), 0)

export const listForDay = (expenses, day) => expenses.filter((e) => dayKey(e.date) === day)
export const listForMonth = (expenses, month) => expenses.filter((e) => monthKey(e.date) === month)
export const listForYear = (expenses, year) => expenses.filter((e) => yearKey(e.date) === year)

// 依分類加總，由大到小排序
export function byCategory(list) {
  const map = new Map()
  for (const e of list) {
    const k = e.category || 'other'
    map.set(k, (map.get(k) || 0) + Number(e.amount || 0))
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

// 某年 1~12 月，每月總額（沒有花費的月份補 0，畫圖才會連續）
export function monthlyTrend(expenses, year) {
  const list = listForYear(expenses, year)
  const map = new Map()
  for (const e of list) map.set(monthKey(e.date), (map.get(monthKey(e.date)) || 0) + Number(e.amount || 0))
  return Array.from({ length: 12 }, (_, i) => {
    const m = `${year}-${String(i + 1).padStart(2, '0')}`
    return { month: m, label: `${i + 1}月`, total: map.get(m) || 0 }
  })
}

// 某月每天的總額，給月曆小長條圖用
export function dailyTrend(expenses, month) {
  const list = listForMonth(expenses, month)
  const map = new Map()
  for (const e of list) map.set(dayKey(e.date), (map.get(dayKey(e.date)) || 0) + Number(e.amount || 0))
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${month}-${String(i + 1).padStart(2, '0')}`
    return { date: d, label: String(i + 1), total: map.get(d) || 0 }
  })
}

// 所有出現過花費的年份（新到舊），至少含今年
export function availableYears(expenses) {
  const years = new Set(expenses.map((e) => yearKey(e.date)))
  years.add(yearKey(todayStr()))
  return [...years].sort().reverse()
}

// 所有出現過花費的月份（新到舊，YYYY-MM），至少含本月
export function availableMonths(expenses) {
  const months = new Set(expenses.map((e) => monthKey(e.date)))
  months.add(monthKey(todayStr()))
  return [...months].sort().reverse()
}

// 把 YYYY-MM-DD 往前/往後移 delta 天（用本地日期，不受時區影響）
export function shiftDay(day, delta) {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(y, m - 1, d + delta)
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
export function dayLabel(day) {
  const [y, m, d] = day.split('-').map(Number)
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  const today = todayStr()
  const rel = day === today ? '今天' : day === shiftDay(today, -1) ? '昨天' : day === shiftDay(today, 1) ? '明天' : ''
  return `${m}/${d}（${wd}）${rel}`
}
