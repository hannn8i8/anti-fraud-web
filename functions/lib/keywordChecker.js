/**
 * keywordChecker.js — 關鍵字規則比對模組
 * ------------------------------------------------------------
 * 負責：把使用者文字拿去比對 keywords.json 的三類詐騙關鍵字。
 */

/**
 * 取得規則陣列。相容 { rules: [...] } 或直接 [...]。
 * @param {object|Array} rulesData 關鍵字規則資料
 * @return {Array} 規則陣列
 */
function getRules(rulesData) {
  if (Array.isArray(rulesData)) return rulesData;
  if (rulesData && Array.isArray(rulesData.rules)) return rulesData.rules;
  return [];
}

/**
 * 比對關鍵字規則。
 * 作法：逐類檢查，記錄每一類命中了幾個關鍵字，回傳「命中最多」的那一類。
 * 命中數相同時，以排在前面的類別優先（通常把較危險的放前面）。
 *
 * @param {string} text 使用者訊息
 * @param {object|Array} rulesData 關鍵字規則資料
 * @return {?object} 命中就回 { id, label, severity, title, advice, matched: string[] }；否則 null
 */
function matchKeywords(text, rulesData) {
  if (!text) return null;
  const rules = getRules(rulesData);

  let best = null;

  for (const rule of rules) {
    if (!rule || !Array.isArray(rule.keywords)) continue;

    // 找出這一類所有有命中的關鍵字
    const matched = rule.keywords.filter((kw) => kw && text.includes(kw));

    if (matched.length > 0) {
      // 命中數比目前最佳的多，就更新（嚴格大於 → 同分時保留較前面的類別）
      if (!best || matched.length > best.matched.length) {
        best = {
          id: rule.id,
          label: rule.label,
          severity: rule.severity,
          title: rule.title,
          advice: rule.advice,
          matched,
        };
      }
    }
  }

  return best;
}

module.exports = { matchKeywords };
