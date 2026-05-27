/**
 * flexMessages.js — Flex 訊息模板（綠 / 黃 / 紅 三種風險等級）
 * ------------------------------------------------------------
 * 視覺呼應網站的 Neobrutalism 風格：
 *   - 大色塊、粗黑框、直角（cornerRadius 0）、超粗字
 *   - 配色：紫 #2c145f、黃 #f4e27a、紅 #d11a4a、綠 #b5f39a
 *
 * 對外提供三個建立函式：
 *   buildUrlAlert()     紅色：網址命中黑名單
 *   buildKeywordAlert() 紅或黃：關鍵字命中
 *   buildUncertain()    綠色：沒命中，邀請做完整自測
 */

// 風險自測網站（LIFF）。請到 LINE Developers 建立 LIFF 後，
// 把 LIFF ID 設到環境變數 LIFF_ID，或直接改下面這行的預設值。
const LIFF_ID = process.env.LIFF_ID || "YOUR_LIFF_ID";
const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;

// 防詐遊戲（一般網頁連結，部署在 Firebase Hosting）
const GAME_URL = "https://anti-fraud-web.web.app/my-game.html";

// ── 配色表（呼應網站）──
const COLOR = {
  purple: "#2c145f",
  purpleDark: "#35106c",
  yellow: "#f4e27a",
  red: "#d11a4a",
  green: "#b5f39a",
  black: "#000000",
  white: "#ffffff",
};

// 三種主題：決定標題色塊與文字顏色
const THEME = {
  red: { bar: COLOR.red, barText: COLOR.white, badge: "🚨 危險" },
  yellow: { bar: COLOR.yellow, barText: COLOR.purple, badge: "⚠️ 小心" },
  green: { bar: COLOR.green, barText: COLOR.purple, badge: "✅ 提醒" },
};

/**
 * 共用：做一顆 Neobrutalism 風格的對話泡泡。
 * @param {object} opts
 * @param {"red"|"yellow"|"green"} opts.themeName 主題
 * @param {string} opts.title 標題（大字）
 * @param {Array<{label?:string, value:string}>} opts.rows 內容列
 * @param {string} opts.advice 給長輩的白話建議
 * @param {boolean} [opts.showAssessment=true] 是否顯示「幫你完整評估」按鈕
 * @return {object} Flex bubble
 */
function makeBubble({ themeName, title, rows, advice, showAssessment = true }) {
  const t = THEME[themeName];

  // 內容列（類型、說明、命中的字…）
  const rowComponents = (rows || []).map((r) => ({
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      ...(r.label
        ? [{
          type: "text",
          text: r.label,
          size: "sm",
          color: COLOR.purpleDark,
          weight: "bold",
          flex: 2,
        }]
        : []),
      {
        type: "text",
        text: r.value,
        size: "sm",
        color: COLOR.purple,
        weight: "bold",
        wrap: true,
        flex: 5,
      },
    ],
  }));

  // 底部按鈕：撥165 一定有；完整評估、防詐遊戲視情況
  const footerButtons = [
    {
      type: "button",
      style: "primary",
      height: "md",
      color: COLOR.red,
      action: { type: "uri", label: "📞 撥打 165 反詐騙", uri: "tel:165" },
    },
  ];

  if (showAssessment) {
    footerButtons.push({
      type: "button",
      style: "primary",
      height: "md",
      color: COLOR.purple,
      action: { type: "uri", label: "🛡️ 幫你完整評估風險", uri: LIFF_URL },
    });
  }

  return {
    type: "bubble",
    size: "mega",
    // 標題色塊
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: t.bar,
      paddingAll: "16px",
      borderColor: COLOR.black,
      borderWidth: "3px",
      cornerRadius: "0px",
      contents: [
        {
          type: "text",
          text: t.badge,
          weight: "bold",
          size: "sm",
          color: t.barText,
        },
        {
          type: "text",
          text: title,
          weight: "bold",
          size: "xl",
          color: t.barText,
          wrap: true,
        },
      ],
    },
    // 內容區
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "16px",
      backgroundColor: COLOR.white,
      borderColor: COLOR.black,
      borderWidth: "3px",
      cornerRadius: "0px",
      contents: [
        ...rowComponents,
        {
          type: "box",
          layout: "vertical",
          backgroundColor: COLOR.yellow,
          paddingAll: "12px",
          borderColor: COLOR.black,
          borderWidth: "3px",
          cornerRadius: "0px",
          contents: [
            {
              type: "text",
              text: "💡 該怎麼做",
              weight: "bold",
              size: "sm",
              color: COLOR.purpleDark,
            },
            {
              type: "text",
              text: advice,
              size: "md",
              color: COLOR.purple,
              weight: "bold",
              wrap: true,
            },
          ],
        },
      ],
    },
    // 按鈕區
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "16px",
      backgroundColor: COLOR.white,
      borderColor: COLOR.black,
      borderWidth: "3px",
      cornerRadius: "0px",
      contents: footerButtons,
    },
  };
}

