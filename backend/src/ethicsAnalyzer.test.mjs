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
    "Page 23",
    "Police Recover Exhibits",
    "The police said operatives recovered a locally fabricated single-barrel pistol concealed in a bush.",
  ].join("\n"),
  "accuracy-and-fairness",
  "A locally fabricated pistol means a locally made weapon, not fabricated information.",
);

await assertNoBreaches(
  [
    "Page 2",
    "Committee Questions Documents",
    "The committee said the document lacked citation numbers, Gazette references and other security features, describing it as a mutilated and fabricated document.",
    "According to the committee, fake documents were allegedly deployed to process approvals.",
  ].join("\n"),
  "accuracy-and-fairness",
  "An attributed official allegation about fabricated documents should not be treated as the paper publishing fabricated information.",
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
    "Institutional Accountability",
    "Silence can allow speculation to harden into accepted fact.",
    "Where investigations have been conducted, communicating the relevant facts serves the public interest.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Commentary urging clarity so speculation does not become accepted fact should not be treated as speculative reporting.",
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
    "Page 11",
    "Consumer Protection",
    "Bello warned that inadequate or misleading labels could expose consumers to health risks and make it difficult to trace product sources.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Product-label warnings should not be treated as the newspaper publishing misleading information.",
);

await assertNoBreaches(
  [
    "Page 20",
    "Regional Public Health Workshop",
    "The initiative supports coordinated risk messaging and community-led rumour management.",
    "Participants will strengthen social listening and rumour management systems.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Public-health rumour management systems should not be treated as rumour reporting.",
);

await assertNoBreaches(
  [
    "Page 22",
    "Dispute Over Road",
    "A spokesperson told the Toronto Star",
    "that the narrative being built",
    "around the road dispute",
    "was completely inaccurate.",
  ].join("\n"),
  "accuracy-and-fairness",
  "An attributed rebuttal that a narrative is inaccurate should not be treated as the newspaper publishing inaccurate information.",
);

await assertNoBreaches(
  [
    "Page 29",
    "Transfer Update",
    "After weeks of speculation, the striker joined Ajax on loan for the new season.",
    "The goalkeeper impressed in pre-season, prompting speculation that he could reclaim the number one jersey.",
  ].join("\n"),
  "accuracy-and-fairness",
  "Routine sports-transfer and team-selection speculation should not be treated as speculative reporting.",
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
    "Memorial Foundation Awards Scholarships",
    "The managing director said the foundation was established in memory of her late husband, Chijioke Ugwueze.",
    "The foundation awarded scholarships to indigent undergraduates and distributed relief materials.",
  ].join("\n"),
  "privacy",
  "A memorial foundation's public origin story should not be treated as private-life intrusion.",
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
    "Page 5",
    "Osun Election",
    "INEC announced an extension of Permanent Voter Card (PVC) collection ahead of the governorship election.",
  ].join("\n"),
  "privacy",
  "Generic PVC collection reporting should not be treated as publishing a voter-card number.",
);

await assertNoBreaches(
  [
    "Page 12",
    "Education Policy",
    "Every Nigerian parent wants the best possible education for their children.",
    "The discussion focused on public universities, foreign education and policy choices.",
  ].join("\n"),
  "privacy",
  "Generic family references in education-policy commentary should not be treated as private-life intrusion.",
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

{
  const analysis = await analyzeEthics(
    [
      "Page 14",
      "Community Safety Watch",
      "",
      "Inside The Evening Patrol",
      "During the evening patrol, residents said the gang leader",
      "was praised as a fearless legend and role model after the successful kidnapping operation.",
      "Police later said two suspects were arrested.",
    ].join("\n"),
    { publicationName: "Daily Independent" },
  );
  const breach = getBreaches(analysis, "violence")[0];

  assert.equal(
    breach.excerpt,
    "During the evening patrol, residents said the gang leader was praised as a fearless legend and role model after the successful kidnapping operation.",
    "Breach text should show the full first sentence of the paragraph, starting from the paragraph beginning.",
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

await assertNoBreaches(
  [
    "Page 2",
    "Committee Questions Documents",
    "The committee described the submitted file as a mutilated and fabricated document.",
  ].join("\n"),
  "decency",
  "Mutilated document language should not be treated as lurid body or violence detail.",
);

await assertNoBreaches(
  [
    "Page 26",
    "Security Progress Report",
    "Police said the murder rate is down by half and bodies are no longer found beheaded or dismembered.",
  ].join("\n"),
  "decency",
  "High-level security-progress wording should not be treated as lurid detail when it says the practice is no longer occurring.",
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
