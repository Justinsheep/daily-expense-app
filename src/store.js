import { db } from './db'

// 唯一的資料存取層。畫面一律透過 store.* 讀寫，不直接碰資料庫實作。

const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2))

export const store = {
  // ---- 花費紀錄 ----
  // 不回傳已刪除的，畫面一律拿這份當資料來源
  async listExpenses() {
    const all = await db.expenses.orderBy('date').reverse().toArray()
    return all.filter((e) => !e.deleted)
  },
  async addExpense(e) {
    const now = Date.now()
    const rec = {
      amount: Number(e.amount || 0),
      category: e.category || 'other',
      note: e.note || '',
      paymentMethod: e.paymentMethod || 'other',
      date: e.date || new Date().toISOString().slice(0, 10),
      source: e.source || 'manual',
      id: uid(),
      deleted: false,
      createdAt: now,
      updatedAt: now,
    }
    await db.expenses.add(rec)
    return rec
  },
  async updateExpense(id, patch) {
    await db.expenses.update(id, { ...patch, updatedAt: Date.now() })
  },
  // 軟刪除：標記 deleted 並更新時間，讓刪除也能同步到其他裝置
  async deleteExpense(id) {
    await db.expenses.update(id, { deleted: true, updatedAt: Date.now() })
  },

  // ---- 自訂分類 ----
  async listCategories() {
    const all = await db.categories.toArray()
    return all.filter((c) => !c.deleted)
  },
  async addCategory(c) {
    const now = Date.now()
    const rec = { key: 'custom_' + uid(), label: c.label, icon: c.icon || '🏷️', id: uid(), deleted: false, updatedAt: now }
    await db.categories.add(rec)
    return rec
  },
  async deleteCategory(id) {
    await db.categories.update(id, { deleted: true, updatedAt: Date.now() })
  },

  // ---- 設定 ----
  async getSetting(key, fallback) {
    const r = await db.settings.get(key)
    return r ? r.value : fallback
  },
  async setSetting(key, value) {
    await db.settings.put({ key, value })
  },

  // ---- 備份 / 還原 ----
  async exportAll() {
    const [expenses, categories, settings] = await Promise.all([
      db.expenses.filter((e) => !e.deleted).toArray(),
      db.categories.toArray(),
      db.settings.toArray(),
    ])
    return { version: 1, exportedAt: new Date().toISOString(), expenses, categories, settings }
  },
  async importAll(data) {
    await db.transaction('rw', db.expenses, db.categories, db.settings, async () => {
      await Promise.all([db.expenses.clear(), db.categories.clear(), db.settings.clear()])
      if (data.expenses?.length) await db.expenses.bulkPut(data.expenses)
      if (data.categories?.length) await db.categories.bulkPut(data.categories)
      if (data.settings?.length) await db.settings.bulkPut(data.settings)
    })
  },
  async clearAll() {
    await db.transaction('rw', db.expenses, async () => {
      await db.expenses.clear()
    })
  },
}
