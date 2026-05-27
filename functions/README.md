# 防詐騙 LINE Bot（firebase-functions）

一個專為長輩設計的 LINE 防詐小幫手。把可疑的訊息或網址貼給它，它會即時判斷風險，並用大字、白話、彩色卡片提醒該怎麼做。

---

## 這個 Bot 會做什麼

使用者傳一段文字後，Bot 會跑三道關卡：

1. **抓網址比對黑名單** → 命中就回**紅色**警示卡片（叫你別點、別匯款）。
2. **沒命中網址 → 跑關鍵字規則**（假投資 / 假檢警 / 假親友）→ 命中回**紅色或黃色**提醒。
3. **都沒命中** → 回**綠色**卡片：「目前沒看到明顯詐騙特徵」，並附上「幫你完整評估」按鈕，導向風險自測網站。

另外提供 6 格圖文選單（Rich Menu）：查訊息、查網址、風險自測、防詐遊戲、撥 165、詐騙案例。

> v1 範圍：只處理**文字訊息**。圖片 OCR、語音辨識、主動推播留待 v2。

---

## 資料夾結構

```
functions/
├── index.js                 主程式：Webhook 進入點、事件分流
├── package.json
├── .env.example             環境變數範本（複製成 .env 使用）
├── lib/
│   ├── urlChecker.js        抓網址 + 比對黑名單
│   ├── keywordChecker.js    關鍵字規則比對
│   └── flexMessages.js      綠 / 黃 / 紅 三種 Flex 卡片模板
├── data/
│   ├── bad_urls.json        詐騙網址黑名單 { pattern, category, severity, note }
│   └── keywords.json        關鍵字規則庫（假投資 / 假檢警 / 假親友，每類 ≥15 詞）
├── richmenu/
│   ├── richmenu.json        圖文選單版面設定（2x3，六格）
│   ├── setup-richmenu.js    一鍵建立並啟用圖文選單
│   └── richmenu-image.png   選單底圖（2500x1686，可自行替換成美編版）
└── test/
    └── local-test.js        本地單元測試（不需連 LINE）
```

---

## 一、申請 LINE channel（Messaging API）

1. 到 [LINE Developers Console](https://developers.line.biz/console/) 用 LINE 帳號登入。
2. 建立一個 **Provider**（如果還沒有的話）。
3. 在 Provider 底下建立 **Messaging API channel**，填好名稱、圖示、類別。
4. 進入這個 channel，記下兩個值：
   - **Basic settings** 分頁 → `Channel secret`
   - **Messaging API** 分頁 → `Channel access token（long-lived）`，按 **Issue** 產生。
5. 在 **Messaging API** 分頁把這兩個關掉（避免干擾）：
   - **Auto-reply messages**：停用
   - **Greeting messages**：可留可關
6. （風險自測按鈕用）建立 **LIFF**：
   - 到對應的 **LINE Login channel**（或在同一 provider 新建一個）→ **LIFF** 分頁 → **Add**。
   - Endpoint URL 填你的風險自測網址：`https://anti-fraud-web.web.app/index.html`
   - Size 選 `Full`，建立後會得到一個 **LIFF ID**（形如 `1234567890-abcdEFGh`），等一下要用。

---

## 二、設定環境變數

1. 複製範本：

   ```bash
   cd functions
   cp .env.example .env
   ```

2. 編輯 `.env`，填入剛剛取得的值：

   ```env
   LINE_CHANNEL_ACCESS_TOKEN=你的_access_token
   LINE_CHANNEL_SECRET=你的_channel_secret
   LIFF_ID=你的_LIFF_ID
   ```

> `.env` 已被 `.gitignore` 排除，不會上傳到 GitHub。
> 正式部署時，Firebase Functions（第 2 代）會自動把 `functions/.env` 一起帶上雲端。

---

## 三、安裝與本地測試

需要 **Node.js 18 以上**。

```bash
cd functions
npm install          # 安裝套件
npm test             # 跑本地單元測試（驗證三道關卡邏輯）
```

`npm test` 不需要連到 LINE，會直接測試網址比對、關鍵字比對與 Flex 卡片產生。

### 用模擬器測 Webhook（選用）

```bash
npm run serve        # 啟動 Firebase Functions 模擬器
```

模擬器會給一個本機網址。要讓 LINE 連到本機，可搭配 [ngrok](https://ngrok.com/)：

```bash
ngrok http 5001      # 把本機 port 轉成對外網址
```

把 ngrok 給的網址 + 函式路徑當成 Webhook URL 貼到 LINE（見第五步格式）。

---

## 四、部署到 Firebase

確認已安裝 Firebase CLI 並登入（`npm install -g firebase-tools` → `firebase login`）。
本專案 `.firebaserc` 已指定專案 `anti-fraud-web`，部署區域為 **asia-east1（台灣）**。

```bash
# 在專案根目錄（anti-fraud-web/）執行
firebase deploy --only functions
```

部署成功後，終端機會印出 Webhook 函式的網址，格式類似：

```
https://asia-east1-anti-fraud-web.cloudfunctions.net/webhook
```

---

## 五、把 Webhook 接上 LINE

1. 回到 LINE Developers → 你的 channel → **Messaging API** 分頁。
2. **Webhook URL** 貼上上一步拿到的網址，按 **Update**。
3. 開啟 **Use webhook**。
4. 按 **Verify** 測試連線（應顯示 Success）。
5. 用手機加這個 Bot 為好友，傳一句話測試，例如：
   - 傳 `保證獲利 老師帶單` → 應回**紅色**假投資警示
   - 傳 `https://invest-vip-coin.io` → 應回**紅色**網址警示
   - 傳 `今天天氣真好` → 應回**綠色**邀請評估卡片

---

## 六、設定圖文選單（Rich Menu）

1. 確認 `functions/.env` 已填 `LINE_CHANNEL_ACCESS_TOKEN` 與 `LIFF_ID`。
2. （選用）把 `richmenu/richmenu-image.png` 換成你美編好的底圖，尺寸維持 **2500 x 1686**。
3. 執行：

   ```bash
   cd functions
   npm run setup-richmenu
   ```

   腳本會自動建立選單、上傳底圖、設為所有人的預設選單，並把選單裡的「風險自測」按鈕網址換成你的 LIFF ID。

---

## 七、維護指南

- **新增詐騙網址**：編輯 `data/bad_urls.json`，在 `list` 加一筆 `{ pattern, category, severity, note }`。`pattern` 用網址的特徵字串（會用「包含」比對）。
  > 網站根目錄也有一份 `bad_urls.json` 供前端使用，兩份格式相同，更新時建議一起改。
- **新增關鍵字**：編輯 `data/keywords.json`，在對應類別的 `keywords` 陣列加詞即可。
- **改卡片文案 / 顏色**：編輯 `lib/flexMessages.js`（配色集中在最上面的 `COLOR`）。
- 改完記得重新 `firebase deploy --only functions`。

---

## 風險等級對照

| 顏色 | 觸發情況 | 卡片語氣 |
|------|----------|----------|
| 🔴 紅 | 網址命中黑名單、假投資、假檢警 | 高度警示，叫你別動作、打 165 |
| 🟡 黃 | 假親友（可疑但需查證） | 提醒先用原電話向本人求證 |
| 🟢 綠 | 沒命中任何規則 | 沒看到明顯特徵，邀請做完整自測 |
