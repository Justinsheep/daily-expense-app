import Dexie from 'dexie'

// 本機資料庫。要換 Supabase 同步時只改 store.js / sync.js，這裡與畫面都不用動。
export const db = new Dexie('dailyExpenseDB')

db.version(1).stores({
  expenses: 'id, date, category, updatedAt',
  categories: 'id, updatedAt',
  settings: 'key',
})
