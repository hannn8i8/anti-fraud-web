/**
 * local-test.js — 本地單元測試（不需連到 LINE）
 * ------------------------------------------------------------
 * 執行：在 functions 資料夾底下跑  npm test
 * 用途：確認三道關卡（網址黑名單 / 關鍵字 / 都沒命中）邏輯正確。
 */

const assert = require("assert");
const { findBadUrl } = require("../lib/urlChecker");
const { matchKeywords } = require("../lib/keywordChecker");
const flex = require("../lib/flexMessages");

const badUrls = require("../data/bad_urls.json");
const keywords = require("../data/keywords.json");

let pass = 0;
function check(name, fn) {
  try {
    fn();
    pass++;
    console.log("  ✅", name);
  } catch (e) {
    console.error("  ❌", name, "\n     ", e.message);
    process.exitCode = 1;
  }
}

console.log("【測試 1】網址黑名單");
check("命中黑名單網址", () => {
  const r = findBadUrl("看這個 https://invest-vip-coin.io/login 穩賺", badUrls);
  assert.ok(r, "應該要命中");
  assert.strictEqual(r.entry.category, "假投資");
});
check("一般網址不命中", () => {
  const r = findBadUrl("我在看 https://www.google.com", badUrls);
  assert.strictEqual(r, null);
});

console.log("【測試 2】關鍵字規則");
check("命中假投資", () => {
  const r = matchKeywords("老師帶單保證獲利，快加入投資群組", keywords);
  assert.strictEqual(r.id, "fake_invest");
  assert.strictEqual(r.severity, "high");
});
check("命中假檢警", () => {
  const r = matchKeywords("我是地檢署檢察官，你的帳戶涉案需要監管帳戶", keywords);
  assert.strictEqual(r.id, "fake_police");
});
check("命中假親友", () => {
  const r = matchKeywords("媽我是你兒子，我手機壞了換新號碼，急需用錢", keywords);
  assert.strictEqual(r.id, "fake_relative");
  assert.strictEqual(r.severity, "medium");
});
check("無關訊息不命中", () => {
  const r = matchKeywords("今天天氣很好，我們去公園走走", keywords);
  assert.strictEqual(r, null);
});

console.log("【測試 3】每類關鍵字至少 15 個");
check("三類都 >= 15 詞", () => {
  for (const rule of keywords.rules) {
    assert.ok(rule.keywords.length >= 15,
      `${rule.label} 只有 ${rule.keywords.length} 詞`);
  }
});

console.log("【測試 4】Flex 訊息可正常產生");
check("紅色網址警示", () => {
  const m = flex.buildUrlAlert("https://invest-vip-coin.io", { category: "假投資", note: "假平台" });
  assert.strictEqual(m.type, "flex");
  assert.strictEqual(m.contents.type, "bubble");
});
check("關鍵字警示(紅/黃)", () => {
  const hit = matchKeywords("保證獲利老師帶單", keywords);
  const m = flex.buildKeywordAlert(hit);
  assert.strictEqual(m.type, "flex");
});
check("綠色邀請評估", () => {
  const m = flex.buildUncertain();
  assert.strictEqual(m.type, "flex");
});

console.log(`\n完成：${pass} 項測試通過。`);
