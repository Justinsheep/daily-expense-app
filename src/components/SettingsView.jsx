import { useState } from 'react'
import { lineSentence, applePaySentence } from '../shortcutText'

export default function SettingsView({
  categories, onAddCategory, onDeleteCategory, rules = [], onDeleteRule, token, onCreateToken,
  supabaseEnabled, session, onLogin, onLogout,
  onExport, onImport, onClearAll,
}) {
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('🏷️')
  const custom = categories.filter((c) => c.key.startsWith('custom_'))

  function addCategory() {
    if (!label.trim()) return
    onAddCategory({ label: label.trim(), icon })
    setLabel('')
    setIcon('🏷️')
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        onImport(JSON.parse(reader.result))
      } catch {
        alert('檔案格式錯誤')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="tab-content">
      <div className="panel">
        <h3 className="panel-title">自訂分類</h3>
        <div className="field-row">
          <input className="input" style={{ width: 56 }} value={icon} onChange={(e) => setIcon(e.target.value)} />
          <input className="input grow" placeholder="分類名稱" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button className="btn primary" onClick={addCategory}>新增</button>
        </div>
        {custom.length > 0 && (
          <ul className="expense-rows" style={{ marginTop: 10 }}>
            {custom.map((c) => (
              <li key={c.id} className="expense-row">
                <span className="expense-icon">{c.icon}</span>
                <div className="expense-main"><div className="expense-title">{c.label}</div></div>
                <button className="icon-btn ghost" onClick={() => onDeleteCategory(c.id)} aria-label="刪除">✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rules.length > 0 && (
        <div className="panel">
          <h3 className="panel-title">商家對照</h3>
          <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
            Apple Pay 回報的商家名稱 → 自動套用的備註與分類。在編輯畫面勾選「以後都自動套用」就會新增。
          </p>
          <ul className="expense-rows">
            {rules.map((r) => {
              const cat = categories.find((c) => c.key === r.category)
              return (
                <li key={r.merchant} className="expense-row">
                  <span className="expense-icon">{cat?.icon || '🏷️'}</span>
                  <div className="expense-main">
                    <div className="expense-title">{r.merchant} → {r.note || '（不改備註）'}</div>
                    <div className="expense-sub">{cat?.label || '（不改分類）'}</div>
                  </div>
                  <button className="icon-btn ghost" onClick={() => onDeleteRule(r.merchant)} aria-label="刪除">✕</button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {supabaseEnabled && (
        <div className="panel">
          <h3 className="panel-title">雲端同步</h3>
          {session ? (
            <>
              <div className="settings-row-title">{session.user.email}</div>
              <p className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                你的 User ID（設定 iOS 捷徑時會用到）：<br />
                <code>{session.user.id}</code>
              </p>
              <button className="btn ghost" onClick={onLogout}>登出</button>
            </>
          ) : (
            <button className="btn primary" onClick={onLogin}>用 Google 登入以同步</button>
          )}
        </div>
      )}

      {supabaseEnabled && session && (
        <div className="panel">
          <h3 className="panel-title">自動記帳（iOS 捷徑）</h3>
          {!token ? (
            <>
              <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
                產生你專屬的密鑰後，這裡會給你兩句話，貼進 iPhone「捷徑 → 自動化 → 描述」就能做出 LINE Pay、Apple Pay 的自動記帳。需要 iOS 27 與 iPhone 15 Pro 以上。
              </p>
              <button className="btn primary" onClick={onCreateToken}>產生我的捷徑密鑰</button>
            </>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
                在 iPhone：捷徑 → 自動化 → ＋ → 描述，把下面整句貼進去。產生後檢查觸發條件，金額要是藍色變數。
              </p>
              <CopyBlock title="LINE Pay（LINE 錢包通知）" text={lineSentence(token)} />
              <CopyBlock title="Apple Pay" text={applePaySentence(token)} />
              <p className="muted" style={{ fontSize: 12 }}>密鑰只給自己用，不要分享。萬一外流可以重新產生，舊的會立刻失效。</p>
              <button className="btn ghost" onClick={onCreateToken}>重新產生密鑰</button>
            </>
          )}
        </div>
      )}

      <div className="panel">
        <h3 className="panel-title">備份</h3>
        <div className="field-row">
          <button className="btn ghost" onClick={onExport}>匯出 JSON</button>
          <label className="btn ghost" style={{ cursor: 'pointer' }}>
            匯入 JSON
            <input type="file" accept="application/json" onChange={handleImportFile} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">危險操作</h3>
        <button className="btn danger" onClick={onClearAll}>清空所有花費紀錄</button>
      </div>
    </div>
  )
}

function CopyBlock({ title, text }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('複製失敗，請長按文字手動複製')
    }
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="field-label" style={{ marginBottom: 4 }}>{title}</div>
      <textarea className="input" readOnly rows={5} value={text} style={{ width: '100%', fontSize: 12 }} onFocus={(e) => e.target.select()} />
      <button className="btn ghost" style={{ marginTop: 6 }} onClick={copy}>{copied ? '已複製' : '複製這句'}</button>
    </div>
  )
}
