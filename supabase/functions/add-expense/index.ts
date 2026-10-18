// iOS 捷徑打這支 API 來記一筆帳，不需要處理 Supabase 登入——
// 用「專屬密鑰」辨識是誰的帳：每個使用者在網站設定頁產生自己的密鑰（shortcut_tokens 表），
// 另外保留舊的單人設定（SHORTCUT_SECRET + OWNER_USER_ID）當後備，原本的捷徑不用改。
// 部署與設定步驟見專案根目錄的 SUPABASE_SETUP.md。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SHORTCUT_SECRET = Deno.env.get('SHORTCUT_SECRET')
const OWNER_USER_ID = Deno.env.get('OWNER_USER_ID')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const VALID_PAYMENT_METHODS = new Set(['linepay', 'applepay', 'cash', 'card', 'debit', 'other'])

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // 捷徑可以只用網址參數（?secret=...&amount=...）一個「取得 URL 的內容」方塊就記帳；
  // POST 時另外帶 JSON body 也行，兩種來源合併，body 優先。
  const body: Record<string, unknown> = Object.fromEntries(new URL(req.url).searchParams)
  if (req.method === 'POST') {
    try {
      Object.assign(body, await req.json())
    } catch {
      // 沒有 body 或不是 JSON：只用網址參數
    }
  }

  const secret = String(body.secret ?? '')
  let userId: string | null = null
  if (secret) {
    const { data: tok } = await supabase.from('shortcut_tokens').select('user_id').eq('token', secret).maybeSingle()
    userId = tok?.user_id ?? null
    if (!userId && SHORTCUT_SECRET && OWNER_USER_ID && secret === SHORTCUT_SECRET) userId = OWNER_USER_ID
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // 金額可能是「NT$1,200」這種帶符號的文字，只留數字和小數點
  const amount = Number(String(body.amount ?? '').replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) {
    return new Response(JSON.stringify({ error: 'Invalid amount' }), { status: 400 })
  }

  const paymentMethod = VALID_PAYMENT_METHODS.has(String(body.paymentMethod))
    ? String(body.paymentMethod)
    : 'other'

  // 商家對照：在網站編輯畫面勾「以後這家店都套用」後會存進 merchant_rules，
  // 之後同一個商家名稱（不分大小寫、去頭尾空白）刷進來就自動換成你設定的備註與分類。
  const merchant = String(body.note || '').trim().slice(0, 200)
  let ruleNote: string | null = null
  let ruleCategory: string | null = null
  if (merchant) {
    const { data: rule } = await supabase
      .from('merchant_rules')
      .select('note, category')
      .eq('user_id', userId)
      .eq('merchant', merchant.toLowerCase())
      .maybeSingle()
    ruleNote = rule?.note || null
    ruleCategory = rule?.category || null
  }

  // via=notify：由通知觸發的呼叫。同一筆付款可能有好幾個來源（實體感應、LINE 錢包通知、銀行 App 通知），
  // 10 分鐘內若已有同金額的捷徑紀錄就不再新增；如果那筆沒有店名而這次有，就把店名、付款方式補進那筆。
  if (String(body.via) === 'notify') {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: dup } = await supabase
      .from('expenses')
      .select('id, data')
      .eq('user_id', userId)
      .eq('deleted', false)
      .gte('updated_at', since)
      .filter('data->>source', 'eq', 'shortcut')
      .filter('data->>amount', 'eq', String(amount))
      .order('updated_at', { ascending: false })
      .limit(1)
    if (dup && dup.length) {
      const existing = dup[0]
      if (merchant && !String(existing.data?.merchant || existing.data?.note || '').trim()) {
        const t = Date.now()
        const data = {
          ...existing.data,
          merchant,
          note: (ruleNote ?? merchant).slice(0, 200),
          category: existing.data?.category && existing.data.category !== 'other' ? existing.data.category : (ruleCategory || existing.data?.category || 'other'),
          paymentMethod,
          updatedAt: t,
        }
        await supabase.from('expenses').update({ data, updated_at: new Date(t).toISOString() })
          .eq('user_id', userId).eq('id', existing.id)
        return new Response(JSON.stringify({ ok: true, merged: true, id: existing.id }), { headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ ok: true, duplicate: true }), { headers: { 'Content-Type': 'application/json' } })
    }
  }

  const now = Date.now()
  const id = crypto.randomUUID()
  const record = {
    id,
    amount,
    category: String(body.category || ruleCategory || 'other').slice(0, 40),
    note: (ruleNote ?? merchant).slice(0, 200),
    merchant,
    paymentMethod,
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) ? String(body.date) : new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10), // 台灣時間（UTC+8）的今天
    source: 'shortcut',
    deleted: false,
    createdAt: now,
    updatedAt: now,
  }

  const { error } = await supabase.from('expenses').upsert({
    user_id: userId,
    id,
    data: record,
    deleted: false,
    updated_at: new Date(now).toISOString(),
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // 寫入後再對帳：兩個通知幾乎同時到時，上面的「先查再寫」兩邊都會以為沒有重複。
  // 每個請求寫完都再查一次，10 分鐘內同金額有多筆就只留一筆（優先留有店名的，平手留 id 最小的），
  // 其餘標成刪除。規則固定，所以同時執行的請求會得到一樣的結果，最後一定只剩一筆。
  if (String(body.via) === 'notify') {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: rows } = await supabase
      .from('expenses')
      .select('id, data')
      .eq('user_id', userId)
      .eq('deleted', false)
      .gte('updated_at', since)
      .filter('data->>source', 'eq', 'shortcut')
      .filter('data->>amount', 'eq', String(amount))
    if (rows && rows.length > 1) {
      const hasShop = (r: { data: Record<string, unknown> }) => !!String(r.data?.merchant || r.data?.note || '').trim()
      const sorted = [...rows].sort((a, b) => (hasShop(b) ? 1 : 0) - (hasShop(a) ? 1 : 0) || String(a.id).localeCompare(String(b.id)))
      const keep = sorted[0]
      const t = Date.now()
      for (const r of sorted.slice(1)) {
        await supabase.from('expenses')
          .update({ deleted: true, data: { ...r.data, deleted: true, updatedAt: t }, updated_at: new Date(t).toISOString() })
          .eq('user_id', userId).eq('id', r.id)
      }
      return new Response(JSON.stringify({ ok: true, reconciled: true, id: keep.id }), { headers: { 'Content-Type': 'application/json' } })
    }
  }

  return new Response(JSON.stringify({ ok: true, id, amount: record.amount, category: record.category }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
