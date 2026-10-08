import { SUPABASE_URL } from './config'

export const apiUrl = () => `${SUPABASE_URL}/functions/v1/add-expense`

// 去掉容易看錯的字（0/O、1/l/I），避免在手機上貼錯
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(28))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

export function lineSentence(token) {
  return `當我收到來自 LINE 的通知，且名稱包含「LINE錢包」、訊息包含「付款完成」時，立即執行：先用裝置端模型，提示詞為「請從以下通知內文中提取付款金額，並只輸出純數字；如果內文是空的，或找不到付款金額，就只輸出 0：」後面接上通知的內文。再用另一個裝置端模型，提示詞為「請從以下通知內文中提取付款的商店名稱，只輸出商店名稱；如果內文是空的，或找不到商店名稱，就不要輸出任何字，不要猜測：」後面接上通知的內文。最後用「取得 URL 的內容」開啟 ${apiUrl()}?secret=${token}&paymentMethod=linepay&amount= ，amount 後面接第一個模型的回應，再加 &note= 接第二個模型的回應。`
}

export function applePaySentence(token) {
  return `當我用任何卡片完成 Apple Pay 交易時，立即執行：用「取得 URL 的內容」開啟 ${apiUrl()}?secret=${token}&paymentMethod=applepay&amount= ，amount 後面接交易金額，再加 &note= 接上商家名稱。`
}
