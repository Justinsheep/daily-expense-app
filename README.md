# 快記帳

只記「每日花了多少錢」的記帳軟體。資料預設存在瀏覽器本機（IndexedDB），可選擇登入 Google 做雲端同步；同步打開後，iOS「捷徑」可以在你刷 LINE Pay / Apple Pay 時直接把這筆記進來。

## 怎麼跑起來

需要先裝 [Node.js](https://nodejs.org)（18 以上）。

```bash
npm install      # 第一次才需要
npm run dev      # 啟動，開瀏覽器到終端機印出的網址（通常 http://localhost:5173）
```

## 功能

- 快速記一筆：金額（計算機式鍵盤，可以直接打 `120+30`）、分類、付款方式、備註、日期
- 今日 / 本月 / 本年統計，含分類佔比圓餅圖、月趨勢長條圖
- 分類可自訂（預設分類不能刪）
- 匯出 / 匯入 JSON 備份
- 選擇性 Google 登入 + Supabase 雲端同步（多裝置資料一致）

## iOS 捷徑自動記帳

這是這個 App 存在的主要原因：刷 Apple Pay / LINE Pay 後不用手動開 App 輸入。

- 需要先完成 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)（雲端同步 + 捷徑要打的 API）
- 登入網站後到「設定 → 自動記帳」按「產生我的捷徑密鑰」，會給你兩句可以貼進 iPhone 捷徑「描述」的話（也可參考 [SHORTCUTS.md](SHORTCUTS.md)）
- 多人可以共用同一個後端：每個人有自己的密鑰，帳會記進各自的帳號

## 檔案結構

```
src/
  db.js / store.js     Dexie 資料庫與唯一的資料存取層
  calc.js               每日/每月/每年統計、分類加總
  sync.js               與 Supabase 的雙向同步（last-write-wins）
  categories.js         預設分類、付款方式
  App.jsx
  components/           快速記帳表單、數字鍵盤、花費清單、月/年統計圖表、設定頁
supabase/
  schema.sql             expenses / categories 資料表 + RLS
  functions/add-expense/ 給 iOS 捷徑呼叫的記帳 API（Edge Function）
.github/workflows/
  deploy.yml             建置 + 部署到 GitHub Pages
```
