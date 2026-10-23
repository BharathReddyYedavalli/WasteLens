import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = name => readFileSync(new URL("../src/" + name, import.meta.url), "utf8");
const scan = source("App.tsx");
const ask = source("AskWasteLens.tsx");
const account = source("AccountArea.tsx");

test("video Scan page removes the two requested privacy blocks", () => {
  assert.doesNotMatch(scan, /photo-privacy-summary|className="privacy-details"/);
  assert.doesNotMatch(scan, /Photos go to Google Gemini when you scan/);
  assert.doesNotMatch(scan, /Avoid faces and personal details in your photos/);
  assert.match(scan, /Identify item/);
  assert.match(scan, /LocalRulesGuide/);
});

test("Ask page hides the privacy accordion without losing Clear chat", () => {
  assert.doesNotMatch(ask, /className="chat-privacy"/);
  assert.doesNotMatch(ask, /Questions and scan details go to Gemini/);
  assert.match(ask, /messages.length > 0 && <div className="chat-footer">/);
  assert.match(ask, /Clear chat/);
});

test("My Account drops requested privacy panel but preserves sign-out and account security", () => {
  assert.doesNotMatch(account, /Your results are saved to your account\. We do not save photos\./);
  assert.match(account, /onClick=\{\(\) => void logout\(\)\}/);
  assert.match(account, /Your password is securely hashed/);
});

test("no provider integrations or backend code were touched by the video-only UI change", () => {
  assert.match(scan, /fetch\("\/api\/ai\/analyze"/);
  assert.match(ask, /\/api\/ai\/chat/);
});
