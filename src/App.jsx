import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { store } from './store'
import { supabase, supabaseEnabled } from './supabase'
import { syncNow, wipeCloud } from './sync'
import { mergeCategories } from './categories'
import { listForDay, todayStr, sumAmount } from './calc'
import QuickAddForm from './components/QuickAddForm'
import ExpenseList from './components/ExpenseList'
import MonthView from './components/MonthView'
import YearView from './components/YearView'
import SettingsView from './components/SettingsView'
import EditExpenseModal from './components/EditExpenseModal'

const TABS = [
  { key: 'add', label: '今日' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年' },
  { key: 'settings', label: '設定' },
]

export default function App() {
  const [tab, setTab] = useState('add')
  const [session, setSession] = useState(null)
  const [editing, setEditing] = useState(null)
  const [rules, setRules] = useState([])

  const expenses = useLiveQuery(() => store.listExpenses(), [], [])
  const customCategories = useLiveQuery(() => store.listCategories(), [], [])
  const categories = useMemo(() => mergeCategories(customCategories), [customCategories])

  // ---- Supabase 登入狀態 ----
  useEffect(() => {
    if (!supabaseEnabled) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // 登入後：進來先同步一次，之後每 30 秒、回到前景時各同步一次
  useEffect(() => {
    if (!session) return
    const uid = session.user.id
    syncNow(uid)
    const t = setInterval(() => syncNow(uid), 30000)
    const onVis = () => { if (document.visibilityState === 'visible') syncNow(uid) }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [session])

  // 本機資料一有變動，延遲一下再推上雲端（避免每個按鍵都打一次）
  useEffect(() => {
    if (!session) return
    const t = setTimeout(() => syncNow(session.user.id), 1500)
    return () => clearTimeout(t)
  }, [session, expenses, customCategories])

  const login = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
  const logout = () => supabase.auth.signOut()

  const todayList = useMemo(() => listForDay(expenses, todayStr()), [expenses])
  const todayTotal = sumAmount(todayList)

  const addExpense = useCallback(async (e) => {
    await store.addExpense(e)
  }, [])
  const deleteExpense = useCallback(async (id) => {
    await store.deleteExpense(id)
  }, [])
  const loadRules = useCallback(async () => {
    if (!supabaseEnabled || !session) { setRules([]); return }
    const { data } = await supabase.from('merchant_rules').select('merchant, note, category').order('updated_at', { ascending: false })
    setRules(data || [])
  }, [session])
  useEffect(() => { loadRules() }, [loadRules])

  const updateExpense = useCallback(async (id, patch, rule) => {
    await store.updateExpense(id, patch)
    if (rule && session) {
      const { error } = await supabase.from('merchant_rules').upsert({
        user_id: session.user.id,
        merchant: rule.merchant.toLowerCase(),
        note: rule.note || null,
        category: rule.category || null,
        updated_at: new Date().toISOString(),
      })
      if (error) alert('商家對照存不起來：' + error.message)
      loadRules()
    }
  }, [session, loadRules])
  const deleteRule = useCallback(async (merchant) => {
    await supabase.from('merchant_rules').delete().eq('merchant', merchant)
    loadRules()
  }, [loadRules])

  const addCategory = useCallback(async (c) => { await store.addCategory(c) }, [])
  const deleteCategory = useCallback(async (id) => { await store.deleteCategory(id) }, [])

  async function exportData() {
    const data = await store.exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  async function importData(data) {
    await store.importAll(data)
    if (session) await syncNow(session.user.id)
  }
  async function clearAll() {
    if (!confirm('確定要清空所有花費紀錄嗎？此動作無法復原。')) return
    await store.clearAll()
    if (session) await wipeCloud(session.user.id)
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <h1>快記帳</h1>
        </div>
      </div>

      <div className="tab-content">
        {tab === 'add' && (
          <>
            <QuickAddForm categories={categories} onSubmit={addExpense} />
            <div className="panel today-summary">
              <span>今日已花</span>
              <span className="today-total">${todayTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <ExpenseList expenses={todayList} categories={categories} onDelete={deleteExpense} onEdit={setEditing} />
          </>
        )}
        {tab === 'month' && <MonthView expenses={expenses} categories={categories} onDelete={deleteExpense} onEdit={setEditing} />}
        {tab === 'year' && <YearView expenses={expenses} categories={categories} />}
        {tab === 'settings' && (
          <SettingsView
            categories={categories}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            rules={rules}
            onDeleteRule={deleteRule}
            supabaseEnabled={supabaseEnabled}
            session={session}
            onLogin={login}
            onLogout={logout}
            onExport={exportData}
            onImport={importData}
            onClearAll={clearAll}
          />
        )}
      </div>

      {editing && (
        <EditExpenseModal
          expense={editing}
          categories={categories}
          canSaveRule={!!session}
          onSave={updateExpense}
          onDelete={deleteExpense}
          onClose={() => setEditing(null)}
        />
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'tabbar-btn' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </nav>
    </div>
  )
}
