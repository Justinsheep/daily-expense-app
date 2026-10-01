# iOS 捷徑自動記帳設定

前提：已經照 [SUPABASE_SETUP.md](SUPABASE_SETUP.md) 的 D 步驟部署好 `add-expense` API，手上有：
- API 網址：`https://<PROJECT_REF>.supabase.co/functions/v1/add-expense`
- 你自己設的 `SHORTCUT_SECRET`

以下兩個自動化請在「捷徑」App → 右下角「自動化」分頁 → 右上角 **+** → **建立個人自動化** 裡分別建立。

> 這份文件是依官方文件與公開教學寫的操作流程，我手邊沒有你的 iPhone 可以實測——尤其 LINE Pay 通知文字的格式（見下面第 2 節），**第一次設定完麻煩實際刷一筆、把捷徑「執行記錄」裡印出來的原始通知文字回報給我**，我再把解析規則調準。

## 1. Apple Pay（全自動，靜默，不會跳出確認畫面）

1. 建立個人自動化 → 往下找 **交易（Transaction）** → 選要監控的卡片（可全選）、類別全部打勾、不要設商家篩選 → 下一步。
2. 加入動作，依序：

   **① 字典（Dictionary）**，建立以下幾組 key / value：
   | Key | 值 |
   |---|---|
   | `secret` | 你的 `SHORTCUT_SECRET`（文字，直接打） |
   | `amount` | 點這個欄位 → 選變數 → 選「交易」的 **Currency Amount**（純數字，沒有貨幣符號）；如果清單裡沒有這個屬性，改選 **Amount**，然後中間插一個「取代文字」動作，用正規表示式 `[^0-9.]` 取代成空字串，先把 `NT$`、逗號去掉再接進來 |
   | `category` | `other`（文字；Apple Pay 無法自動判斷分類，先統一記成「其他」，之後再到 App 裡改） |
   | `paymentMethod` | `applepay` |
   | `note` | 選「交易」的 **Merchant** 或 **Name** 變數 |
   | `date` | 加一個「格式化日期」動作、格式選「自訂」填 `yyyy-MM-dd`，輸入用「目前日期」，再把結果接進這個欄位 |

   **② 取得 URL 的內容（Get Contents of URL）**
   - URL：你的 API 網址
   - 方法：POST
   - 標頭：`Content-Type` = `application/json`
   - 要求本文：選 **JSON**，直接選上一步的「字典」變數整包帶進去

3. 這個自動化的開關選 **立即執行（Run Immediately）**，不要勾「執行前詢問」。
4. 完成。之後只要用這張卡刷 Apple Pay，就會自動記這筆帳，完全不用點手機（iOS 系統規定這類自動化執行後一定會跳一個「自動化已執行」的系統小通知，這是系統行為、關不掉，但不用手動點它，帳已經記好了）。

## 2. LINE Pay（通知觸發，自動解析金額，一樣不用手動輸入）

1. 建立個人自動化 → **App** → 選 **LINE Pay** → 觸發方式選 **通知（Notification）** → 下一步。
2. 加入動作：

   **① 文字（Text）**：內容選「變數」→ **Shortcut Input** → 選 **內文（Body）**（LINE Pay 扣款通知的金額通常在內文；如果測出來是空的，改選 **標題 Title** 試試）。

   **② 符合文字（Match Text）**：在①的文字裡，用正規表示式抓出金額數字。先給一個常見格式的版本：
   ```
   (?:NT\$|\$)\s?([0-9,]+)
   ```
   這會抓出「NT$120」「$1,200」這類文字裡的數字部分（含逗號）。

   **③ 取代文字（Replace Text）**：把②抓到的結果裡的逗號 `,` 取代成空字串，變成純數字字串（例如 `1,200` → `1200`）。

   **④ 字典（Dictionary）**：
   | Key | 值 |
   |---|---|
   | `secret` | 你的 `SHORTCUT_SECRET` |
   | `amount` | ③ 的結果 |
   | `category` | `other` |
   | `paymentMethod` | `linepay` |
   | `note` | 可留空，或視通知格式再抓商家名稱 |
   | `date` | 同 Apple Pay 作法：格式化目前日期成 `yyyy-MM-dd` |

   **⑤ 取得 URL 的內容**：同 Apple Pay 的設定（POST、JSON body、帶上④的字典）。

3. 開關一樣選 **立即執行**（新版 iOS 的「通知」類自動化只能選這個，會強制跳一個系統通知告知已執行，這點跟 Apple Pay 一樣是系統行為、不影響記帳已經完成）。

### 第一次測試務必做的事

LINE Pay 通知的實際文字格式我無法在你的手機上確認，**①②③步驟很可能需要微調**。建議：

1. 先把④⑤刪掉或停用，只留①，在①後面加一個「快速查看（Quick Look）」或「顯示結果」動作，刷一筆小額（例如 $1）測試，看捷徑的執行紀錄印出的原始文字長什麼樣。
2. 把那段文字複製貼給我，我幫你把②的正規表示式改準。
3. 確認②③能正確抓出純數字後，再接回④⑤。

## 3. 想先確認 API 本身正常，不想用手機測

在電腦終端機跑（把網址和密鑰換成你自己的）：

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/add-expense" \
  -H "Content-Type: application/json" \
  -d '{"secret":"你的SHORTCUT_SECRET","amount":120,"category":"food","paymentMethod":"linepay","note":"測試"}'
```

回傳 `{"ok":true,...}` 就代表 API 正常，打開網站登入同一個帳號、同步一下，應該會看到這筆測試紀錄（之後記得手動刪掉）。
