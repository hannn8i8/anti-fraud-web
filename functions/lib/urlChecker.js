/**
 * urlChecker.js — 網址檢查模組
 * ------------------------------------------------------------
 * 負責：(1) 從文字裡抓出網址 (2) 拿網址比對黑名單
 */

// 抓網址的正規表示式：找出 http(s)://... 或 www.... 開頭的字串
const URL_REGEX = /((https?:\/\/|www\.)[^\s，。、）)】」』]+)/gi;

/**
 * 從一段文字裡抓出所有網址。
 * @param {string} text 使用者訊息
 * @return {string[]} 找到的網址陣列（沒有就回空陣列）
 */
function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  return matches ? matches : [];
}

/**
 * 取得黑名單陣列。相容兩種格式：
 *   - { list: [...] }（建議格式）
 *   - [...]（直接一個陣列）
 * @param {object|Array} badUrls 黑名單資料
 * @return {Array} 黑名單項目陣列
 */
function getList(badUrls) {
  if (Array.isArray(badUrls)) return badUrls;
  if (badUrls && Array.isArray(badUrls.list)) return badUrls.list;
  return [];
}

/**
 * 在文字中尋找命中黑名單的網址。
 * 比對方式：只要網址「包含」黑名單的 pattern 就算命中（不分大小寫）。
 * @param {string} text 使用者訊息
 * @param {object|Array} badUrls 黑名單資料
 * @return {?{url: string, entry: object}} 命中就回 {命中的網址, 黑名單那一筆}；否則回 null
 */
function findBadUrl(text, badUrls) {
  const urls = extractUrls(text);
  if (urls.length === 0) return null;

  const list = getList(badUrls);

  for (const url of urls) {
    const lowerUrl = url.toLowerCase();
    for (const entry of list) {
      if (!entry || !entry.pattern) continue;
      if (lowerUrl.includes(entry.pattern.toLowerCase())) {
        return { url, entry };
      }
    }
  }
  return null;
}

module.exports = { extractUrls, findBadUrl };
