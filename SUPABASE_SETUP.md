# Google 登入 + 雲端同步 + 捷徑記帳 API 設定

跟著做一次就好。過程分四部分，大約 20 分鐘。做完之後：手機和電腦登入同一個 Google 帳號，資料自動同步；iOS 捷徑也能直接打 API 記帳。

> 你的網址（設定時會用到，repo 名稱、GitHub 帳號要換成你實際建的）：
> - 網站：`https://<你的 GitHub 帳號>.github.io/daily-expense-app/`
> - 網站來源：`https://<你的 GitHub 帳號>.github.io`
> - 本機開發：`http://localhost:5173`

---

## A. 建立 Supabase 專案、建資料表

1. 到 supabase.com → 用 GitHub 或 Google 登入 → **New project**，取名、設密碼、地區選 Singapore → 建立。
2. 左側 **Settings → API Keys**（找不到的話，點專案頁面上方的 **Connect** 按鈕也看得到 URL 和金鑰），記下：
   - **Project URL**（像 `https://abcdxyz.supabase.co`）
   - **Publishable key**（舊名 `anon public`，功能一樣）
   - **Secret key**（舊名 `service_role`，只在 Edge Function 用，絕對不要放進前端程式或公開 repo）
3. 左邊 **SQL Editor → New query**，貼上 [`supabase/schema.sql`](supabase/schema.sql) 整份內容、按 **Run**，建好 `expenses` / `categories` 兩張表與 RLS 規則。

## B. 在 Google Cloud 開一組 OAuth 憑證（給網頁登入用）

1. Supabase **Authentication → Providers → Google** 展開，複製 **Callback URL**。
2. Google Cloud Console → 新專案 → **OAuth 同意畫面**：User Type 選 External，填 App 名稱、信箱，**Test users** 加你自己的 Google 信箱。
3. **Credentials → Create Credentials → OAuth client ID** → Web application：
   - **Authorized JavaScript origins**：`https://<你的 GitHub 帳號>.github.io`、你的 Supabase 網址、`http://localhost:5173`
   - **Authorized redirect URIs**：貼上第 1 步的 Supabase Callback URL
4. 記下 **Client ID** 和 **Client Secret**。

## C. 在 Supabase 打開 Google 登入 + 設定網址

1. **Authentication → Providers → Google** → Enable，貼上 Client ID / Secret → Save。
2. **Authentication → URL Configuration**：
   - **Site URL**：`https://<你的 GitHub 帳號>.github.io/daily-expense-app/`
   - **Redirect URLs** 加入：同一網址、`http://localhost:5173`

把 `src/config.js` 填好、`git push` 上去，部署好後打開網站登入一次（之後 D 步驟要用到登入後顯示的 User ID）：

```js
export const SUPABASE_URL = 'https://abcdxyz.supabase.co'
export const SUPABASE_ANON_KEY = '你的 Publishable key'
```

## D. 部署「捷徑記帳 API」（Edge Function）

這支 API 讓 iOS 捷徑不用處理登入，直接用一組密鑰打 API 記帳。需要裝一次 [Supabase CLI](https://supabase.com/docs/guides/cli)。

Edge Function 本身也需要知道 Secret key 才能繞過 RLS 直接寫入，這組會自動用專案內建的環境變數帶入，不用自己另外設定；你只需要設定以下兩個自訂密鑰：

```bash
# 登入並連結專案（PROJECT_REF 在 Supabase 專案網址裡，例如 abcdxyz）
supabase login
supabase link --project-ref <你的 PROJECT_REF>

# 設定這支 function 要用的密鑰（直接在終端機跑，不會進到程式碼或 git）
supabase secrets set SHORTCUT_SECRET=<自己隨便打一串夠長夠亂的英數字，例如用密碼產生器>
supabase secrets set OWNER_USER_ID=<網站登入後，設定頁「自訂分類」下面會顯示的 User ID>

# 部署
supabase functions deploy add-expense --no-verify-jwt
```

> 注意：`supabase/functions/add-expense/index.ts` 裡讀的是 `SUPABASE_SERVICE_ROLE_KEY` 這個環境變數名稱，這是 Supabase Edge Function 執行環境**自動內建**的變數（對應到你專案的 Secret key），不用手動 `secrets set`，部署時就會自動生效。

部署成功後，你的 API 網址會是：

```
https://<你的 PROJECT_REF>.supabase.co/functions/v1/add-expense
```

接下來去 [SHORTCUTS.md](SHORTCUTS.md) 把這個網址和 `SHORTCUT_SECRET` 填進捷徑裡。

---

## 說明與常見狀況

- **anon 金鑰放進公開 repo 安全嗎？** 這個 repo 是 public 的（GitHub Pages 免費方案的限制），但 anon 金鑰本來就設計成可以公開，真正保護資料的是 RLS。**service_role 金鑰完全不同，絕對不能外流**，只存在 Supabase 的 Edge Function 環境變數裡，不會出現在前端或 git 歷史。
- **不想設定也能用**：`config.js` 留空時 App 就是純本機模式，沒有登入、只存這台，捷徑功能也就用不了。
- **SHORTCUT_SECRET 要多長？** 建議 32 碼以上英數混合，外流的風險是別人能冒用你的 API 寫入假的花費紀錄（RLS 不會擋，因為 Edge Function 用的是 service_role），但看不到也改不了你其他資料。
- **同步規則**：同一筆兩邊都改，以「較晚改的」為準。刪除也會同步。捷徑記的帳會直接寫進 Supabase，網頁下次同步（開啟時、每 30 秒、或切回前景）就會自動出現。
