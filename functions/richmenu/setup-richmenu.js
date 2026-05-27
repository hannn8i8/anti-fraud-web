/**
 * setup-richmenu.js — 一鍵建立並啟用 Rich Menu（圖文選單）
 * ------------------------------------------------------------
 * 做的事：
 *   1. 讀 richmenu.json（自動把 YOUR_LIFF_ID 換成環境變數 LIFF_ID）
 *   2. 在 LINE 上建立 Rich Menu
 *   3. 上傳選單底圖 richmenu-image.png（需 2500x1686 的 PNG/JPEG）
 *   4. 設為所有使用者的預設選單
 *
 * 執行方式（在 functions 資料夾底下）：
 *   npm run setup-richmenu
 *
 * 需要的環境變數（放在 functions/.env）：
 *   LINE_CHANNEL_ACCESS_TOKEN（必填）
 *   LIFF_ID（選填，沒填的話「風險自測」按鈕會維持 YOUR_LIFF_ID）
 */

const fs = require("fs");
const path = require("path");
const { messagingApi } = require("@line/bot-sdk");

// ── 小工具：載入 functions/.env（不依賴額外套件）──
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

// ── 把 richmenu.json 整理成 LINE API 要的格式（去掉中文註解欄位）──
function buildRichMenuRequest() {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, "richmenu.json"), "utf8")
  );
  const liffId = process.env.LIFF_ID || "YOUR_LIFF_ID";

  return {
    size: raw.size,
    selected: raw.selected,
    name: raw.name,
    chatBarText: raw.chatBarText,
    areas: raw.areas.map((area) => {
      const action = { ...area.action };
      // 自動帶入 LIFF ID
      if (action.uri) {
        action.uri = action.uri.replace("YOUR_LIFF_ID", liffId);
      }
      return { bounds: area.bounds, action };
    }),
  };
}

async function main() {
  loadEnv();

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    console.error("❌ 找不到 LINE_CHANNEL_ACCESS_TOKEN，請先在 functions/.env 設定。");
    process.exit(1);
  }

  const imagePath = path.join(__dirname, "richmenu-image.png");
  if (!fs.existsSync(imagePath)) {
    console.error(
      "❌ 找不到選單底圖 richmenu/richmenu-image.png\n" +
      "   請放一張 2500x1686 的 PNG（六格對應：查訊息/查網址/風險自測/防詐遊戲/撥165/詐騙案例）。"
    );
    process.exit(1);
  }

  const client = new messagingApi.MessagingApiClient({ channelAccessToken });
  const blobClient = new messagingApi.MessagingApiBlobClient({ channelAccessToken });

  // 1) 建立選單
  const req = buildRichMenuRequest();
  const { richMenuId } = await client.createRichMenu(req);
  console.log("✅ 已建立 Rich Menu：", richMenuId);

  // 2) 上傳底圖
  const buffer = fs.readFileSync(imagePath);
  const blob = new Blob([buffer], { type: "image/png" });
  await blobClient.setRichMenuImage(richMenuId, blob);
  console.log("✅ 已上傳選單底圖");

  // 3) 設為預設選單（所有使用者都看得到）
  await client.setDefaultRichMenu(richMenuId);
  console.log("✅ 已設為預設選單，大功告成！");
}

main().catch((err) => {
  console.error("❌ 設定 Rich Menu 失敗：", err?.body || err?.message || err);
  process.exit(1);
});
