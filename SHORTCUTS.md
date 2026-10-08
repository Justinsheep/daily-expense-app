# iOS 捷徑自動記帳設定

前提：已經照 [SUPABASE_SETUP.md](SUPABASE_SETUP.md) 的 D 步驟部署好 `add-expense` API，手上有：
- API 網址：`https://uwmexneutkzzkqwsqjda.supabase.co/functions/v1/add-expense`
- 你自己設的 `SHORTCUT_SECRET`

API 支援直接用網址帶參數（GET），所以每個自動化只要 **2～3 個方塊**，不用組字典、不用寫正規表示式：

```
https://uwmexneutkzzkqwsqjda.supabase.co/functions/v1/add-expense?secret=你的密鑰&paymentMethod=linepay&amount=金額&note=備註
```

可用參數：`secret`（必填）、`amount`（必填，帶「NT$」「,」也沒關係，API 會自己去掉）、`paymentMethod`（`linepay` / `applepay` / `cash` / `card` / `other`）、`category`（預設 `other`）、`note`、`date`（`yyyy-MM-dd`，預設今天）。

自動化請在「捷徑」App → 「自動化」分頁 → 右上角 **+** → **建立個人自動化** 裡建立。

> 我手邊沒有你的 iPhone 可以實測，LINE 錢包通知的實際文字格式請以你手機上的為準。

## 0. 最懶的做法：用說的建立（iOS 27 + iPhone 15 Pro 以上）

iOS 27 的捷徑 App 可以直接描述需求，由 Apple Intelligence 幫你組出自動化：**捷徑 → 自動化 → +** → 選「描述」（Describe）那個輸入框，貼上下面整句話，產生後檢查一遍、不對就用「描述修改」或手動調整。

LINE 錢包（金額和商店名稱各用一個裝置端模型抓）：

> 當我收到來自 LINE 的通知，且名稱包含「LINE錢包」、訊息包含「付款完成」時，立即執行：先用裝置端模型，提示詞為「請從以下通知內文中提取付款金額，並只輸出純數字；如果內文是空的，或找不到付款金額，就只輸出 0：」後面接上通知的內文。再用另一個裝置端模型，提示詞為「請從以下通知內文中提取付款的商店名稱，只輸出商店名稱；如果內文是空的，或找不到商店名稱，就不要輸出任何字，不要猜測：」後面接上通知的內文。最後用「取得 URL 的內容」開啟 `https://<專案>.supabase.co/functions/v1/add-expense?secret=你的密鑰&paymentMethod=linepay&amount=`，amount 後面接第一個模型的回應，再加 `&note=` 接第二個模型的回應。

Apple Pay：

> 當我用任何卡片完成 Apple Pay 交易時，立即執行：用「取得 URL 的內容」開啟 `https://uwmexneutkzzkqwsqjda.supabase.co/functions/v1/add-expense?secret=你的密鑰&paymentMethod=applepay&amount=`，amount 後面接交易金額，再加 `&note=` 接上商家名稱。

產生後務必檢查三件事：觸發條件對不對、網址最後的金額有沒有接成「變數」（不是純文字）、開關是「立即執行」。

## 1. Apple Pay（全自動，靜默）

1. 建立個人自動化 → **交易（Transaction）** → 選卡片（可全選）、類別全勾、不篩商家 → 下一步。
2. 加一個方塊：**取得 URL 的內容**
   - URL：`https://uwmexneutkzzkqwsqjda.supabase.co/functions/v1/add-expense?secret=你的密鑰&paymentMethod=applepay&amount=` 後面接「交易」的 **Amount** 變數，再接 `&note=`，後面接「交易」的 **Merchant** 變數
   - 方法保持 GET
3. 開關選 **立即執行**。

## 2. LINE Pay（LINE 錢包通知，AI 抓金額）

1. 建立個人自動化 → **通知（Notification）** → App 選 **LINE**，加篩選條件：
   - **名稱 包含 LINE錢包**
   - **訊息 包含 付款完成**
2. 加方塊 ①：**使用模型（Use Model）** → 選 **裝置端**，提示詞寫：`取得「內文」中的付款金額，並且只輸出數字`（「內文」用變數選通知的內文）
3. 加方塊 ②：**取得 URL 的內容**
   - URL：`https://uwmexneutkzzkqwsqjda.supabase.co/functions/v1/add-expense?secret=你的密鑰&paymentMethod=linepay&amount=` 後面接 ① 的「回應」
4. 開關選 **立即執行**。

第一次請刷一筆小額測試。如果記進來的金額不對，把通知的原始文字貼給我，我來調整提示詞或 API。

## 3. 想先確認 API 本身正常

```bash
curl -G "https://uwmexneutkzzkqwsqjda.supabase.co/functions/v1/add-expense" \
  --data-urlencode "secret=你的SHORTCUT_SECRET" \
  --data-urlencode "amount=120" \
  --data-urlencode "paymentMethod=linepay"
```

回傳 `{"ok":true,...}` 就代表 API 正常，打開網站同步一下會看到這筆（記得手動刪掉）。

## 安全提醒

密鑰會出現在捷徑的網址裡，只存在你自己手機的捷徑 App，不要把含密鑰的捷徑分享出去。萬一外流，重新設一組 `SHORTCUT_SECRET`（`supabase secrets set`）就能讓舊的失效。
