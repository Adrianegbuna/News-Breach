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
    "Page 3",
    "Nigeria South Africa Relations",
    "The country does not need reckless confrontation.",
    "It does not need inflammatory rhetoric.",
    "It certainly does not need retaliation against innocent South Africans.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Prescriptive opinion using certainly should not be treated as an unsupported factual claim.",
);

await assertNoBreaches(
  [
    "Page 5",
    "Tobacco Control Advocates Meet",
    "\"It is necessary to ensure that advocates get updates about how the industry continues to spread misleading narratives,\" Oluwafemi added.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Attributed quoted criticism about misleading narratives should not be treated as the newspaper publishing misinformation.",
);

await assertNoBreaches(
  [
    "Page 17",
    "Troops Recover Arms",
    "The joint operation resulted in the seizure of exhibits including locally fabricated firearms loaded with five cartridges.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Fabricated firearms means locally made weapons, not fabricated information.",
);

await assertNoBreaches(
  [
    "Page 22",
    "State Courts Investors",
    "Dr. Emu warned that the state would not tolerate land speculation or land grabbing.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Land speculation should not be treated as speculative reporting.",
);

await assertNoBreaches(
  [
    "Page 3",
    "Education Reform",
    "Nigeria's education system has undoubtedly expanded in scope, but quality must become the centrepiece of policy.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Ordinary policy analysis using undoubtedly should not be treated as unsupported factual certainty.",
);

await assertNoBreaches(
  [
    "Page 14",
    "Trade Bill Hearing",
    "\"It is clear that the AfCFTA Domestication Bill before us is both timely and necessary,\" the minister said.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Quoted assessment that a bill is timely and necessary should not be treated as an accuracy breach.",
);

await assertNoBreaches(
  [
    "Page 20",
    "NAPTIP Cautions Parents",
    "Kuma urged parents to remain vigilant and avoid releasing children to individuals making unverified promises of employment.",
    "She advised them to verify every opportunity with NAPTIP.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Warnings against unverified promises should not be treated as publishing unverified information.",
);

await assertNoBreaches(
  [
    "Page 22",
    "Labour And Public Expectations",
    "Measuring labour's effectiveness purely by the frequency of strikes may be misleading.",
    "Yet it would be inaccurate to conclude that organised labour has become irrelevant.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Analytical uses of misleading or inaccurate should not be treated as misinformation.",
);

await assertNoBreaches(
  [
    "Page 30",
    "Transfer Update",
    "Federico Chiesa insists he is only thinking about Liverpool amid continued speculation over his future.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Routine sports-transfer speculation wording should not be treated as speculative reporting.",
);

await assertNoBreaches(
  [
    "Page 1",
    "Dangote Plans Charity Donation",
    "Africa's richest man, Aliko Dangote, plans to donate one-third of his wealth to charity as part of his succession plan, his daughter, Halima Dangote, has revealed.",
    "Halima, a trustee of the Aliko Dangote Foundation, disclosed the arrangement in an interview.",
  ].join("\n"),
  "privacy",
  "Public family role details around a foundation and charity succession plan should not be treated as private-life intrusion.",
);

await assertNoBreaches(
  [
    "Page 20",
    "Humanitarian Outreach",
    "Franc Utoo has facilitated free anti-snake venom treatment for Internally Displaced Persons who suffer snakebites.",
    "This humanitarian initiative protects public health and safety.",
  ].join("\n"),
  "privacy",
  "Public-health humanitarian treatment for IDPs should not be treated as private medical disclosure.",
);

await assertNoBreaches(
  [
    "Page 21",
    "Education Ministry Receives Committee",
    "The minister met members of the National Committee for the Advancement of Occupational Therapy, Audiology, Speech and Language Therapy Education.",
    "The committee briefed him on its achievements and implementation plan.",
  ].join("\n"),
  "privacy",
  "Professional therapy education programme names should not be treated as private therapy disclosure.",
);

await assertNoBreaches(
  [
    "Page 22",
    "Age And Egg Quality",
    "These include the fertility diet, quality sleep, avoidance of smoking and stress management.",
    "The public health column is written by a consultant obstetrician at an IVF clinic.",
  ].join("\n"),
  "privacy",
  "General fertility education columns should not be treated as private medical disclosure.",
);

await assertNoBreaches(
  [
    "Page 28",
    "Customs Recruitment Notice",
    "Candidates are required to log on to the portal using their National Identification Number or registered email address.",
  ].join("\n"),
  "privacy",
  "Generic instructions to use one's own NIN or email should not be treated as publishing a private identifier.",
);

await assertNoBreaches(
  [
    "Page 23",
    "Debt Burden",
    "Debt servicing now consumes an alarming share of government revenue, which has continued to cripple economic growth.",
  ].join("\n"),
  "discrimination",
  "Non-personal disability metaphors about economics should not be treated as discrimination.",
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

{
  const analysis = await analyzeEthics(
    [
      "Page 14",
      "Community Safety Watch",
      "",
      "Inside The Evening Patrol",
      "The kidnapper was praised as a fearless legend and role model after the successful kidnapping operation.",
    ].join("\n"),
    { publicationName: "Daily Independent" },
  );
  const breach = getBreaches(analysis, "violence")[0];

  assert.equal(breach.pageNumber, 14, "Breach should keep the page where the passage appears.");
  assert.equal(breach.lineNumber, 5, "Breach should keep the line where the passage appears.");
  assert.equal(
    breach.headline,
    "Community Safety Watch\nInside The Evening Patrol",
    "Breach headline should be the exact header/sub-header block above the breached passage.",
  );
}

await assertHasBreaches(
  [
    "Page 9",
    "Capital Punishment Interview",
    "They are animals.",
    "They should be exterminated rapidly.",
  ].join("\n"),
  "decency",
  "Dehumanising abusive language should still be treated as a decency breach.",
);

{
  const analysis = await analyzeEthics(
    [
      "Page 17",
      "Woman In Police Net",
      "The suspect allegedly attacked her boyfriend with a sharp knife and severed his manhood.",
      "On getting there it was discovered that the suspect has severed the victim's manhood during the attack.",
    ].join("\n"),
    { publicationName: "Daily Asset" },
  );

  assert.equal(
    getBreaches(analysis, "decency").length,
    1,
    "Repeated nearby descriptions of the same graphic injury should count as one decency issue.",
  );
}

{
  const analysis = await analyzeEthics(
    [
      "Page 18",
      "Music Lyrics Review",
      "The first line uses a vulgar shit reference.",
      "Another nearby line repeats the same shit reference.",
      "A separate line uses fuck as a vulgar command.",
      "The next line repeats the same fuck command.",
    ].join("\n"),
    { publicationName: "Saturday Independent" },
  );

  assert.equal(
    getBreaches(analysis, "decency").length,
    2,
    "Repeated nearby vulgar terms should be counted once per distinct offensive term.",
  );
}

console.log("ethicsAnalyzer targeted tests passed");
