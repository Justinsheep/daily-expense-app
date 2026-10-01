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
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Bad JSON' }), { status: 400 })
  }

  if (body.secret !== SHORTCUT_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const amount = Number(body.amount)
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
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) ? String(body.date) : new Date(now).toISOString().slice(0, 10),
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
