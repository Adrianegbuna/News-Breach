import assert from "node:assert/strict";
import { analyzeEthics } from "./ethicsAnalyzer.js";

function getBreaches(analysis, ethicId) {
  return analysis.summary.find((item) => item.ethic.id === ethicId)?.breaches || [];
}

async function assertNoBreaches(text, ethicId, message) {
  const analysis = await analyzeEthics(text, { publicationName: "Daily Independent" });
  assert.equal(getBreaches(analysis, ethicId).length, 0, message);
}

async function assertHasBreaches(text, ethicId, message) {
  const analysis = await analyzeEthics(text, { publicationName: "Daily Independent" });
  assert.ok(getBreaches(analysis, ethicId).length > 0, message);
}

await assertNoBreaches(
  [
    "Page 8",
    "Government Debunks Viral Bride Price Claim",
    "Further unverified claims shared by a social media user alleged that the bride price policy had been introduced.",
    "The commissioner labelled the claims as entirely baseless and fabricated.",
    "He urged the public to stop sharing the misleading video and verify information from official channels.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Debunking or warning against unverified claims should not be treated as publishing them.",
);

await assertNoBreaches(
  [
    "Page 12",
    "Committee Calls For Due Process",
    "The review should be evidence-based and conducted in accordance with due process, ensuring that facts-not speculation-guide any conclusions.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Calls to prefer facts over speculation should not be treated as publishing speculative information.",
);

await assertNoBreaches(
  [
    "Page 20",
    "Market Women And Daily Survival",
    "There is no question about the fact that most workers earn their daily bread from doing unpleasant jobs.",
    "Starting with N50,000 and hoping to make a living is certainly out of the question.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Ordinary opinion idioms using certainty words should not be treated as accuracy breaches.",
);

await assertNoBreaches(
  [
    "Page 31",
    "Preseason Squad Update",
    "\"Obviously we still do not have any players here who were at the World Cup,\" the coach said.",
    "United icons will certainly feel vindicated by their remarks as the player faces another setback.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Quoted sports comments and commentary certainty words should not be treated as accuracy breaches.",
);

await assertNoBreaches(
  [
    "Page 29",
    "Digital Payments Surge Raises Security Questions",
    "A successful attack on a major payment platform can affect thousands or millions of users.",
  ].join("\n"),
  "violence",
  "Cybersecurity risk language should not be treated as violence glorification.",
);

await assertHasBreaches(
  [
    "Page 9",
    "Crime Boss Becomes Folk Hero",
    "The kidnapper was praised as a fearless legend and role model after the successful kidnapping operation.",
  ].join("\n"),
  "violence",
  "Admiring language around kidnapping should still be treated as a violence breach.",
);

console.log("ethicsAnalyzer targeted tests passed");
