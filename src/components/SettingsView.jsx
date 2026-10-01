import { useState } from 'react'

export default function SettingsView({
  categories, onAddCategory, onDeleteCategory,
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
