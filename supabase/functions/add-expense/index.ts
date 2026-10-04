// iOS 捷徑打這支 API 來記一筆帳，不需要處理 Supabase 登入——
// 用一組只有你自己知道的密鑰驗證，寫入時固定寫進你（OWNER_USER_ID）的帳號下。
// 部署與設定步驟見專案根目錄的 SUPABASE_SETUP.md。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SHORTCUT_SECRET = Deno.env.get('SHORTCUT_SECRET')!
const OWNER_USER_ID = Deno.env.get('OWNER_USER_ID')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const VALID_PAYMENT_METHODS = new Set(['linepay', 'applepay', 'cash', 'card', 'other'])

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

  if (body.secret !== SHORTCUT_SECRET) {
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

  const now = Date.now()
  const id = crypto.randomUUID()
  const record = {
    id,
    amount,
    category: String(body.category || 'other').slice(0, 40),
    note: String(body.note || '').slice(0, 200),
    paymentMethod,
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) ? String(body.date) : new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10), // 台灣時間（UTC+8）的今天
    source: 'shortcut',
    deleted: false,
    createdAt: now,
    updatedAt: now,
  }

  const { error } = await supabase.from('expenses').upsert({
    user_id: OWNER_USER_ID,
    id,
    data: record,
    deleted: false,
    updated_at: new Date(now).toISOString(),
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, id, amount: record.amount, category: record.category }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