/**
 * 把 bubble 包成可直接回覆的 Flex Message。
 * @param {string} altText 在通知/舊版顯示的純文字
 * @param {object} bubble makeBubble 產出的泡泡
 * @return {object} Flex Message
 */
function wrap(altText, bubble) {
  return { type: "flex", altText, contents: bubble };
}

/**
 * 紅色：網址命中黑名單。
 * @param {string} url 命中的網址
 * @param {object} entry 黑名單那一筆 {category, note, severity}
 * @return {object} Flex Message
 */
function buildUrlAlert(url, entry) {
  const bubble = makeBubble({
    themeName: "red",
    title: "這個網址很可能是詐騙",
    rows: [
      { label: "類型", value: entry.category || "可疑網址" },
      { label: "網址", value: url },
      { label: "原因", value: entry.note || "已被列入詐騙黑名單" },
    ],
    advice: "千萬不要點這個連結，也不要輸入帳號、密碼或匯款。把訊息刪掉，需要時打 165 問。",
  });
  return wrap("⚠️ 偵測到可疑網址，請小心", bubble);
}

/**
 * 紅或黃：關鍵字命中（依 severity 決定顏色）。
 * @param {object} hit matchKeywords 的結果 {label, severity, title, advice, matched}
 * @return {object} Flex Message
 */
function buildKeywordAlert(hit) {
  const themeName = hit.severity === "high" ? "red" : "yellow";
  // 命中的關鍵字最多列出 4 個，避免訊息太長
  const sample = (hit.matched || []).slice(0, 4).join("、");

  const bubble = makeBubble({
    themeName,
    title: hit.title || "這則訊息要小心",
    rows: [
      { label: "類型", value: hit.label },
      { label: "可疑用語", value: sample || "—" },
    ],
    advice: hit.advice || "覺得怪怪的就先停下來，跟家人討論，或打 165 求證。",
  });
  return wrap(`⚠️ 可能是「${hit.label}」詐騙，請小心`, bubble);
}

/**
 * 綠色：都沒命中，邀請做完整風險自測。
 * @return {object} Flex Message
 */
function buildUncertain() {
  const bubble = makeBubble({
    themeName: "green",
    title: "目前沒看到明顯的詐騙特徵",
    rows: [
      { value: "不過詐騙手法天天在變，沒抓到不代表一定安全。" },
    ],
    advice: "還是不確定的話，按下面的按鈕，我幫你做完整評估；只要花一兩分鐘回答幾題。",
  });
  return wrap("幫你完整評估這則訊息的風險", bubble);
}

module.exports = {
  buildUrlAlert,
  buildKeywordAlert,
  buildUncertain,
  // 匯出常數，方便測試或其他模組使用
  _const: { LIFF_URL, GAME_URL, COLOR },
};
