/**
 * 防詐騙 LINE Bot — 主程式（Webhook 進入點）
 * ------------------------------------------------------------
 * 流程：
 *   1. 收到使用者文字訊息
 *   2. 先抓訊息裡的網址，比對黑名單 → 命中就回「紅色警示」
 *   3. 沒網址或沒命中 → 跑關鍵字規則（假投資 / 假檢警 / 假親友）
 *   4. 都沒命中 → 回「不確定，幫你完整評估」並附上風險自測按鈕
 *
 * 部署平台：Firebase Functions（Node 18，區域 asia-east1）
 */

// Firebase Functions v2 工具
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");

// LINE 官方 SDK
const line = require("@line/bot-sdk");

// 自己寫的邏輯模組
const { findBadUrl } = require("./lib/urlChecker");
const { matchKeywords } = require("./lib/keywordChecker");
const flex = require("./lib/flexMessages");

// 資料檔（部署時會一起打包進雲端）
const badUrls = require("./data/bad_urls.json");
const keywordRules = require("./data/keywords.json");

// ── 全域設定：所有函式都部署到台灣（彰化）機房，長輩用起來最快 ──
setGlobalOptions({ region: "asia-east1", maxInstances: 10 });

// ── 從環境變數讀取 LINE 金鑰（請放在 functions/.env，切勿上傳 git）──
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

// 建立 LINE 訊息發送用的 client
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken,
});

/**
 * Webhook 主函式：LINE 平台會把每一則使用者訊息 POST 到這裡。
 */
exports.webhook = onRequest(async (req, res) => {
  // LINE 平台有時會送驗證用的 GET 請求，直接回 200 即可
  if (req.method !== "POST") {
    res.status(200).send("LINE Bot is running.");
    return;
  }

  // 1) 驗證簽章：確認這則請求真的來自 LINE，不是別人偽造的
  const signature = req.get("x-line-signature");
  if (!channelSecret || !signature ||
      !line.validateSignature(req.rawBody, channelSecret, signature)) {
    logger.warn("簽章驗證失敗，可能不是來自 LINE 的請求");
    res.status(401).send("Invalid signature");
    return;
  }

  // 2) 逐一處理每個事件（一次可能來好幾個）
  const events = req.body.events || [];
  try {
    await Promise.all(events.map(handleEvent));
    res.status(200).send("OK");
  } catch (err) {
    logger.error("處理事件時發生錯誤", err);
    res.status(500).send("Error");
  }
});

/**
 * 處理單一事件。目前只處理「文字訊息」，其餘忽略。
 * @param {object} event LINE 傳來的事件物件
 */
async function handleEvent(event) {
  // (A) Rich Menu 按鈕（查訊息 / 查網址 / 詐騙案例）會送來 postback 事件
  if (event.type === "postback") {
    const reply = handlePostback(event.postback.data);
    if (reply) {
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [reply],
      });
    }
    return;
  }

  // (B) 文字訊息（v1 不做圖片、語音、貼圖）
  if (event.type === "message" && event.message.type === "text") {
    const reply = analyzeText(event.message.text); // 分析後得到要回覆的訊息
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [reply],
    });
    return;
  }

  // 其他事件（加好友、貼圖等）v1 先忽略
}

/**
 * 處理 Rich Menu 按鈕送來的 postback。
 * @param {string} data postback 的 data 字串，例如 "action=help_msg"
 * @return {?object} 要回覆的訊息（純文字）；不認識的就回 null
 */
function handlePostback(data) {
  switch (data) {
    case "action=help_msg":
      return {
        type: "text",
        text: "想查可疑訊息嗎？\n直接把那則訊息「複製貼上」傳給我，我馬上幫你看看有沒有問題。",
      };
    case "action=help_url":
      return {
        type: "text",
        text: "想查可疑網址嗎？\n把整個網址貼給我（http 開頭那一串），我幫你比對詐騙黑名單。",
      };
    case "action=cases":
      return {
        type: "text",
        text: "常見的詐騙手法有這幾種：\n\n" +
          "1. 假投資：說保證賺錢、老師帶你買股票。\n" +
          "2. 假檢警：自稱檢察官、警察，說你帳戶涉案要監管。\n" +
          "3. 假親友：假裝是兒女或朋友，換號碼後急著跟你借錢。\n\n" +
          "記住一句話：只要叫你『匯款、領錢、報帳號密碼』，先打 165 問！",
      };
    default:
      return null;
  }
}

/**
 * 核心分析：把使用者文字丟進三道關卡，回傳對應的 Flex 訊息。
 * @param {string} text 使用者輸入的文字
 * @return {object} 一則 LINE Flex Message
 */
function analyzeText(text) {
  // ── 關卡一：網址黑名單 ──
  const badHit = findBadUrl(text, badUrls);
  if (badHit) {
    // 命中黑名單 → 一律紅色高度警示
    return flex.buildUrlAlert(badHit.url, badHit.entry);
  }

  // ── 關卡二：關鍵字規則（假投資 / 假檢警 / 假親友）──
  const kwHit = matchKeywords(text, keywordRules);
  if (kwHit) {
    return flex.buildKeywordAlert(kwHit);
  }

  // ── 關卡三：都沒命中 → 邀請做完整風險自測 ──
  return flex.buildUncertain();
}
