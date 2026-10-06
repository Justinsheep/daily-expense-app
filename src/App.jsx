import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { store } from './store'
import { supabase, supabaseEnabled } from './supabase'
import { syncNow, wipeCloud } from './sync'
import { mergeCategories } from './categories'
import { listForDay, todayStr, sumAmount, shiftDay, dayLabel } from './calc'
import QuickAddForm from './components/QuickAddForm'
import ExpenseList from './components/ExpenseList'
import MonthView from './components/MonthView'
import YearView from './components/YearView'
import SettingsView from './components/SettingsView'
import EditExpenseModal from './components/EditExpenseModal'
import { newToken } from './shortcutText'

const TABS = [
  { key: 'add', label: '今日' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年' },
  { key: 'settings', label: '設定' },
]

export default function App() {
  const [tab, setTab] = useState('add')
  const [viewDate, setViewDate] = useState(todayStr())
  const [session, setSession] = useState(null)
  const [editing, setEditing] = useState(null)
  const [rules, setRules] = useState([])
  const [token, setToken] = useState(null)

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

  const dayList = useMemo(() => listForDay(expenses, viewDate), [expenses, viewDate])
  const dayTotal = sumAmount(dayList)
  const isToday = viewDate === todayStr()

  // 左右滑動切換天：往右滑看前一天、往左滑看後一天；忽略在輸入框、彈出視窗裡的滑動
  const touch = useRef(null)
  const onTouchStart = (e) => {
    if (e.target.closest('input, textarea, .modal-backdrop')) { touch.current = null; return }
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    const s = touch.current
    touch.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return
    setViewDate((d) => shiftDay(d, dx > 0 ? -1 : 1))
  }

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

  const loadToken = useCallback(async () => {
    if (!supabaseEnabled || !session) { setToken(null); return }
    const { data } = await supabase.from('shortcut_tokens').select('token').maybeSingle()
    setToken(data?.token || null)
  }, [session])
  useEffect(() => { loadToken() }, [loadToken])

  // 產生（或重新產生）自己的捷徑密鑰；舊的會立刻失效
  const createToken = useCallback(async () => {
    if (!session) return
    if (token && !confirm('重新產生後，手機上舊的捷徑會失效，需要用新的描述重建。確定嗎？')) return
    const t = newToken()
    await supabase.from('shortcut_tokens').delete().eq('user_id', session.user.id)
    const { error } = await supabase.from('shortcut_tokens').insert({ token: t, user_id: session.user.id })
    if (error) { alert('產生失敗：' + error.message); return }
    setToken(t)
  }, [session, token])

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

      <div
        className="tab-content"
        onTouchStart={tab === 'add' ? onTouchStart : undefined}
        onTouchEnd={tab === 'add' ? onTouchEnd : undefined}
      >
        {tab === 'add' && (
          <>
            <div className="panel day-nav">
              <button className="icon-btn" onClick={() => setViewDate(shiftDay(viewDate, -1))} aria-label="前一天">‹</button>
              <button className="day-nav-label" onClick={() => setViewDate(todayStr())} aria-label="回到今天">
                {dayLabel(viewDate)}
                {!isToday && <span className="day-nav-back">點一下回今天</span>}
              </button>
              <button className="icon-btn" onClick={() => setViewDate(shiftDay(viewDate, 1))} disabled={isToday} aria-label="後一天">›</button>
            </div>
            <QuickAddForm categories={categories} date={viewDate} onDateChange={setViewDate} onSubmit={addExpense} />
            <div className="panel today-summary">
              <span>{isToday ? '今日已花' : '這天已花'}</span>
              <span className="today-total">${dayTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <ExpenseList expenses={dayList} categories={categories} onDelete={deleteExpense} onEdit={setEditing} />
          </>
        )}
        {tab === 'month' && <MonthView expenses={expenses} categories={categories} />}
        {tab === 'year' && <YearView expenses={expenses} categories={categories} />}
        {tab === 'settings' && (
          <SettingsView
            categories={categories}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            rules={rules}
            token={token}
            onCreateToken={createToken}
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
