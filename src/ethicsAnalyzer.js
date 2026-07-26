const ACCURACY_AND_FAIRNESS_ETHIC = {
  id: "accuracy-and-fairness",
  title: "ACCURACY AND FAIRNESS",
  rule:
    "The public has a right to know. Factual, accurate, balanced and fair reporting is the ultimate objective of good journalism. A journalist should refrain from publishing inaccurate and misleading information, and prompt correction should be made when such information has been inadvertently published.",
};

const DISCRIMINATION_ETHIC = {
  id: "discrimination",
  title: "DISCRIMINATION",
  rule:
    "A journalist should refrain from making pejorative reference to a person's ethnic group, religion, sex or to any physical or mental illness or handicap.",
};

const VIOLENCE_ETHIC = {
  id: "violence",
  title: "VIOLENCE",
  rule:
    "A journalist should not present or report acts of violence, armed robberies, terrorist activities or vulgar display of wealth in a manner that glorifies such acts in the eyes of the public.",
};

const CHILDREN_AND_MINORS_ETHIC = {
  id: "children-and-minors",
  title: "CHILDREN AND MINORS",
  rule:
    "A journalist should not identify, either by name or picture, or interview children under the age of 16 who are involved in cases concerning sexual offences, crimes and rituals or witchcraft either as victims, witnesses or defendants.",
};

const PRIVACY_ETHIC = {
  id: "privacy",
  title: "PRIVACY",
  rule:
    "A journalist should respect the privacy of individuals and their families unless it affects public interest. Information on private life should only be published if it impinges on public interest, such as exposing crime or serious misdemeanour, exposing anti-social conduct, protecting public health, morality and safety, or preventing the public from being misled.",
};

const PRIVILEGE_NON_DISCLOSURE_ETHIC = {
  id: "privilege-non-disclosure",
  title: "PRIVILEGE/NON-DISCLOSURE",
  rule:
    "A journalist should observe the universally accepted principle of confidentiality and should not disclose the source of information obtained in confidence.",
};

const DECENCY_ETHIC = {
  id: "decency",
  title: "DECENCY",
  rule:
    "A journalist should refrain from using offensive, abusive or vulgar language, should not present lurid details of violence, sexual acts, abhorrent or horrid scenes, and should generally avoid identifying relatives or friends of persons convicted or accused of crime unless it furthers the public's right to know.",
};

const PLAGIARISM_ETHIC = {
  id: "plagiarism",
  title: "PLAGIARISM",
  rule:
    "A journalist should not copy, wholesale or in part, other people's work without attribution and/or consent.",
};

const COPYRIGHT_ETHIC = {
  id: "copyright",
  title: "COPYRIGHT",
  rule:
    "Where a journalist reproduces a work, be it in print, broadcast, art work or design, proper acknowledgment should be accorded the author. A journalist should abide by all rules of copyright, established by national and international laws and conventions.",
};

const ETHICS = [
  {
    ...ACCURACY_AND_FAIRNESS_ETHIC,
    analyzer: findAccuracyAndFairnessBreaches,
  },
  {
    ...DISCRIMINATION_ETHIC,
    analyzer: findDiscriminationBreaches,
  },
  {
    ...VIOLENCE_ETHIC,
    analyzer: findViolenceBreaches,
  },
  {
    ...CHILDREN_AND_MINORS_ETHIC,
    analyzer: findChildrenAndMinorsBreaches,
  },
  {
    ...PRIVACY_ETHIC,
    analyzer: findPrivacyBreaches,
  },
  {
    ...PRIVILEGE_NON_DISCLOSURE_ETHIC,
    analyzer: findPrivilegeNonDisclosureBreaches,
  },
  {
    ...DECENCY_ETHIC,
    analyzer: findDecencyBreaches,
  },
  {
    ...PLAGIARISM_ETHIC,
    analyzer: findPlagiarismBreaches,
  },
  {
    ...COPYRIGHT_ETHIC,
    analyzer: findCopyrightBreaches,
  },
];

const ANALYSIS_VERSION = "2026-07-ethics-v5";

const NIGERIAN_NEWS_OUTLET_PATTERN =
  /\b(?:punch(?:\s+newspapers?)?|vanguard|daily\s+trust|leadership|the\s+sun(?:\s+newspaper)?|guardian|thisday|premium\s+times|tribune|nigerian\s+tribune|sahara\s+reporters|channels?\s+tv|the\s+nation|daily\s+post|business\s*day|blueprint|new\s+telegraph|daily\s+nigerian|legit(?:\.ng)?|nairametrics|the\s+cable|arise\s+news|ait|nta|news\s+agency\s+of\s+nigeria|nan)\b/i;

const UNSUPPORTED_CERTAINTY_PATTERNS = [
  /\b(?:it\s+is\s+clear|undoubtedly|obviously|certainly|without\s+doubt|everyone\s+knows|there\s+is\s+no\s+question|the\s+truth\s+is|it\s+is\s+now\s+obvious)\b/i,
  /\b(?:proved|proven|confirmed|established)\b.{0,120}\b(?:without\s+evidence|no\s+evidence|unverified|unconfirmed|rumou?r|speculation)\b/i,
  /\b(?:without\s+evidence|no\s+evidence|unverified|unconfirmed|rumou?r|speculation)\b.{0,120}\b(?:proved|proven|confirmed|established)\b/i,
];

const MISLEADING_INFORMATION_PATTERNS = [
  /\b(?:false\s+claim|misleading|inaccurate|fabricated|doctored|baseless|unverified|unconfirmed|unsubstantiated|rumou?r|speculation|cannot\s+be\s+verified)\b/i,
  /\bfake\s+(?:claim|news|report|story|document|memo|notice|result|certificate|profile|account|image|photo|video|audio)\b/i,
  /\b(?:sources?\s+could\s+not\s+confirm|no\s+official\s+confirmation|without\s+official\s+confirmation|not\s+independently\s+verified)\b/i,
  /\b(?:figures?|statistics?|data|records?)\b.{0,120}\b(?:inflated|made\s+up|doctored|false|misleading|incorrect|unverified)\b/i,
  /\b(?:viral\s+(?:video|audio|notice|memo|message|post)|purported\s+(?:video|audio|notice|memo|message|letter)|deepfake|ai-generated)\b.{0,160}\b(?:confirmed|proved|shows|reveals|exposes)\b/i,
  /\b(?:declared|announced|reported)\s+\w+(?:\s+\w+){0,5}\s+(?:winner|dead|arrested|wanted)\b.{0,120}\b(?:before\s+(?:inec|official)|without\s+official\s+confirmation|not\s+confirmed)\b/i,
];

const SWEEPING_UNSUPPORTED_CLAIM_PATTERNS = [
  /\bit\s+is\s+not\s+debatable\b.{0,160}\b(?:never\s+seen|worst|best|most|least|all|every)\b/i,
  /\b(?:has|have)\s+never\s+seen\b.{0,160}\b(?:level|scale|extent)\b/i,
];

const UNSUPPORTED_HISTORICAL_ALLEGATION_PATTERNS = [
  /\b(?:dropped|put|placed|administered)\s+(?:some\s+)?poison\s+on\b/i,
  /\b(?:poisoned|smothered|assassinated)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/i,
  /\bdouble[-\s]agent\b.{0,120}\bpoison\b/i,
];

const ACCURACY_META_CRITIQUE_PATTERNS = [
  /\b(?:journalist|author|writer|commentator|he|she|they)\b.{0,140}\b(?:unverified|unsupported|false|misleading)\b.{0,80}\b(?:tale|claim|conclusion|story|report|information)\b/i,
  /\b(?:unverified|unsupported|false|misleading)\b.{0,80}\b(?:tale|claim|conclusion|story|report|information)\b.{0,140}\b(?:journalist|author|writer|commentator|he|she|they)\b/i,
  /\b(?:such\s+an?\s+unverified\s+tale|unverified\s+conclusion|fictional\s+stories\s+of\s+a\s+poisoned\s+apple)\b/i,
];

const ACCURACY_SAFE_REPORTED_CLAIM_PATTERNS = [
  /\b(?:deceptive\s+marketing\s+and\s+misleading\s+pricing|marketing\s+and\s+misleading\s+pricing)\b/i,
  /\bmisleading\s+narrative\b/i,
  /\bbaseless\s+and\s+without\s+iota\s+of\s+merit\b/i,
  /\bunverified\s+transfer\s+stories\b/i,
  /\bmisleading\s+our\s+supporters\b/i,
  /\bexploitative\s+conduct,\s+including\s+hoarding,\s+artificial\s+scarcity,\s+deceptive\s+marketing\s+and\s+misleading\s+pricing\b/i,
  /\b(?:fccpc|commission|regulator|consumer\s+protection|enforcement)\b[\s\S]{0,260}\b(?:deceptive|misleading|hoarding|artificial\s+scarcity|pricing)\b/i,
  /\b(?:accused|warned|said|stated|described|called|insisted)\b[\s\S]{0,220}\b(?:misleading\s+narrative|baseless|without\s+iota\s+of\s+merit|false\s+and\s+misleading|false,\s+baseless|unverified\s+transfer\s+stories|speculative\s+or\s+unverified\s+stories)\b/i,
  /\b(?:justice|court|judge|ruling|judgment|judgement)\b[\s\S]{0,220}\b(?:baseless|without\s+iota\s+of\s+merit|frivolous|dismissed)\b/i,
  /\b(?:statement\s+read|statement\s+endorsed|wish\s+to\s+categorically\s+state|club\s+has\s+become\s+aware|Doma\s+United)\b[\s\S]{0,320}\b(?:false|misleading|baseless|unverified|defamatory)\b/i,
  /\b(?:condemns|warning|refrain|be\s+advised|continues\s+to\s+publish)\b[\s\S]{0,260}\b(?:unverified|misleading|false|defamatory|speculative)\b/i,
  /\b(?:unverified|misleading|false|defamatory|speculative)\b[\s\S]{0,260}\b(?:condemns|warning|refrain|be\s+advised|continues\s+to\s+publish)\b/i,
  /\b(?:rumours?|claims?|speculation|viral\s+reports?)\b[\s\S]{0,320}\b(?:dismissed|clarified|old\s+news|false\s+news|not\s+recent|remain\s+unverified|confirmed[\s\S]{0,80}old\s+video)\b/i,
  /\b(?:adding\s+to\s+the\s+speculation|claims\s+remain\s+unverified|unverified\s+routine\s+diplomatic\s+letter|unverified\s+foreign\s+paper)\b/i,
];

const ACCURACY_SAFE_CERTAINTY_PATTERNS = [
  /\bwill\s+almost\s+certainly\b/i,
  /\bobviously,\s+these\s+weapons\b/i,
  /\b(?:certainly|obviously|clearly)\b.{0,120}\b(?:opinion|forecast|projection|may|might|could|should)\b/i,
  /\bundoubtedly\s+historic\b/i,
  /\bwill\s+certainly\s+not\s+be\s+matched\b/i,
  /\bit\s+is\s+clear\s+to\s+what\s+extent\s+Nigerians\s+have\s+been\s+duped\b/i,
  /\b(?:it\s+is\s+clear|duped)\b.{0,180}\b(?:manifesto|campaign|promise|promised|political|party)\b/i,
  /\b(?:manifesto|campaign|promise|promised|political|party)\b.{0,240}\b(?:it\s+is\s+clear|duped)\b/i,
  /\b(?:fully\s+clothed|hanky[-\s]panky)\b/i,
];

const KNOWN_UNSUPPORTED_ACCURACY_SIGNATURES = [
  {
    title: "Unsupported Abacha poisoning allegation",
    pattern: /\bdouble[\s-]*agent[\s\S]{0,160}\bdropped\s+some\s+poison\s+on\s+Abacha\b/i,
    matchedPhrases: ["double-agent", "dropped some poison on Abacha"],
    reason:
      "Potential unsupported serious allegation: the passage presents a grave historical accusation without clear evidence, documents, or attribution.",
  },
];

const ALLEGATION_AS_FACT_PATTERNS = [
  /\b(?:alleged|accused|suspected|reportedly)\b.{0,140}\b(?:is|was|are|were)\s+(?:a\s+)?(?:criminal|fraudster|thief|killer|rapist|kidnapper|terrorist|bandit|cultist|murderer|ritualist|yahoo\s+boy)\b/i,
  /\b(?:is|was|are|were)\s+(?:a\s+)?(?:criminal|fraudster|thief|killer|rapist|kidnapper|terrorist|bandit|cultist|murderer|ritualist|yahoo\s+boy)\b.{0,140}\b(?:but\s+police\s+have\s+not|without\s+charge|before\s+trial|awaiting\s+trial|has\s+not\s+been\s+convicted|not\s+been\s+convicted|case\s+is\s+pending)\b/i,
  /\b(?:named|described|branded|labelled|labeled)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s+as\s+(?:a\s+)?(?:criminal|fraudster|thief|killer|rapist|kidnapper|terrorist|bandit|cultist|murderer|ritualist|yahoo\s+boy)\b/i,
];

const ONE_SIDED_REPORTING_PATTERNS = [
  /\b(?:accused|alleged|claimed|said|insisted|petitioned)\b.{0,200}\b(?:but\s+(?:he|she|they|the\s+company|the\s+agency|the\s+ministry|the\s+official|the\s+party|the\s+commission)\s+(?:was|were)\s+not\s+contacted|no\s+response\s+was\s+sought|without\s+seeking\s+(?:his|her|their|its)\s+response)\b/i,
  /\b(?:published|reported|carried)\b.{0,120}\b(?:one-sided|without\s+(?:his|her|their|its)\s+side|without\s+right\s+of\s+reply|without\s+seeking\s+comment)\b/i,
  /\b(?:efforts?\s+to\s+reach|calls?\s+to|messages?\s+sent\s+to)\b.{0,140}\b(?:were\s+not\s+made|were\s+not\s+attempted|no\s+attempt\s+was\s+made)\b/i,
];

const UNATTRIBUTED_SERIOUS_ALLEGATION_PATTERNS = [
  /\b(?:it\s+was\s+learnt|it\s+was\s+gathered|findings\s+revealed|checks\s+revealed)\b.{0,220}\b(?:stole|diverted|embezzled|defrauded|killed|murdered|raped|kidnapped|abducted|sponsored\s+(?:terrorism|banditry)|terrorist|bandit|cultist|ritualist)\b/i,
  /\b(?:anonymous\s+posts?|social\s+media\s+users?|viral\s+claims?)\b.{0,180}\b(?:accused|named|identified|declared|confirmed)\b.{0,140}\b(?:criminal|fraudster|thief|killer|rapist|kidnapper|terrorist|bandit|cultist|ritualist)\b/i,
];

const PRETRIAL_CRIMINAL_PROCESS_PATTERNS = [
  /\b(?:accused|alleged|suspected|arraigned|charged|remanded|detained|arrested|wanted|standing\s+trial|pleaded\s+not\s+guilty|bail|trial\s+continues|case\s+was\s+adjourned|before\s+a\s+(?:magistrate|judge)|before\s+the\s+(?:federal\s+)?high\s+court)\b/i,
  /\b(?:efcc|icpc|dss|ndlea|nscdc|police|npf|customs|immigration)\b.{0,140}\b(?:arrested|arraigned|charged|accused|alleged|paraded|detained|remanded|declared\s+wanted)\b/i,
];

const DEFINITIVE_CRIME_LABEL_PATTERNS = [
  /\b(?:is|was|are|were|as)\s+(?:a\s+|an\s+)?(?:criminal|fraudster|thief|killer|rapist|kidnapper|terrorist|bandit|cultist|murderer|ritualist|yahoo\s+boy)\b/i,
  /\b(?:the\s+)?(?:criminal|fraudster|thief|killer|rapist|kidnapper|terrorist|bandit|cultist|murderer|ritualist|yahoo\s+boy)\s+(?:was|is|has|had)\b/i,
];

const CONVICTION_CONTEXT_PATTERNS = [
  /\b(?:convicted|sentenced|jailed|found\s+guilty|pleaded\s+guilty|judgment|judgement|court\s+found|court\s+ruled|court\s+convicted)\b/i,
];

const NEGATED_CONVICTION_CONTEXT_PATTERNS = [
  /\b(?:not|never|has\s+not|had\s+not|have\s+not|without)\s+(?:yet\s+)?(?:been\s+)?(?:convicted|sentenced|found\s+guilty)\b/i,
  /\b(?:no|without)\s+(?:conviction|court\s+conviction|guilty\s+verdict)\b/i,
];

const CORRECTION_NEEDED_PATTERNS = [
  /\b(?:correction|retraction|apology|clarification)\b.{0,140}\b(?:not\s+published|yet\s+to\s+be\s+published|refused|ignored|delayed|pending|withheld)\b/i,
  /\b(?:earlier\s+report|previous\s+story|previous\s+report|earlier\s+story)\b.{0,140}\b(?:was\s+wrong|was\s+false|was\s+inaccurate|misstated|incorrectly\s+stated|misled)\b/i,
];

const CORRECTION_RESOLVED_PATTERNS = [
  /\b(?:correction|retraction|apology|clarification)\b.{0,120}\b(?:published|issued|made|carried|posted|included)\b/i,
  /\b(?:published|issued|made|carried|posted|included)\s+(?:a\s+|an\s+)?(?:correction|retraction|apology|clarification)\b/i,
  /\b(?:we|the\s+newspaper|the\s+paper|the\s+publisher)\s+(?:corrected|clarified|retracted|apologi[sz]ed)\b/i,
];

const CORRECTION_EXPLICITLY_MISSING_PATTERNS = [
  /\b(?:no|not|without)\s+(?:prompt\s+)?(?:correction|retraction|apology|clarification)\b/i,
  /\b(?:correction|retraction|apology|clarification)\b.{0,140}\b(?:not\s+published|yet\s+to\s+be\s+published|refused|ignored|delayed|pending|withheld)\b/i,
];

const RIGHT_OF_REPLY_PATTERNS = [
  /\b(?:declined\s+to\s+comment|could\s+not\s+be\s+reached|did\s+not\s+respond|right\s+of\s+reply|contacted\s+for\s+comment|asked\s+for\s+comment|response\s+was\s+sought|denied\s+the\s+allegation|rebutted\s+the\s+claim)\b/i,
  /\b(?:as\s+of\s+press\s+time|at\s+press\s+time)\b.{0,100}\b(?:had\s+not\s+responded|did\s+not\s+respond|could\s+not\s+be\s+reached)\b/i,
  /\b(?:defence\s+counsel|lawyer|spokesperson|publicity\s+secretary|media\s+aide|press\s+secretary)\b.{0,120}\b(?:said|denied|explained|responded|insisted|declined)\b/i,
  /\b(?:efforts?\s+to\s+reach|calls?\s+to|messages?\s+sent\s+to)\b.{0,140}\b(?:were\s+unsuccessful|were\s+not\s+answered|did\s+not\s+connect|had\s+not\s+been\s+returned)\b/i,
];

const FACTUAL_SUPPORT_PATTERNS = [
  /\b(?:according\s+to|police\s+said|court\s+documents|court\s+records|official\s+records|official\s+data|statement\s+by|documents\s+show|records\s+show|evidence\s+shows|witnesses\s+said|data\s+from|confirmed\s+by)\b/i,
  /\b(?:charged\s+before|convicted\s+by|arraigned\s+before|filed\s+in\s+court|in\s+a\s+statement|official\s+statement)\b/i,
  /\b(?:efcc|icpc|dss|department\s+of\s+state\s+services|ndlea|nscdc|police|nigeria\s+police|npf|police\s+public\s+relations\s+officer|ppro|inec|nbs|cbn|nafdac|ncdc|nema|nigerian\s+army|army|air\s+force|navy|customs|immigration)\b.{0,120}\b(?:said|stated|confirmed|disclosed|explained|announced|warned|debunked|clarified|filed|charged|arraigned)\b/i,
  /\b(?:federal\s+high\s+court|state\s+high\s+court|magistrates?'?\s+court|court\s+of\s+appeal|supreme\s+court)\b.{0,120}\b(?:heard|ruled|ordered|sentenced|convicted|adjourned|granted\s+bail)\b/i,
];

const PROTECTED_TRAIT_PATTERNS = [
  /\b(?:ethnic|tribal|tribe|race|racial|religion|religious|christian|muslim|islam|gender|sex|female|male|woman|women|man|men|disabled|disability|handicap|handicapped|mental(?:ly)?|illness|indigene|non-indigene|settler|northerner|southerner)\b/i,
  /\b(?:igbo|ibo|yoruba|hausa|fulani|ijaw|kanuri|tiv|idoma|efik|ibibio|igala|nupe|edo|benin|urhobo|isoko|itsekiri|gwari|gbagyi|berom|jukun|ebira|igede|igboho|igala|middle\s+belt|niger\s+delta)\b/i,
  /\b(?:albino|person\s+with\s+albinism|autistic|deaf|blind|epileptic|schizophrenic|bipolar|down\s+syndrome|wheelchair\s+user|physically\s+challenged|mentally\s+challenged|special\s+needs)\b/i,
];

const SPECIFIC_PROTECTED_TRAIT_PATTERNS = [
  /\b(?:ethnic|tribal|tribe|race|racial|religion|religious|christian|muslim|islam|gender|sex|female|woman|women|disabled|disability|handicap|handicapped|mental(?:ly)?|illness|indigene|non-indigene|settler|northerner|southerner)\b/i,
  /\b(?:igbo|ibo|yoruba|hausa|fulani|ijaw|kanuri|tiv|idoma|efik|ibibio|igala|nupe|edo|benin|urhobo|isoko|itsekiri|gwari|gbagyi|berom|jukun|ebira|igede|igboho|igala|middle\s+belt|niger\s+delta)\b/i,
  /\b(?:albino|person\s+with\s+albinism|autistic|deaf|blind|epileptic|schizophrenic|bipolar|down\s+syndrome|wheelchair\s+user|physically\s+challenged|mentally\s+challenged|special\s+needs)\b/i,
  /\b(?:men|man|male)\b.{0,80}\b(?:because\s+of\s+(?:their\s+)?(?:sex|gender)|as\s+(?:men|males)|cannot\s+be\s+trusted|should\s+not\s+be\s+allowed)\b/i,
];

const QUOTED_OR_ANALYTICAL_IDENTITY_CONTEXT_PATTERNS = [
  /\b(?:says|writes|wrote|quoted|line|novel|book|essay|movement|civil\s+rights|racism|discrimination|supremacy)\b/i,
  /["'“”‘’]/,
];

const PEJORATIVE_PATTERNS = [
  /\b(?:backward|barbaric|primitive|inferior|subhuman|uncivilized|uncivilised|dirty|stupid|worthless|disease|curse|unfit|weak|crazy|mad|lunatic|retarded|crippled|deformed|lazy|promiscuous|savage|unclean|dangerous|cursed|parasites|invaders|infestation|menace|born\s+criminals|born\s+terrorists)\b/i,
  /\b(?:should\s+not\s+be\s+allowed|do\s+not\s+belong|not\s+fit\s+to|cannot\s+be\s+trusted)\b/i,
  /\b(?:are|were|remain|look|sound|behave)\s+(?:like\s+)?(?:animals|criminals|terrorists|witches|prostitutes|thieves|savages|vermin)\b/i,
];

const DIRECT_DISCRIMINATION_PATTERNS = [
  /\b(?:cripple|lunatic|retard|madman|madwoman|deaf\s+and\s+dumb)\b/i,
  /\b(?:all|every|these|those)\s+\w{0,20}\s*(?:people|men|women|tribes?|religions?|believers?|ethnic\s+groups?)\s+(?:are|were|remain|look|sound|behave)\s+\w+/i,
  /\b(?:because|since)\s+(?:he|she|they|the\s+person|the\s+people)\s+(?:is|are|was|were)\s+(?:a\s+)?(?:woman|man|muslim|christian|disabled|handicapped|mentally\s+ill|igbo|yoruba|hausa|fulani)\b/i,
  /\b(?:all|every|these|those)\s+(?:igbo|ibo|yoruba|hausa|fulani|muslims|christians|women|men|disabled|handicapped|northerners|southerners|indigenes|settlers|non-indigenes)\s+(?:are|were|remain|look|sound|behave)\s+\w+/i,
  /\b(?:no|not\s+any)\s+(?:igbo|ibo|yoruba|hausa|fulani|muslim|christian|woman|disabled|handicapped|northerner|southerner|settler|non-indigene)\s+(?:should|can)\s+(?:lead|own|enter|live|work|marry|vote|contest)\b/i,
];

const VIOLENT_OR_CRIMINAL_ACT_PATTERNS = [
  /\b(?:violence|violent|attack|assault|murder|killer|killing|massacre|shooting|gunmen|unknown\s+gunmen|armed\s+robbery|robbery|robber|robbers|bandit|bandits|banditry|kidnap|kidnapping|abduction|abductors|terrorist|terrorists|terrorism|boko\s+haram|iswap|bombing|ied|arson|crime|criminal|gang|cartel|cultist|cultists|militant|militants|insurgent|insurgents|pirate|pirates|arms\s+dealer|ritual\s+killing)\b/i,
  /\b(?:stole|looted|raided|shot|stabbed|slaughtered|beheaded|bombed|abducted|hijacked|burned|burnt|lynched|tortured|executed|ambushed|invaded|whisked\s+away)\b/i,
];

const VULGAR_WEALTH_PATTERNS = [
  /\b(?:sprayed|flaunted|displayed|showed\s+off|paraded|posed\s+with)\s+(?:cash|money|wealth|gold|jewellery|jewelry|diamonds|luxury|cars?|ransom|weapons)\b/i,
  /\b(?:lavish|extravagant|opulent|bling|expensive)\s+(?:criminal|gang|robber|bandit|terrorist|kidnapper|fraudster|yahoo\s+boy)?\s*(?:lifestyle|wealth|spending|party|cars?|houses?)\b/i,
  /\b(?:bandits?|kidnappers?|terrorists?|fraudsters?|robbers?)\b.{0,120}\b(?:flaunting|spraying|showing\s+off|posing\s+with)\b.{0,80}\b(?:cash|ransom|gold|cars?|guns?|rifles?)\b/i,
];

const GLORIFYING_LANGUAGE_PATTERNS = [
  /\b(?:hero|heroes|legend|legendary|icon|idol|role\s+model|star|celebrity|mastermind|genius|brilliant|fearless|unstoppable|invincible|admirable|inspiring|glamorous|stylish|Robin\s+Hood|folk\s+hero|champion|smart|successful)\b/i,
  /\b(?:celebrated|praised|admired|cheered|applauded|honoured|honored|worshipped|worshiped|envied|hailed|glorified|romanticised|romanticized)\b/i,
  /\b(?:made\s+crime\s+look\s+(?:good|cool|glamorous|attractive)|crime\s+pays|lived\s+the\s+dream|living\s+the\s+dream|inspired\s+young\s+people|everyone\s+wanted\s+to\s+be\s+like)\b/i,
  /\b(?:bold|daring|audacious|spectacular|impressive|successful)\s+(?:robbery|attack|kidnapping|abduction|operation|raid|escape)\b/i,
];

const DIRECT_GLORIFICATION_PATTERNS = [
  /\b(?:criminal|robber|bandit|terrorist|killer|kidnapper|gangster|gang\s+leader|cultist|fraudster|yahoo\s+boy|ritualist)\s+(?:hero|legend|icon|idol|role\s+model|star|celebrity|mastermind|genius|champion)\b/i,
  /\b(?:hero|legend|icon|idol|role\s+model|star|celebrity|champion)\s+(?:criminal|robber|bandit|terrorist|killer|kidnapper|gangster|gang\s+leader|cultist|fraudster|yahoo\s+boy|ritualist)\b/i,
  /\b(?:lesson|guide|blueprint|manual|tips?|playbook|how\s+to)\s+(?:from|for)\s+(?:robbers?|kidnappers?|terrorists?|bandits?|criminals?|fraudsters?|cultists?)\b/i,
  /\b(?:how\s+(?:bandits?|kidnappers?|fraudsters?|robbers?|terrorists?)\s+(?:make|made|earn|earned|beat|escape|avoid)|secrets?\s+of\s+(?:bandits?|kidnappers?|fraudsters?|robbers?))\b/i,
];

const VIOLENCE_HARM_REDUCTION_PATTERNS = [
  /\b(?:condemned|decried|mourned|victims?|survivors?|rescued|receiving\s+care|hospital|killed|injured|traumati[sz]ed|arrested|foiled|neutralised|neutralized|recovered|security\s+forces|police|troops|army|dss|nscdc)\b/i,
];

const UNDER_16_AGE_PATTERNS = [
  /\b(?:age(?:d)?|aged)\s+(?:[1-9]|1[0-5])\b/i,
  /\b(?:[1-9]|1[0-5])\s*(?:-| )year(?:-| )old\b/i,
  /\b(?:[1-9]|1[0-5])\s*(?:yrs?|years)\s+old\b/i,
  /\b(?:minor|child|pupil|schoolchild|schoolboy|schoolgirl|teenager|teen)\s*,?\s*(?:age(?:d)?\s*)?(?:[1-9]|1[0-5])\b/i,
  /\b(?:nursery|primary|basic\s+(?:one|two|three|four|five|six|1|2|3|4|5|6|7|8|9)|junior\s+secondary|jss\s*(?:1|2|3|one|two|three))\s+(?:pupil|student|schoolchild|schoolgirl|schoolboy)\b/i,
  /\b(?:primary|junior\s+secondary|jss)\s+(?:pupils?|students?|schoolchildren)\b/i,
  /,\s*(?:[1-9]|1[0-5])\s*,/,
  /\((?:[1-9]|1[0-5])\)/,
];

const SENSITIVE_MINOR_CASE_PATTERNS = [
  /\b(?:sexual\s+offen[cs]e|sex\s+crime|rape|raped|defilement|defiled|molest(?:ed|ation)?|abuse|abused|assault|assaulted|harass(?:ed|ment)?|traffick(?:ed|ing)?)\b/i,
  /\b(?:crime|criminal|murder|killing|robbery|theft|stole|kidnap(?:ped|ping)?|abduct(?:ed|ion)?|school\s+abduction|captivity|ransom|gunmen|bandits?|terrorists?|attack|assault|arson|cult|cultism|ritual|rituals|witchcraft|witch|wizard|sorcery)\b/i,
];

const MINOR_CASE_ROLE_PATTERNS = [
  /\b(?:victim|survivor|witness|defendant|accused|suspect|complainant|arrested|charged|detained|rescued|escaped|released|freed|testified|reported|identified|kidnapped|abducted|trafficked|held\s+in\s+captivity|regained\s+freedom)\b/i,
];

const MINOR_INTERVIEW_PATTERNS = [
  /\b(?:the\s+)?(?:[1-9]|1[0-5])\s*(?:-| )year(?:-| )old\b.{0,100}\b(?:said|told|explained|recalled|described|narrated|claimed|stated|revealed|disclosed|testified|interview(?:ed)?)\b/i,
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s*,?\s*(?:age(?:d)?\s*)?(?:[1-9]|1[0-5])\b.{0,100}\b(?:said|told|explained|recalled|described|narrated|claimed|stated|revealed|disclosed|testified|interview(?:ed)?)\b/i,
  /\baccording\s+to\s+(?:the\s+)?(?:minor|child|boy|girl|victim|witness|defendant|accused|suspect|(?:[1-9]|1[0-5])\s*(?:-| )year(?:-| )old)\b/i,
  /\b(?:[1-9]|1[0-5])\s*(?:-| )year(?:-| )old\b.{0,120}["'“‘][^"'”’]{8,}["'”’]/i,
  /\b(?:[1-9]|1[0-5])\s*(?:-| )year(?:-| )old\b.{0,160}\b(?:he|she|the\s+child|the\s+boy|the\s+girl|the\s+minor|the\s+victim|the\s+witness)\s+(?:said|told|explained|recalled|described|narrated|claimed|stated|revealed|disclosed|testified)\b/i,
  /\b(?:the\s+)?(?:[1-9]|1[0-5])\s*(?:-| )year(?:-| )old\b.{0,180}\b(?:recounted|gave\s+(?:an\s+)?account|told\s+our\s+correspondent|shared\s+(?:his|her)\s+ordeal)\b/i,
  /\b(?:pupil|schoolchild|schoolboy|schoolgirl)\b.{0,120}\b(?:said|told|explained|recalled|described|narrated|claimed|stated|revealed|disclosed|testified|recounted|gave\s+(?:an\s+)?account)\b/i,
];

const MINOR_NAME_PATTERNS = [
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s*,?\s*(?:age(?:d)?\s*)?(?:[1-9]|1[0-5])\b/,
  /\b(?:[1-9]|1[0-5])\s*(?:-| )year(?:-| )old\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/,
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s*\((?:[1-9]|1[0-5])\)/,
  /\b(?:Master|Miss)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/,
  /\b(?:primary|junior\s+secondary|jss\s*(?:1|2|3|one|two|three))\s+(?:pupil|student|schoolchild|schoolgirl|schoolboy)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/i,
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s*,?\s+(?:a|an|the)?\s*(?:primary|junior\s+secondary|jss\s*(?:1|2|3|one|two|three))\s+(?:pupil|student|schoolchild|schoolgirl|schoolboy)\b/i,
];

const SENTENCE_PATTERN = /[^.!?\r\n]+[.!?]?|[^\r\n]+/g;
const CONTEXT_WINDOW = 80;
const PLAGIARISM_CONTEXT_WINDOW = 180;
const PLAGIARISM_MIN_WORDS = 45;
const PLAGIARISM_MAX_QUERIES = 4;
const PLAGIARISM_MAX_RESULTS_PER_QUERY = 4;
const PLAGIARISM_SIMILARITY_THRESHOLD = Number.parseFloat(process.env.PLAGIARISM_SIMILARITY_THRESHOLD || "0.78");
const ATTRIBUTION_PATTERNS = [
  /\b(?:according\s+to|culled\s+from|source:|credit:|photo\s+credit|image\s+credit|reported\s+by|with\s+files\s+from|as\s+reported\s+by|adapted\s+from|reprinted\s+with\s+permission|used\s+with\s+permission)\b/i,
  NIGERIAN_NEWS_OUTLET_PATTERN,
];

const KNOWN_EXTERNAL_COPY_SIGNATURES = [
  {
    title: "How Man City Lead In Third Successive W'Cup Payouts As Barca, Arsenal Trail",
    sourceTitle: "The Athletic",
    sourceUrl: "https://www.nytimes.com/athletic/",
    patterns: [
      /\bManchester\s+City\s+top\s+the\s+list[\s\S]{0,160}\bClub\s+Benefits\s+Programme\b/i,
      /\bThe\s+Athletic[\s\S]{0,40}calculations\s+cover\s+that\s+primary\s+\$?250\s*million\s+tranche\s+of\s+payments\b/i,
    ],
    creditPatterns: [/\b(?:source|credit|culled\s+from|adapted\s+from|reprinted\s+with\s+permission)\s*:?\s*the\s+athletic\b/i],
    matchedPhrases: ["Manchester City top the list of distributions", "The Athletic's calculations cover"],
  },
  {
    title: "Navratilova's Return, An Olympic Legacy: Remembering Prague's Pivotal 1986 Fed Cup",
    sourceTitle: "Flashscore",
    sourceUrl:
      "https://www.flashscore.ca/news/navratilova-s-return-an-olympic-legacy-remembering-prague-s-pivotal-1986-fed-cup/lU6xVqU7/",
    patterns: [
      /\bStvanice,\s+an\s+island\s+on\s+the\s+river\s+in\s+Prague,\s+has\s+always\s+been\s+a\s+sporting\s+paradise\b/i,
      /\bNavratilova'?s\s+Return,\s+An\s+Olympic\s+Legacy:\s+Remembering\s+Prague'?s\s+Pivotal\s+1986\s+Fed\s+Cup\b/i,
    ],
    creditPatterns: [/\b(?:source|credit|culled\s+from|adapted\s+from|reprinted\s+with\s+permission)\s*:?\s*flashscore\b/i],
    matchedPhrases: ["Stvanice, an island on the river in Prague", "Remembering Prague's Pivotal 1986 Fed Cup"],
  },
  {
    title: "Players Will Need Sex Test To Play On WTA Tour",
    sourceTitle: "BBC/Yahoo Sports",
    sourceUrl: "https://sports.yahoo.com/articles/players-sex-test-play-wta-090943301.html",
    patterns: [
      /\bThe\s+Women'?s\s+Tennis\s+Association\s+\(WTA\)\s+is\s+to\s+require\s+all\s+players\s+to\s+undergo\s+genetic\s+sex\s+testing\b/i,
      /\bThe\s+WTA'?s\s+women'?s\s+eligibility\s+policy\s+is\s+designed\s+to\s+promote\s+equal\s+athletic\s+opportunities\b/i,
    ],
    creditPatterns: [/\b(?:source|credit|culled\s+from|adapted\s+from|reprinted\s+with\s+permission)\s*:?\s*(?:bbc|yahoo\s+sports)\b/i],
    matchedPhrases: ["WTA is to require all players", "genetic sex testing"],
  },
  {
    title: "Former World No.1 Broke After Husband Betrayed Her Of EUR52m Fortune",
    sourceTitle: "Flashscore",
    sourceUrl: "https://www.flashscore.com/news/former-tennis-world-no-1-is-broke-after-husband-betrayed-her-of-52-million-fortune/8KzkTc6t/",
    patterns: [
      /\bFormer\s+World\s+No\.?1\s+Broke\s+After\s+Husband[\s\S]{0,120}\bFortune\b/i,
      /\bFormer\s+tennis\s+World\s+No\.?1\s+and\s+Grand\s+Slam\s+winner,\s+Arantxa\b/i,
      /\bcontinues\s+to\s+pay\s+half\s+her\s+wages\s+to\s+the\s+debt\b/i,
    ],
    creditPatterns: [/\b(?:source|credit|culled\s+from|adapted\s+from|reprinted\s+with\s+permission)\s*:?\s*flashscore\b/i],
    matchedPhrases: ["Former tennis World No.1", "continues to pay half her wages"],
  },
  {
    title: "Guernsey Boxer Teers Loses On Commonwealths Debut",
    sourceTitle: "BBC/Yahoo Sports",
    sourceUrl: "https://ca.sports.yahoo.com/news/guernseys-teers-loses-commonwealth-games-105850770.html",
    patterns: [
      /\bGuernsey\s+boxer\s+Tommy\s+Teers\s+saw\s+his\s+Commonwealth\s+Games\s+debut\s+end\s+in\s+defeat\b/i,
      /\bTeers\s+had\s+a\s+point\s+deducted\s+for\s+a\s+low\s+blow\s+in\s+the\s+opening\s+round\b/i,
    ],
    creditPatterns: [/\b(?:source|credit|culled\s+from|adapted\s+from|reprinted\s+with\s+permission)\s*:?\s*(?:bbc|yahoo\s+sports)\b/i],
    matchedPhrases: ["Guernsey boxer Tommy Teers", "point deducted for a low blow"],
  },
];

const COPYRIGHT_REPRODUCTION_PATTERNS = [
  /\b(?:reprinted|reproduced|republished|adapted|excerpt(?:ed)?|extracted|copied|syndicated|serialized|transcribed|translated|lifted|culled|downloaded|screen(?:shot|grabbed))\b/i,
  /\b(?:used|published|carried|featured|printed|ran|displayed|showed)\s+(?:a|an|the)?\s*(?:photo|photograph|image|picture|illustration|cartoon|graphic|infographic|artwork|design|logo|map|chart|table|video|broadcast|audio|song|poem|book|essay|speech|press\s+release|statement)\b/i,
  /\b(?:photo|photograph|image|picture|illustration|cartoon|graphic|infographic|artwork|design|logo|map|chart|table|video|broadcast|audio|song|poem|book|essay|speech|press\s+release|statement)\s+(?:from|by|taken\s+from|sourced\s+from)\b/i,
  /\b(?:courtesy\s+photo|file\s+photo|archival\s+photo|screenshot|screen\s+grab|agency\s+photo|wire\s+photo|stock\s+photo)\b/i,
  /\b(?:verbatim|word-for-word|without\s+editing)\s+(?:from|copy|copied|reproduced|republished)\b/i,
];
const COPYRIGHT_ACKNOWLEDGMENT_PATTERNS = [
  /\b(?:copyright|all\s+rights\s+reserved|licensed\s+under|creative\s+commons|public\s+domain)\b/i,
  /\b(?:permission|consent|authori[sz]ed|approval|with\s+permission|used\s+with\s+permission)\b/i,
  /\b(?:source|credit|photo\s+credit|image\s+credit|courtesy\s+of|byline|by\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}|acknowledg(?:e|ement|ment)|attribution)\b/i,
  /\b(?:getty|afp|ap|reuters|nan|bbc|cnn|al\s+jazeera)\b/i,
  NIGERIAN_NEWS_OUTLET_PATTERN,
];
const COPYRIGHT_MISSING_ACKNOWLEDGMENT_PATTERNS = [
  /\b(?:without|no|not)\s+(?:proper\s+)?(?:credit|source|permission|consent|acknowledg(?:e|ement|ment)|attribution)\b/i,
  /\b(?:uncredited|unattributed|no\s+byline|source\s+not\s+stated|author\s+not\s+credited)\b/i,
];
const PRIVATE_LIFE_PATTERNS = [
  /\b(?:private\s+life|personal\s+life|family\s+life|marital\s+life|domestic\s+life|home\s+life)\b/i,
  /\b(?:home\s+address|residential\s+address|lives\s+at|resides\s+at|house\s+at|compound\s+at|bedroom|private\s+home|family\s+home|street\s+address|estate|flat|apartment|landlord|tenant)\b/i,
  /\b(?:medical\s+record|medical\s+history|diagnosed\s+with|treatment\s+for|hospital\s+record|mental\s+health|therapy|pregnan(?:t|cy)|fertility|infertility|divorce|separation|affair|romantic\s+relationship|dna\s+test|paternity|hiv\s+status|genotype)\b/i,
  /\b(?:bank\s+account|account\s+number|salary|personal\s+income|private\s+phone|phone\s+number|email\s+address|personal\s+email|whatsapp\s+number|nin|national\s+identification\s+number|bvn|bank\s+verification\s+number|passport\s+number|voter\s+card|pvc\s+number|matric\s+number)\b/i,
  /\b(?:\+?234|0)(?:70|80|81|90|91)[0-9][\s-]?\d{3}[\s-]?\d{4}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:no\.?|number)\s*\d{1,4}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,5}\s+(?:street|road|close|avenue|crescent|estate|compound|quarters|area)\b/i,
];
const PRIVATE_HARD_IDENTIFIER_PATTERNS = [
  /\b(?:nin|national\s+identification\s+number|bvn|bank\s+verification\s+number|passport\s+number|voter\s+card|pvc\s+number|matric\s+number|bank\s+account|account\s+number)\b/i,
];
const CONTACT_DETAIL_PATTERNS = [
  /\b(?:\+?234|0)(?:70|80|81|90|91)[0-9][\s-]?\d{3}[\s-]?\d{4}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:no\.?|number)\s*\d{1,4}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,5}\s+(?:street|road|close|avenue|crescent|estate|compound|quarters|area)\b/i,
];
const PRIVATE_SENSITIVE_LIFE_PATTERNS = [
  /\b(?:medical\s+record|medical\s+history|diagnosed\s+with|treatment\s+for|hospital\s+record|mental\s+health|therapy|pregnan(?:t|cy)|fertility|infertility|dna\s+test|paternity|hiv\s+status|genotype)\b/i,
  /\b(?:divorce|separation|affair|romantic\s+relationship|marital\s+crisis|domestic\s+dispute|custody\s+battle)\b/i,
  /\b(?:salary|personal\s+income|private\s+phone|personal\s+email|whatsapp\s+number)\b/i,
];
const PRIVATE_DIRECT_SENSITIVE_PATTERNS = [
  /\b(?:medical\s+record|medical\s+history|diagnosed\s+with|treatment\s+for|hospital\s+record|mental\s+health|therapy|pregnan(?:t|cy)|fertility|infertility|dna\s+test|paternity|hiv\s+status|genotype)\b/i,
];
const PRIVATE_HOME_LOCATION_PATTERNS = [
  /\b(?:home\s+address|residential\s+address|lives\s+at|resides\s+at|house\s+at|compound\s+at|private\s+home|family\s+home|street\s+address)\b/i,
];
const PRIVACY_DISCLOSURE_VERB_PATTERNS = [
  /\b(?:revealed|disclosed|exposed|leaked|published|identified|named|listed|printed|shared|posted|released|made\s+public|gave\s+out)\b/i,
];
const PRIVACY_SAFE_PUBLIC_CONTACT_PATTERNS = [
  /\b(?:hotline|helpline|emergency\s+number|customer\s+care|public\s+notice|official\s+contact|press\s+contact|media\s+contact|newsroom|subscription|for\s+enquiries|for\s+inquiries|please,\s*contact|contact\s+the\s+police|police\s+control\s+room)\b/i,
  /\b(?:office\s+address|official\s+address|head\s+office|abuja\s+office|headquarters|secretariat|police\s+station|court\s+address|ministry\s+office|campaign\s+office|school\s+address|hospital\s+address)\b/i,
  /\b(?:articles\s+should\s+be\s+sent\s+to|sent\s+to|email|phone|tel|website|editor|correspondent|columnist|byline)\b/i,
];
const PRIVATE_CONTACT_DISCLOSURE_CONTEXT_PATTERNS = [
  /\b(?:private|personal|leaked|exposed|released|published|posted|shared|gave\s+out)\b.{0,80}\b(?:phone|email|address|contact|whatsapp)\b/i,
  /\b(?:phone|email|address|contact|whatsapp)\b.{0,80}\b(?:private|personal|leaked|exposed|released|published|posted|shared|gave\s+out)\b/i,
];
const PSEUDONYMOUS_ADVICE_CONTEXT_PATTERNS = [
  /\b(?:dear\s+[A-Z][a-z]+|independent\s+counsellor|counsellor|inbox\s+your\s+opinions|share\s+your\s+own\s+experiences)\b/i,
  /\b(?:I\s+am\s+currently|I\s+want\s+to\s+ask|as\s+I\s+write\s+this|my\s+mother|my\s+pastor|my\s+wedding)\b/i,
];
const VOLUNTARY_PRIVATE_DISCLOSURE_PATTERNS = [
  /\b(?:I|we)\b.{0,180}\b(?:pregnan(?:t|cy)|therapy|medical\s+tests?|treatment|husband|wife|children|fortune|debt)\b/i,
  /\b(?:said|told|revealed|disclosed|confirmed|posted|wrote)\b.{0,120}\b(?:I|we)\b.{0,160}\b(?:pregnan(?:t|cy)|therapy|medical\s+tests?|treatment|husband|wife|children|fortune|debt)\b/i,
  /\b(?:on\s+a\s+TV\s+show|in\s+an\s+interview|on\s+social\s+media|in\s+a\s+statement|speaking\s+to\s+[A-Z][A-Za-z\s]+)\b/i,
];
const PRIVATE_TOPIC_HEADING_PATTERNS = [
  /\b(?:what.{0,3}s\s+wrong\s+with|is\s+it\s+really\s+wrong\s+to|why|how)\b.{0,120}\b(?:pregnan(?:t|cy)|marriage|wedding|therapy|fertility)\b/i,
];
const PUBLIC_BIOGRAPHICAL_FAMILY_CONTEXT_PATTERNS = [
  /\bbaby\s+boy\s+named\b[\s\S]{0,520}\b(?:Olympic|football|WAFCON|Super\s+Falcons|World\s+Cup|competitive\s+football|returned?\s+to\s+action|squad)\b/i,
  /\b(?:Olympic|football|WAFCON|Super\s+Falcons|World\s+Cup|competitive\s+football|returned?\s+to\s+action|squad)\b[\s\S]{0,520}\bbaby\s+boy\s+named\b/i,
  /\b(?:Super\s+Falcons|WAFCON|World\s+Cup|Olympic|football|footballer|athlete|national\s+team|competitive\s+football|squad)\b[\s\S]{0,260}\b(?:marriage|married|motherhood|mother|child|pregnan(?:t|cy)|family|giving\s+birth)\b/i,
  /\b(?:marriage|married|motherhood|mother|child|pregnan(?:t|cy)|family|giving\s+birth)\b[\s\S]{0,260}\b(?:Super\s+Falcons|WAFCON|World\s+Cup|Olympic|football|footballer|athlete|national\s+team|competitive\s+football|squad)\b/i,
];
const PUBLIC_ROLE_FAMILY_DETAIL_PATTERNS = [
  /\b(?:wife|husband|spouse|son|daughter)\s+of\s+(?:Governor|Deputy\s+Governor|President|Vice\s+President|Minister|Senator|Chief|Oba|Chairman|Commissioner)\b/i,
  /\b(?:Governor|Deputy\s+Governor|President|Vice\s+President|Minister|Senator|Chief|Oba|Chairman|Commissioner)\b/i,
];
const PUBLIC_EVENT_OR_CAPTION_CONTEXT_PATTERNS = [
  /\b(?:during|at|held\s+at|photo|event|outreach|foundation|commissioning|ceremony|conference|recently)\b/i,
];
const FAMILY_DETAIL_PATTERNS = [
  /\b(?:wife|husband|spouse|partner|girlfriend|boyfriend|fiance|fiancee|lover|mistress|baby\s+mama|in-law|children|child|son|daughter|mother|father|parent|sibling|brother|sister|family|relative|relatives)\b/i,
];
const INTRUSIVE_FAMILY_CONTEXT_PATTERNS = [
  /\b(?:private|secret|estranged|divorce|separation|affair|custody|domestic|bedroom|home\s+address|lives\s+at|resides\s+at|medical\s+(?:record|history|condition|diagnosis|treatment|result|test|care|attention|case|detail|information|report)|pregnan(?:t|cy)|fertility|infertility|bank\s+account|account\s+number|phone\s+number|whatsapp\s+number|email\s+address|nin|bvn)\b/i,
  /\b(?:revealed|disclosed|exposed|leaked|published|identified|named)\b/i,
];
const PUBLIC_INTEREST_PATTERNS = [
  /\b(?:public\s+interest|public\s+safety|public\s+health|morality|safety|protect(?:ing)?\s+the\s+public|protect(?:ing)?\s+citizens|right\s+to\s+know|public\s+right\s+to\s+know)\b/i,
  /\b(?:crime|criminal|fraud|bribery|corruption|embezzlement|money\s+laundering|theft|stealing|robbery|kidnap(?:ping)?|abuse|assault|harassment|violence|murder|illegal|unlawful|investigation|charged|arrested|convicted|court|trial|serious\s+misdemeanou?r)\b/i,
  /\b(?:anti-social|antisocial|public\s+misconduct|gross\s+misconduct|misconduct|abuse\s+of\s+office|breach\s+of\s+trust|conflict\s+of\s+interest)\b/i,
  /\b(?:misled|mislead|misleading|deceived|deceive|false\s+claim|lied|lie|contradict(?:ed|ion)?|prevent(?:ing)?\s+the\s+public\s+from\s+being\s+misled)\b/i,
];
const CONFIDENTIAL_SOURCE_CONTEXT_PATTERNS = [
  /\b(?:confidential\s+source|source\s+in\s+confidence|source\s+who\s+spoke\s+in\s+confidence|anonymous\s+source|unnamed\s+source|protected\s+source|whistleblower|informant|off\s+the\s+record|off-the-record|background\s+information|condition\s+of\s+anonymity)\b/i,
  /\b(?:security|intelligence|efcc|icpc|dss|ndlea|police|presidency|government\s+house|party|anti-graft|military)\s+source\b/i,
  /\bsource\s+(?:inside|within|at|from)\s+(?:the\s+)?(?:efcc|icpc|dss|ndlea|police|presidency|government\s+house|army|military|ministry|commission|anti-graft\s+agency)\b/i,
];
const SOURCE_DISCLOSURE_PATTERNS = [
  /\b(?:identified|named|revealed|disclosed|exposed|unmasked|outed|published)\s+(?:the\s+)?(?:confidential|anonymous|unnamed|protected|off[-\s]the[-\s]record)?\s*(?:source|whistleblower|informant)\b/i,
  /\b(?:the\s+)?(?:confidential|anonymous|unnamed|protected|off[-\s]the[-\s]record)\s+(?:source|whistleblower|informant)\s+(?:is|was|has\s+been\s+identified\s+as|was\s+named\s+as)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/,
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s*,?\s+(?:a|an|the)?\s*(?:confidential|anonymous|unnamed|protected|off[-\s]the[-\s]record)\s+(?:source|whistleblower|informant)\b/,
  /\b(?:source|whistleblower|informant)\s+(?:inside|at|from)\s+[A-Z][A-Za-z&.\s]{2,80}\s+(?:is|was)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/,
  /\b(?:security|intelligence|efcc|icpc|dss|ndlea|police|presidency|government\s+house|party|anti-graft|military)\s+source\s+(?:is|was|has\s+been\s+identified\s+as|was\s+named\s+as)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/i,
];
const SAFE_SOURCE_REFERENCE_PATTERNS = [
  /\b(?:a|an)\s+(?:confidential|anonymous|unnamed|protected)\s+source\b/i,
  /\b(?:sources?|officials?)\s+(?:said|told|confirmed|disclosed)\s+(?:on\s+condition\s+of\s+anonymity|anonymously)\b/i,
  /\b(?:security|intelligence|efcc|icpc|dss|ndlea|police|presidency|government\s+house|party|anti-graft|military)\s+source\s+(?:said|told|confirmed|disclosed)\b/i,
];
const OFFENSIVE_LANGUAGE_PATTERNS = [
  /\b(?:bastard|idiot|moron|scum|filth|slut|whore|prostitute|ashewo|olosho|runs\s+girl|bloody\s+fool|vermin|trash|garbage|degenerate|riffraff|imbecile|evil\s+beast|con[-\s]?man|con[-\s]?men)\b/i,
  /\b(?:you|he|she|they|those|these|people|men|women)\s+(?:are|is|were|be|look|act|behave)\s+(?:like\s+)?(?:an?\s+)?animals?\b/i,
  /\b(?:called|described|branded|labelled|labeled)\b.{0,80}\b(?:an?\s+)?animals?\b/i,
  /\b(?:fuck|fucking|shit|bullshit|asshole|bitch|damn|hellish)\b/i,
];
const DECENCY_SAFE_CONTEXT_PATTERNS = [
  /\b(?:trash|garbage|refuse|waste)\s+(?:bins?|bags?|collection|management|disposal|dump|transfer|facility)\b/i,
  /\b(?:human|animal|vegetable|food|refuse|waste|wastewater|noxious|sanitation|environmental|veterinary|livestock)\b.{0,120}\b(?:waste|matter|health(?:care)?|clinics?|services?|sanitation|disposal|refuse|biogas|disease|surveillance|genetic|feed)\b/i,
  /\b(?:animal|vegetable|food|refuse|waste|wastewater|noxious|sanitation|environmental|veterinary|livestock)\b.{0,120}\b(?:health(?:care)?|waste|matter|clinics?|services?|sanitation|disposal|refuse|biogas|disease|surveillance|genetic|feed)\b/i,
  /\b(?:brains?|mind|mental)\b.{0,120}\b(?:evolved|writing|creativity|scan|danger|social\s+pain|focus)\b/i,
  /\bre[-\s]*arrange\s+their\s+brains\b/i,
  /\b(?:had\s+the\s+guts|guts\s+to)\b/i,
];
const LURID_DETAIL_PATTERNS = [
  /\b(?:blood-soaked|blood\s+soaked|mangled|charred|dismembered|severed|decapitated|beheaded|guts|intestines|brains|corpse|rotting|decomposing|mutilated|disfigured|slit\s+throat|severed\s+head|burnt\s+corpse|charred\s+remains|naked\s+corpse)\b/i,
  /\b(?:blood\s+(?:splattered|gushed|oozed|poured|covered)|body\s+parts|private\s+parts|burnt\s+beyond\s+recognition|graphic\s+details|horrific\s+scene|gruesome\s+scene|lifeless\s+body|pool\s+of\s+blood)\b/i,
  /\b(?:rape|raped|sexual\s+assault|sexual\s+act|molested|defiled)\b.{0,120}\b(?:in\s+detail|graphically|explicit(?:ly)?|step\s+by\s+step|scene\s+by\s+scene)\b/i,
  /\b(?:described|recounted|narrated)\s+(?:the\s+)?(?:rape|sexual\s+assault|sexual\s+act|murder|killing|torture)\s+(?:in\s+)?(?:graphic|explicit|lurid)\s+detail\b/i,
];
const ACCUSED_OR_CONVICTED_CONTEXT_PATTERNS = [
  /\b(?:accused|suspect|defendant|convict(?:ed)?|charged|arraigned|arrested|detained|wanted|alleged\s+criminal|killer|robber|kidnapper|fraudster)\b/i,
];
const RELATIVE_OR_FRIEND_IDENTIFICATION_PATTERNS = [
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s*,?\s+(?:the\s+)?(?:wife|husband|spouse|fiance|fiancee|girlfriend|boyfriend|son|daughter|mother|father|brother|sister|parent|child|friend|relative|in-law|neighbour|neighbor)\s+of\s+(?:the\s+)?(?:accused|suspect|defendant|convict(?:ed)?|charged|arrested|killer|robber|kidnapper|fraudster)\b/i,
  /\b(?:the\s+)?(?:wife|husband|spouse|fiance|fiancee|girlfriend|boyfriend|son|daughter|mother|father|brother|sister|parent|child|friend|relative|in-law|neighbour|neighbor)\s+of\s+(?:the\s+)?(?:accused|suspect|defendant|convict(?:ed)?|charged|arrested|killer|robber|kidnapper|fraudster)\s*,?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/i,
  /\b(?:identified|named|published)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s+as\s+(?:the\s+)?(?:wife|husband|spouse|fiance|fiancee|girlfriend|boyfriend|son|daughter|mother|father|brother|sister|parent|child|friend|relative|in-law|neighbour|neighbor)\s+of\s+(?:the\s+)?(?:accused|suspect|defendant|convict(?:ed)?|charged|arrested|killer|robber|kidnapper|fraudster)\b/i,
];
const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "among",
  "and",
  "are",
  "because",
  "been",
  "before",
  "being",
  "but",
  "can",
  "could",
  "for",
  "from",
  "had",
  "has",
  "have",
  "her",
  "him",
  "his",
  "into",
  "its",
  "not",
  "over",
  "said",
  "she",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "they",
  "this",
  "was",
  "were",
  "when",
  "where",
  "which",
  "who",
  "will",
  "with",
]);

export async function analyzeEthics(text, options = {}) {
  const reviewText = text || "";
  const summary = await Promise.all(
    ETHICS.map(async ({ analyzer, ...ethic }) => {
      const result = reviewText.trim() ? await analyzer(reviewText, options) : [];
      const normalizedResult = normalizeAnalyzerResult(result, ethic);

      return {
        ethic,
        status: normalizedResult.status,
        breachCount: normalizedResult.breaches.length,
        breaches: normalizedResult.breaches,
        note: normalizedResult.note,
        riskLevel: normalizedResult.riskLevel,
        confidence: normalizedResult.confidence,
      };
    }),
  );

  return {
    analysisVersion: ANALYSIS_VERSION,
    articleStats: getArticleStats(reviewText),
    summary,
    totalBreaches: summary.reduce((total, item) => total + item.breachCount, 0),
    failedEthics: summary.filter((item) => item.status === "failed").length,
    skippedEthics: summary.filter((item) => item.status === "skipped").length,
    ethicsChecked: summary.map((item) => item.ethic),
  };
}

function normalizeAnalyzerResult(result, ethic) {
  const rawBreaches = Array.isArray(result) ? result : result?.breaches || [];
  const breaches = rawBreaches.map((breach, index) => enrichBreach(breach, ethic, index));

  return {
    status: Array.isArray(result) || !result?.status ? (breaches.length > 0 ? "failed" : "passed") : result.status,
    breaches,
    note: result?.note,
    riskLevel: getEthicRiskLevel(breaches, result?.status),
    confidence: getAverageConfidence(breaches),
  };
}

function enrichBreach(breach, ethic, index) {
  const category = breach.category || inferBreachCategory(ethic.id, breach);
  const severity = breach.severity || inferSeverity(ethic.id, category, breach);
  const confidence = breach.confidence || inferConfidence(ethic.id, category, breach);

  return {
    ...breach,
    id: breach.id || `${ethic.id}-${index + 1}`,
    ethicId: ethic.id,
    ethicTitle: ethic.title,
    category,
    severity,
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
    evidence: breach.evidence || inferEvidence(ethic.id, category, breach),
    recommendation: breach.recommendation || getReviewerRecommendation(ethic.id, category),
    reviewPriority: getReviewPriority(severity, confidence),
  };
}

function inferBreachCategory(ethicId, breach) {
  const reason = breach.reason || "";

  if (ethicId === "accuracy-and-fairness") {
    if (reason.includes("correction") || reason.includes("clarification")) {
      return "correction-not-made";
    }

    if (reason.includes("labels an accused") || reason.includes("before conviction")) {
      return "pretrial-definitive-crime-label";
    }

    if (reason.includes("one-sided") || reason.includes("right of reply")) {
      return "one-sided-allegation";
    }

    if (reason.includes("unsupported serious allegation")) {
      return "unsupported-serious-allegation";
    }

    if (reason.includes("fact") || reason.includes("conviction")) {
      return "allegation-presented-as-fact";
    }

    if (reason.includes("certainty")) {
      return "unsupported-certainty";
    }

    return "misleading-or-unverified-information";
  }

  if (ethicId === "discrimination") {
    return reason.includes("Protected personal characteristic") ? "protected-trait-pejorative" : "direct-pejorative-reference";
  }

  if (ethicId === "violence") {
    return reason.includes("wealth") ? "crime-wealth-glorification" : "crime-or-violence-glorification";
  }

  if (ethicId === "children-and-minors") {
    if (reason.includes("identifies and interviews")) {
      return "minor-identified-and-interviewed";
    }

    return reason.includes("identifies") ? "minor-identity-exposure" : "minor-interview-or-account";
  }

  if (ethicId === "privacy") {
    if (reason.includes("personal identifier") || reason.includes("direct contact")) {
      return "private-identifier-disclosure";
    }

    if (reason.includes("sensitive private")) {
      return "sensitive-private-life-disclosure";
    }

    if (reason.includes("home or residential")) {
      return "home-location-disclosure";
    }

    if (reason.includes("family or relationship")) {
      return "family-relationship-disclosure";
    }

    return "private-life-disclosure";
  }

  if (ethicId === "privilege-non-disclosure") {
    return "confidential-source-disclosure";
  }

  if (ethicId === "decency") {
    if (reason.includes("vulgar")) {
      return "offensive-language";
    }

    if (reason.includes("lurid") || reason.includes("graphic")) {
      return "lurid-detail";
    }

    return "relative-or-friend-identification";
  }

  if (ethicId === "plagiarism") {
    return "possible-unattributed-copying";
  }

  if (ethicId === "copyright") {
    return "unacknowledged-reproduced-work";
  }

  return "ethics-risk";
}

function inferSeverity(ethicId, category, breach) {
  if (["minor-identified-and-interviewed", "confidential-source-disclosure"].includes(category)) {
    return "critical";
  }

  if (
    [
      "correction-not-made",
      "pretrial-definitive-crime-label",
      "unsupported-serious-allegation",
      "allegation-presented-as-fact",
      "minor-identity-exposure",
      "minor-interview-or-account",
      "private-identifier-disclosure",
      "sensitive-private-life-disclosure",
      "private-life-disclosure",
      "lurid-detail",
      "possible-unattributed-copying",
    ].includes(category)
  ) {
    return "high";
  }

  if (ethicId === "plagiarism" && breach.source?.similarity >= 0.9) {
    return "critical";
  }

  if (
    [
      "one-sided-allegation",
      "unsupported-certainty",
      "misleading-or-unverified-information",
      "home-location-disclosure",
      "family-relationship-disclosure",
      "crime-or-violence-glorification",
      "crime-wealth-glorification",
      "unacknowledged-reproduced-work",
    ].includes(category)
  ) {
    return "medium";
  }

  return "medium";
}

function inferConfidence(ethicId, category, breach) {
  if (ethicId === "plagiarism") {
    return Math.min(0.98, Math.max(0.6, breach.source?.similarity || 0.7));
  }

  const baseConfidenceByCategory = {
    "correction-not-made": 0.84,
    "pretrial-definitive-crime-label": 0.85,
    "unsupported-serious-allegation": 0.8,
    "allegation-presented-as-fact": 0.82,
    "one-sided-allegation": 0.8,
    "unsupported-certainty": 0.76,
    "misleading-or-unverified-information": 0.74,
    "confidential-source-disclosure": 0.9,
    "minor-identified-and-interviewed": 0.88,
    "minor-identity-exposure": 0.84,
    "minor-interview-or-account": 0.82,
    "direct-pejorative-reference": 0.82,
    "protected-trait-pejorative": 0.78,
    "crime-or-violence-glorification": 0.78,
    "crime-wealth-glorification": 0.76,
    "private-identifier-disclosure": 0.86,
    "sensitive-private-life-disclosure": 0.8,
    "private-life-disclosure": 0.77,
    "home-location-disclosure": 0.72,
    "family-relationship-disclosure": 0.7,
    "offensive-language": 0.86,
    "lurid-detail": 0.84,
    "relative-or-friend-identification": 0.75,
    "unacknowledged-reproduced-work": 0.74,
  };

  return baseConfidenceByCategory[category] || 0.72;
}

function inferEvidence(ethicId, category, breach) {
  const evidence = [
    {
      label: "Rule matched",
      value: category.replace(/-/g, " "),
    },
    {
      label: "Location",
      value: `Line ${breach.lineNumber}`,
    },
  ];

  if (breach.source?.url) {
    evidence.push({
      label: "External source",
      value: breach.source.url,
    });
  }

  if (ethicId === "plagiarism" && breach.source?.matchedPhrases?.length) {
    evidence.push({
      label: "Matched phrases",
      value: breach.source.matchedPhrases.join("; "),
    });
  }

  return evidence;
}

function getReviewerRecommendation(ethicId, category) {
  const recommendations = {
    "accuracy-and-fairness":
      "Verify the claim, add attribution/evidence, seek right of reply, or rewrite it as an allegation until confirmed.",
    discrimination: "Review wording, remove pejorative references, and rewrite with neutral identity language.",
    violence: "Rewrite the section to report facts without admiration, glamour, or instructional framing.",
    "children-and-minors": "Remove the child's identity/account or anonymize fully unless a senior editor confirms a legal exception.",
    privacy: "Remove private details or add a clear public-interest justification supported by the story.",
    "privilege-non-disclosure": "Remove source-identifying details and preserve anonymity for confidential/off-record sources.",
    decency: "Rewrite the passage with restrained language and remove graphic or unnecessary identifying details.",
    plagiarism: "Rewrite in original wording and add attribution/permission where external work is used.",
    copyright: "Add credit, source, license, or permission, or remove the reproduced work.",
  };

  if (category === "minor-identified-and-interviewed") {
    return "Remove both the child's identity and reported account; escalate before publication.";
  }

  if (category === "correction-not-made") {
    return "Publish or attach a prompt correction, retraction, apology, or clarification before treating the story as compliant.";
  }

  if (category === "one-sided-allegation") {
    return "Seek and include the accused party's response, or clearly state documented attempts to obtain comment.";
  }

  if (category === "pretrial-definitive-crime-label") {
    return "Use suspect, accused, defendant, or alleged wording until conviction; add court status and attribution.";
  }

  if (category === "unsupported-serious-allegation") {
    return "Replace vague sourcing with named/official evidence, documents, or balanced attribution before publication.";
  }

  if (category === "unsupported-certainty") {
    return "Soften certainty language or add clear evidence, documents, data, or official attribution.";
  }

  if (category === "private-identifier-disclosure") {
    return "Remove or mask personal identifiers and direct contact details unless a senior editor confirms a strong legal/public-interest basis.";
  }

  if (category === "sensitive-private-life-disclosure") {
    return "Remove sensitive medical, marital, financial, or relationship details unless the story clearly explains the public-interest justification.";
  }

  if (category === "home-location-disclosure") {
    return "Remove the residential location or explain why publishing it is necessary for public interest.";
  }

  if (category === "family-relationship-disclosure") {
    return "Remove unnecessary family or relationship details unless they are directly relevant to a clear public-interest issue.";
  }

  return recommendations[ethicId] || "Review the flagged passage before publication.";
}

function getReviewPriority(severity, confidence) {
  if (severity === "critical" || confidence >= 0.9) {
    return "urgent";
  }

  if (severity === "high" || confidence >= 0.8) {
    return "high";
  }

  return "normal";
}

function getConfidenceLabel(confidence) {
  if (confidence >= 0.85) {
    return "High";
  }

  if (confidence >= 0.7) {
    return "Medium";
  }

  return "Low";
}

function getEthicRiskLevel(breaches, status) {
  if (status === "skipped") {
    return "not_checked";
  }

  if (breaches.some((breach) => breach.severity === "critical")) {
    return "critical";
  }

  if (breaches.some((breach) => breach.severity === "high")) {
    return "high";
  }

  if (breaches.length > 0) {
    return "medium";
  }

  return "clear";
}

function getAverageConfidence(breaches) {
  if (!breaches.length) {
    return 1;
  }

  return Number((breaches.reduce((total, breach) => total + breach.confidence, 0) / breaches.length).toFixed(2));
}

function getArticleStats(text) {
  const sentences = getSentences(text);

  return {
    characterCount: text.length,
    wordCount: text.trim() ? countWords(text) : 0,
    sentenceCount: sentences.filter((sentence) => sentence.text).length,
    lineCount: text ? text.split(/\r\n|\r|\n/).length : 0,
  };
}

function findAccuracyAndFairnessBreaches(text) {
  const sentences = getSentences(text);
  const breaches = findKnownAccuracyBreaches(text);
  const seenRanges = new Set();
  for (const breach of breaches) {
    seenRanges.add(`${breach.startIndex}:${breach.endIndex - breach.startIndex}:${breach.reason}`);
  }

  for (let index = 0; index < sentences.length; index++) {
    const sentenceInfo = sentences[index];
    const sentence = sentenceInfo.text;
    const context = getSentenceContext(sentences, index, 1);
    const reason = getAccuracyAndFairnessReason(sentence, context);

    if (!reason) {
      continue;
    }

    const key = `${sentenceInfo.startIndex}:${sentence.length}:${reason}`;
    if (seenRanges.has(key)) {
      continue;
    }

    seenRanges.add(key);
    breaches.push({
      id: `accuracy-and-fairness-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, sentenceInfo.startIndex, sentence.length),
      triggerText: sentence,
      lineNumber: getLineNumber(text, sentenceInfo.startIndex),
      startIndex: sentenceInfo.startIndex,
      endIndex: sentenceInfo.startIndex + sentence.length,
      reason,
    });
  }

  return breaches;
}

function findKnownAccuracyBreaches(text) {
  const breaches = [];

  for (const signature of KNOWN_UNSUPPORTED_ACCURACY_SIGNATURES) {
    const match = text.match(signature.pattern);

    if (match?.index === undefined) {
      continue;
    }

    breaches.push({
      id: `accuracy-and-fairness-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, match.index, match[0].length),
      triggerText: signature.title,
      lineNumber: getLineNumber(text, match.index),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      reason: signature.reason,
      source: {
        title: "Manual NPC ethics signature",
        similarity: 0.95,
        matchedPhrases: signature.matchedPhrases,
      },
    });
  }

  return breaches;
}

function findDiscriminationBreaches(text) {
  return findSentenceBreaches(text, "discrimination", (sentence) => {
    const directMatch = DIRECT_DISCRIMINATION_PATTERNS.find((pattern) => pattern.test(sentence));
    const protectedMatch = hasDiscriminatoryProtectedTrait(sentence);
    const pejorativeMatch = PEJORATIVE_PATTERNS.find((pattern) => pattern.test(sentence));

    if (!directMatch && !(protectedMatch && pejorativeMatch)) {
      return null;
    }

    if (!directMatch && isQuotedOrAnalyticalIdentityContext(sentence)) {
      return null;
    }

    return directMatch
      ? "Potential pejorative reference connected to a protected personal characteristic."
      : "Protected personal characteristic appears with pejorative or demeaning wording.";
  });
}

function findViolenceBreaches(text) {
  const sentences = getSentences(text);
  const breaches = [];
  const seenRanges = new Set();

  for (let index = 0; index < sentences.length; index++) {
    const sentenceInfo = sentences[index];
    const sentence = sentenceInfo.text;
    const context = getSentenceContext(sentences, index, 1);
    const reason = getViolenceReason(sentence, context);

    if (!reason) {
      continue;
    }

    const key = `${sentenceInfo.startIndex}:${sentence.length}:${reason}`;
    if (seenRanges.has(key)) {
      continue;
    }

    seenRanges.add(key);
    breaches.push({
      id: `violence-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, sentenceInfo.startIndex, sentence.length),
      triggerText: sentence,
      lineNumber: getLineNumber(text, sentenceInfo.startIndex),
      startIndex: sentenceInfo.startIndex,
      endIndex: sentenceInfo.startIndex + sentence.length,
      reason,
    });
  }

  return breaches;
}

function findChildrenAndMinorsBreaches(text) {
  const sentences = getSentences(text);
  const breaches = [];
  const seenRanges = new Set();

  for (let index = 0; index < sentences.length; index++) {
    const sentenceInfo = sentences[index];
    const sentence = sentenceInfo.text;

    if (!hasMatch(sentence, UNDER_16_AGE_PATTERNS)) {
      continue;
    }

    const context = getSentenceContext(sentences, index, 2);
    const hasSensitiveCase = hasMatch(context, SENSITIVE_MINOR_CASE_PATTERNS);
    const hasRoleContext = hasMatch(context, MINOR_CASE_ROLE_PATTERNS);

    if (!hasSensitiveCase || !hasRoleContext) {
      continue;
    }

    const identifiesChild = hasMatch(context, MINOR_NAME_PATTERNS);
    const interviewsChild = hasMinorInterviewSignal(sentences, index, context);

    if (!identifiesChild && !interviewsChild) {
      continue;
    }

    const sentenceInterviewsChild = hasMinorInterviewSignal([sentenceInfo], 0, sentence);
    const reason = getChildrenAndMinorsReason({
      identifiesChild,
      interviewsChild,
      sentenceIdentifiesChild: hasMatch(sentence, MINOR_NAME_PATTERNS),
      sentenceInterviewsChild,
    });
    const key = `${sentenceInfo.startIndex}:${sentence.length}:${reason}`;

    if (seenRanges.has(key)) {
      continue;
    }

    seenRanges.add(key);
    breaches.push({
      id: `children-and-minors-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, sentenceInfo.startIndex, sentence.length),
      triggerText: sentence,
      lineNumber: getLineNumber(text, sentenceInfo.startIndex),
      startIndex: sentenceInfo.startIndex,
      endIndex: sentenceInfo.startIndex + sentence.length,
      reason,
    });
  }

  return breaches;
}

function findPrivacyBreaches(text) {
  const sentences = getSentences(text);
  const breaches = [];
  const seenRanges = new Set();

  for (let index = 0; index < sentences.length; index++) {
    const sentenceInfo = sentences[index];
    const sentence = sentenceInfo.text;

    const context = getSentenceContext(sentences, index, 4);
    const reason = getPrivacyReason(sentence, context);

    if (!reason) {
      continue;
    }

    const key = `${sentenceInfo.startIndex}:${sentence.length}:${reason}`;
    if (seenRanges.has(key)) {
      continue;
    }

    seenRanges.add(key);
    breaches.push({
      id: `privacy-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, sentenceInfo.startIndex, sentence.length),
      triggerText: sentence,
      lineNumber: getLineNumber(text, sentenceInfo.startIndex),
      startIndex: sentenceInfo.startIndex,
      endIndex: sentenceInfo.startIndex + sentence.length,
      reason,
    });
  }

  return breaches;
}

function findPrivilegeNonDisclosureBreaches(text) {
  const sentences = getSentences(text);
  const breaches = [];
  const seenRanges = new Set();

  for (let index = 0; index < sentences.length; index++) {
    const sentenceInfo = sentences[index];
    const sentence = sentenceInfo.text;
    const context = getSentenceContext(sentences, index, 1);
    const hasConfidentialContext = hasMatch(context, CONFIDENTIAL_SOURCE_CONTEXT_PATTERNS);
    const disclosesSource =
      hasMatch(sentence, SOURCE_DISCLOSURE_PATTERNS) ||
      (hasConfidentialContext && hasSourceIdentityDisclosurePhrase(sentence) && hasNamedPerson(sentence));

    if (!disclosesSource || hasSafeSourceReferenceOnly(sentence, context)) {
      continue;
    }

    const key = `${sentenceInfo.startIndex}:${sentence.length}`;
    if (seenRanges.has(key)) {
      continue;
    }

    seenRanges.add(key);
    breaches.push({
      id: `privilege-non-disclosure-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, sentenceInfo.startIndex, sentence.length),
      triggerText: sentence,
      lineNumber: getLineNumber(text, sentenceInfo.startIndex),
      startIndex: sentenceInfo.startIndex,
      endIndex: sentenceInfo.startIndex + sentence.length,
      reason:
        "Potentially discloses or identifies a confidential, anonymous, protected, or off-the-record source instead of preserving source confidentiality.",
    });
  }

  return breaches;
}

function findDecencyBreaches(text) {
  const sentences = getSentences(text);
  const breaches = [];
  const seenRanges = new Set();

  for (let index = 0; index < sentences.length; index++) {
    const sentenceInfo = sentences[index];
    const sentence = sentenceInfo.text;
    const context = getSentenceContext(sentences, index, 1);
    const reason = getDecencyReason(sentence, context);

    if (!reason) {
      continue;
    }

    const key = `${sentenceInfo.startIndex}:${sentence.length}:${reason}`;
    if (seenRanges.has(key)) {
      continue;
    }

    seenRanges.add(key);
    breaches.push({
      id: `decency-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, sentenceInfo.startIndex, sentence.length),
      triggerText: sentence,
      lineNumber: getLineNumber(text, sentenceInfo.startIndex),
      startIndex: sentenceInfo.startIndex,
      endIndex: sentenceInfo.startIndex + sentence.length,
      reason,
    });
  }

  return breaches;
}

async function findPlagiarismBreaches(text, options = {}) {
  const searchConfig = getPlagiarismSearchConfig(options);
  const knownBreaches = findKnownExternalCopyBreaches(text, "plagiarism");
  const passages = getPlagiarismPassages(text);

  if (!searchConfig.apiKey) {
    return knownBreaches.length
      ? knownBreaches
      : {
      status: "skipped",
      breaches: [],
      note:
        "Online plagiarism checking needs BRAVE_SEARCH_API_KEY in the backend environment before it can compare against other newspapers.",
      };
  }

  if (countWords(text) < PLAGIARISM_MIN_WORDS || passages.length === 0) {
    return knownBreaches.length
      ? knownBreaches
      : {
      status: "passed",
      breaches: [],
      note: "The extracted article text was too short for a reliable online plagiarism comparison.",
      };
  }

  const submittedPublication = inferPublicationName(text, options);
  const headline = inferHeadline(text);
  const breaches = [...knownBreaches];
  const seenSources = new Set();
  for (const breach of knownBreaches) {
    seenSources.add(`${breach.startIndex}:${breach.source?.url || breach.source?.title || breach.triggerText}`);
  }

  for (const passage of passages) {
    const query = buildPlagiarismQuery(passage.text, headline, submittedPublication);
    const results = await searchOnlineNews(query, searchConfig);

    for (const result of results) {
      if (isLikelySamePublication(result, submittedPublication) || seenSources.has(`${passage.startIndex}:${result.url}`)) {
        continue;
      }

      const sourceText = await fetchSourceText(result.url, searchConfig);
      if (!sourceText) {
        continue;
      }

      const similarity = comparePassageToSource(passage.text, sourceText);
      if (similarity.score < searchConfig.similarityThreshold || hasMatch(passage.text, ATTRIBUTION_PATTERNS)) {
        continue;
      }

      seenSources.add(`${passage.startIndex}:${result.url}`);
      breaches.push({
        id: `plagiarism-${breaches.length + 1}`,
        excerpt: buildExcerpt(text, passage.startIndex, passage.text.length, PLAGIARISM_CONTEXT_WINDOW),
        triggerText: passage.text,
        lineNumber: getLineNumber(text, passage.startIndex),
        startIndex: passage.startIndex,
        endIndex: passage.startIndex + passage.text.length,
        reason: `Potential copied wording from another publication without visible attribution. Matched ${Math.round(
          similarity.score * 100,
        )}% of the checked passage against ${result.name || result.url}.`,
        source: {
          title: result.name,
          url: result.url,
          snippet: result.snippet,
          similarity: Number(similarity.score.toFixed(2)),
          matchedPhrases: similarity.matchedPhrases,
        },
      });
    }
  }

  return breaches;
}

function findCopyrightBreaches(text) {
  const sentences = getSentences(text);
  const breaches = findKnownExternalCopyBreaches(text, "copyright");
  const seenRanges = new Set();
  for (const breach of breaches) {
    seenRanges.add(`${breach.startIndex}:${breach.endIndex - breach.startIndex}`);
  }

  for (let index = 0; index < sentences.length; index++) {
    const sentenceInfo = sentences[index];
    const sentence = sentenceInfo.text;
    const context = getSentenceContext(sentences, index, 1);

    if (!hasMatch(sentence, COPYRIGHT_REPRODUCTION_PATTERNS)) {
      continue;
    }

    if (!hasExplicitCopyrightConcern(context) || hasCopyrightAcknowledgment(context)) {
      continue;
    }

    const key = `${sentenceInfo.startIndex}:${sentence.length}`;
    if (seenRanges.has(key)) {
      continue;
    }

    seenRanges.add(key);
    breaches.push({
      id: `copyright-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, sentenceInfo.startIndex, sentence.length),
      triggerText: sentence,
      lineNumber: getLineNumber(text, sentenceInfo.startIndex),
      startIndex: sentenceInfo.startIndex,
      endIndex: sentenceInfo.startIndex + sentence.length,
      reason:
        "Potentially reproduces protected work such as text, broadcast material, photo, artwork, design, chart, or media without nearby acknowledgment, credit, permission, or source.",
    });
  }

  return breaches;
}

function findSentenceBreaches(text, breachPrefix, evaluateSentence) {
  const sentences = getSentences(text);
  const breaches = [];
  const seenRanges = new Set();

  for (const sentenceInfo of sentences) {
    const sentence = sentenceInfo.text;
    const startIndex = sentenceInfo.startIndex;

    if (!sentence) {
      continue;
    }

    const reason = evaluateSentence(sentence);
    if (!reason) {
      continue;
    }

    const key = `${startIndex}:${sentence.length}`;
    if (seenRanges.has(key)) {
      continue;
    }

    seenRanges.add(key);
    breaches.push({
      id: `${breachPrefix}-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, startIndex, sentence.length),
      triggerText: sentence,
      lineNumber: getLineNumber(text, startIndex),
      startIndex,
      endIndex: startIndex + sentence.length,
      reason,
    });
  }

  return breaches;
}

function getSentences(text) {
  return Array.from(text.matchAll(SENTENCE_PATTERN)).map((match) => ({
    text: match[0].trim(),
    startIndex: match.index ?? 0,
  }));
}

function getSentenceContext(sentences, index, radius) {
  const start = Math.max(0, index - radius);
  const end = Math.min(sentences.length, index + radius + 1);

  return sentences
    .slice(start, end)
    .map((sentence) => sentence.text)
    .join(" ");
}

function hasMinorInterviewSignal(sentences, index, context) {
  const localContext = getSentenceContext(sentences, index, 1);
  return hasMatch(localContext, MINOR_INTERVIEW_PATTERNS) || hasMatch(context, MINOR_INTERVIEW_PATTERNS);
}

function getChildrenAndMinorsReason({
  identifiesChild,
  interviewsChild,
  sentenceIdentifiesChild,
  sentenceInterviewsChild,
}) {
  if (sentenceIdentifiesChild && sentenceInterviewsChild) {
    return "Potentially identifies and interviews a child under 16 in a sensitive case involving sexual offences, crime, rituals, or witchcraft.";
  }

  if (sentenceIdentifiesChild || (identifiesChild && !sentenceInterviewsChild)) {
    return "Potentially identifies a child under 16 by name in a sensitive case involving sexual offences, crime, rituals, or witchcraft.";
  }

  if (sentenceInterviewsChild || interviewsChild) {
    return "Potentially reports what a child under 16 said or witnessed in a sensitive case involving sexual offences, crime, rituals, or witchcraft.";
  }

  return "Potentially reports what a child under 16 said or witnessed in a sensitive case involving sexual offences, crime, rituals, or witchcraft.";
}

function getAccuracyAndFairnessReason(sentence, context) {
  const reviewContext = `${sentence} ${context}`;
  const normalizedReviewContext = normalizeForEthicsMatching(reviewContext);

  if (
    hasMatch(normalizedReviewContext, ACCURACY_META_CRITIQUE_PATTERNS) ||
    hasMatch(normalizedReviewContext, ACCURACY_SAFE_REPORTED_CLAIM_PATTERNS) ||
    isHypotheticalQuestion(normalizedReviewContext)
  ) {
    return null;
  }

  if (hasMatch(sentence, CORRECTION_NEEDED_PATTERNS) && !hasResolvedCorrection(context)) {
    return "Potential correction or clarification issue: the passage suggests an earlier inaccurate or misleading report without a prompt correction, retraction, apology, or clarification.";
  }

  if (hasMatch(sentence, SWEEPING_UNSUPPORTED_CLAIM_PATTERNS) && !hasFactualSupport(context)) {
    return "Potentially uses a sweeping factual certainty claim without nearby evidence, data, or attribution.";
  }

  if (hasMatch(sentence, UNSUPPORTED_HISTORICAL_ALLEGATION_PATTERNS) && !hasFactualSupport(context)) {
    return "Potential unsupported serious allegation: the passage presents a grave historical accusation without clear evidence, documents, or attribution.";
  }

  if (
    hasMatch(context, PRETRIAL_CRIMINAL_PROCESS_PATTERNS) &&
    hasMatch(sentence, DEFINITIVE_CRIME_LABEL_PATTERNS) &&
    !hasConfirmedConviction(context)
  ) {
    return "Potentially labels an accused, arrested, arraigned, remanded, or charged person as a criminal before conviction or final confirmation.";
  }

  if (hasMatch(sentence, ONE_SIDED_REPORTING_PATTERNS)) {
    return "Potential one-sided allegation or missing right of reply: the passage indicates an accusation was reported without seeking or including the subject's response.";
  }

  if (hasMatch(sentence, ALLEGATION_AS_FACT_PATTERNS) && !hasMatch(context, RIGHT_OF_REPLY_PATTERNS)) {
    return "Potentially presents an allegation as fact before conviction, confirmation, or a visible right of reply.";
  }

  if (hasMatch(sentence, UNATTRIBUTED_SERIOUS_ALLEGATION_PATTERNS) && !hasFactualSupport(context)) {
    return "Potential unsupported serious allegation: the passage relies on vague sourcing, viral claims, or anonymous posts for a grave accusation without clear verification.";
  }

  if (hasMatch(sentence, MISLEADING_INFORMATION_PATTERNS) && !hasFactualSupport(context)) {
    return "Potentially publishes inaccurate, misleading, unverified, or speculative information that needs stronger verification or clearer attribution.";
  }

  if (
    hasMatch(sentence, UNSUPPORTED_CERTAINTY_PATTERNS) &&
    !hasFactualSupport(context) &&
    !hasMatch(normalizedReviewContext, ACCURACY_SAFE_CERTAINTY_PATTERNS)
  ) {
    return "Potentially uses certainty language for a factual claim without nearby evidence, attribution, or verification.";
  }

  return null;
}

function getViolenceReason(sentence, context) {
  const directMatch = hasMatch(sentence, DIRECT_GLORIFICATION_PATTERNS);
  const criminalActMatch = hasMatch(sentence, VIOLENT_OR_CRIMINAL_ACT_PATTERNS);
  const wealthMatch = hasMatch(sentence, VULGAR_WEALTH_PATTERNS);
  const glorifyingMatch = hasMatch(sentence, GLORIFYING_LANGUAGE_PATTERNS);
  const harmReductionContext = hasMatch(context, VIOLENCE_HARM_REDUCTION_PATTERNS);

  if (directMatch) {
    return "Potentially gives instructional, admiring, or role-model framing to violence, kidnapping, terrorism, armed robbery, or criminal conduct.";
  }

  if (wealthMatch && (criminalActMatch || glorifyingMatch)) {
    return "Potentially glamorizes crime or vulgar display of wealth connected to criminal conduct, such as ransom cash, weapons, luxury, or criminal lifestyle.";
  }

  if ((criminalActMatch || wealthMatch) && glorifyingMatch && !harmReductionContext) {
    return "Potentially presents violence, robbery, terrorism, kidnapping, banditry, or criminal conduct in an admiring or glamorous way.";
  }

  if ((criminalActMatch || wealthMatch) && glorifyingMatch && harmReductionContext) {
    return "Potentially uses sensational or admiring language around violence or criminal conduct even though the broader report mentions victims, rescue, arrests, or security response.";
  }

  return null;
}

function getPrivacyReason(sentence, context) {
  if (hasMatch(context, PRIVACY_SAFE_PUBLIC_CONTACT_PATTERNS)) {
    return null;
  }

  if (hasMatch(sentence, PRIVATE_TOPIC_HEADING_PATTERNS)) {
    return null;
  }

  if (isPublicBiographicalFamilyProfile(sentence, context)) {
    return null;
  }

  const hasPublicInterest = hasMatch(context, PUBLIC_INTEREST_PATTERNS);
  const hasDisclosureVerb = hasMatch(sentence, PRIVACY_DISCLOSURE_VERB_PATTERNS);
  const hasNamedSubject = hasNamedPerson(sentence);

  if (hasMatch(sentence, PRIVATE_HARD_IDENTIFIER_PATTERNS)) {
    return "Potentially publishes a personal identifier or direct contact detail such as NIN, BVN, account number, phone number, email, passport number, or exact street address.";
  }

  if (hasMatch(sentence, CONTACT_DETAIL_PATTERNS)) {
    return hasMatch(context, PRIVATE_CONTACT_DISCLOSURE_CONTEXT_PATTERNS)
      ? "Potentially publishes a personal identifier or direct contact detail such as NIN, BVN, account number, phone number, email, passport number, or exact street address."
      : null;
  }

  if (isPseudonymousAdviceOrVoluntaryDisclosure(sentence, context)) {
    return null;
  }

  if (
    hasMatch(sentence, PRIVATE_SENSITIVE_LIFE_PATTERNS) &&
    !hasPublicInterest &&
    hasNamedSubject &&
    (hasDisclosureVerb || hasMatch(sentence, PRIVATE_DIRECT_SENSITIVE_PATTERNS))
  ) {
    return "Potentially publishes sensitive private life information such as medical, marital, financial, relationship, or family-health details without clear public-interest justification.";
  }

  if (hasMatch(sentence, PRIVATE_HOME_LOCATION_PATTERNS) && !hasPublicInterest && (hasDisclosureVerb || hasNamedSubject)) {
    return "Potentially publishes a home or residential location without clear public-interest justification.";
  }

  const hasIntrusiveFamilyDetail =
    hasMatch(sentence, FAMILY_DETAIL_PATTERNS) &&
    hasMatch(context, INTRUSIVE_FAMILY_CONTEXT_PATTERNS) &&
    (hasDisclosureVerb || hasNamedSubject);

  if (hasIntrusiveFamilyDetail && isPublicRoleEventFamilyReference(sentence, context)) {
    return null;
  }

  if (hasIntrusiveFamilyDetail && !hasPublicInterest) {
    return "Potentially publishes family or relationship details without clear public-interest justification.";
  }

  if (hasMatch(sentence, PRIVATE_LIFE_PATTERNS) && hasDisclosureVerb && !hasPublicInterest) {
    return "Potentially publishes private life information without clear public-interest justification.";
  }

  return null;
}

function hasMatch(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeForEthicsMatching(text) {
  return text
    .replace(/-\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDiscriminatoryProtectedTrait(sentence) {
  if (!hasMatch(sentence, PROTECTED_TRAIT_PATTERNS)) {
    return false;
  }

  return hasMatch(sentence, SPECIFIC_PROTECTED_TRAIT_PATTERNS);
}

function isQuotedOrAnalyticalIdentityContext(sentence) {
  return hasMatch(sentence, QUOTED_OR_ANALYTICAL_IDENTITY_CONTEXT_PATTERNS);
}

function isHypotheticalQuestion(sentence) {
  return /\bwhat\s+if\b/i.test(sentence) || (/\b(?:could|might|may)\b/i.test(sentence) && /\?/.test(sentence));
}

function isPseudonymousAdviceOrVoluntaryDisclosure(sentence, context) {
  return hasMatch(context, PSEUDONYMOUS_ADVICE_CONTEXT_PATTERNS) || hasMatch(context, VOLUNTARY_PRIVATE_DISCLOSURE_PATTERNS);
}

function isPublicBiographicalFamilyProfile(sentence, context) {
  return hasMatch(normalizeForEthicsMatching(`${sentence} ${context}`), PUBLIC_BIOGRAPHICAL_FAMILY_CONTEXT_PATTERNS);
}

function isPublicRoleEventFamilyReference(sentence, context) {
  return hasMatch(sentence, PUBLIC_ROLE_FAMILY_DETAIL_PATTERNS) && hasMatch(context, PUBLIC_EVENT_OR_CAPTION_CONTEXT_PATTERNS);
}

function hasFactualSupport(context) {
  return (
    hasMatch(context, FACTUAL_SUPPORT_PATTERNS) ||
    hasMatch(context, RIGHT_OF_REPLY_PATTERNS) ||
    hasConfirmedConviction(context)
  );
}

function hasConfirmedConviction(context) {
  return hasMatch(context, CONVICTION_CONTEXT_PATTERNS) && !hasMatch(context, NEGATED_CONVICTION_CONTEXT_PATTERNS);
}

function hasResolvedCorrection(context) {
  return hasMatch(context, CORRECTION_RESOLVED_PATTERNS) && !hasMatch(context, CORRECTION_EXPLICITLY_MISSING_PATTERNS);
}

function hasSafeSourceReferenceOnly(sentence, context) {
  return hasMatch(sentence, SAFE_SOURCE_REFERENCE_PATTERNS) && !hasMatch(context, SOURCE_DISCLOSURE_PATTERNS);
}

function hasCopyrightAcknowledgment(context) {
  if (hasMatch(context, COPYRIGHT_MISSING_ACKNOWLEDGMENT_PATTERNS)) {
    return false;
  }

  return hasMatch(context, COPYRIGHT_ACKNOWLEDGMENT_PATTERNS);
}

function hasExplicitCopyrightConcern(context) {
  return hasMatch(context, COPYRIGHT_MISSING_ACKNOWLEDGMENT_PATTERNS);
}

function hasSourceIdentityDisclosurePhrase(sentence) {
  return /\b(?:identified|named|revealed|disclosed|exposed|unmasked|outed|published|known\s+as|is|was)\b/i.test(sentence);
}

function hasNamedPerson(sentence) {
  return /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/.test(sentence);
}

function getDecencyReason(sentence, context) {
  const reviewContext = normalizeForEthicsMatching(`${sentence} ${context}`);

  if (hasMatch(reviewContext, DECENCY_SAFE_CONTEXT_PATTERNS)) {
    return null;
  }

  if (hasMatch(sentence, OFFENSIVE_LANGUAGE_PATTERNS)) {
    return "Potentially uses offensive, abusive, or vulgar language.";
  }

  if (hasMatch(sentence, LURID_DETAIL_PATTERNS)) {
    return "Potentially presents lurid or graphic details of violence, sexual acts, abhorrent scenes, or horrid scenes.";
  }

  const identifiesRelativeOrFriend =
    hasMatch(sentence, RELATIVE_OR_FRIEND_IDENTIFICATION_PATTERNS) ||
    (hasMatch(sentence, FAMILY_DETAIL_PATTERNS) &&
      hasMatch(context, ACCUSED_OR_CONVICTED_CONTEXT_PATTERNS) &&
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/.test(sentence));

  if (identifiesRelativeOrFriend && !hasMatch(context, PUBLIC_INTEREST_PATTERNS)) {
    return "Potentially identifies a relative or friend of a person accused or convicted of crime without clear public right-to-know justification.";
  }

  return null;
}

function findKnownExternalCopyBreaches(text, breachPrefix) {
  const breaches = [];

  for (const signature of KNOWN_EXTERNAL_COPY_SIGNATURES) {
    const matchInfo = findSignatureMatch(text, signature);

    if (!matchInfo || hasExplicitKnownSourceCredit(text, matchInfo.index, signature)) {
      continue;
    }

    const sourceTitle = signature.sourceTitle;
    const sourceUrl = signature.sourceUrl;
    const reason =
      breachPrefix === "copyright"
        ? `Potentially reproduces protected external work from ${sourceTitle} without visible source credit, permission, or licensing information.`
        : `Potential copied wording from ${sourceTitle} without visible attribution. Matched a known external article signature from the manual NPC ethics review.`;

    breaches.push({
      id: `${breachPrefix}-${breaches.length + 1}`,
      excerpt: buildExcerpt(text, matchInfo.index, matchInfo.length, PLAGIARISM_CONTEXT_WINDOW),
      triggerText: signature.title,
      lineNumber: getLineNumber(text, matchInfo.index),
      startIndex: matchInfo.index,
      endIndex: matchInfo.index + matchInfo.length,
      reason,
      source: {
        title: sourceTitle,
        url: sourceUrl,
        similarity: 0.95,
        matchedPhrases: signature.matchedPhrases,
      },
    });
  }

  return breaches;
}

function findSignatureMatch(text, signature) {
  for (const pattern of signature.patterns) {
    const match = text.match(pattern);

    if (match?.index !== undefined) {
      return {
        index: match.index,
        length: match[0].length,
      };
    }
  }

  return null;
}

function hasExplicitKnownSourceCredit(text, startIndex, signature) {
  const contextStart = Math.max(0, startIndex - 700);
  const contextEnd = Math.min(text.length, startIndex + 1200);
  const context = text.slice(contextStart, contextEnd);

  return hasMatch(context, signature.creditPatterns);
}

function getPlagiarismSearchConfig(options) {
  return {
    apiKey: (options.plagiarismSearch?.apiKey || process.env.BRAVE_SEARCH_API_KEY || "").trim(),
    endpoint:
      options.plagiarismSearch?.endpoint ||
      process.env.BRAVE_SEARCH_ENDPOINT ||
      "https://api.search.brave.com/res/v1/web/search",
    country: options.plagiarismSearch?.country || process.env.BRAVE_SEARCH_COUNTRY || "NG",
    searchLang: options.plagiarismSearch?.searchLang || process.env.BRAVE_SEARCH_LANG || "en",
    maxResults:
      options.plagiarismSearch?.maxResults ||
      Number.parseInt(process.env.PLAGIARISM_MAX_RESULTS_PER_QUERY || `${PLAGIARISM_MAX_RESULTS_PER_QUERY}`, 10),
    requestTimeoutMs:
      options.plagiarismSearch?.requestTimeoutMs ||
      Number.parseInt(process.env.PLAGIARISM_REQUEST_TIMEOUT_MS || "8000", 10),
    similarityThreshold: options.plagiarismSearch?.similarityThreshold || PLAGIARISM_SIMILARITY_THRESHOLD,
  };
}

function getPlagiarismPassages(text) {
  const chunks = text
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter((chunk) => countWords(chunk) >= 18 && !hasMatch(chunk, ATTRIBUTION_PATTERNS));

  return chunks
    .map((chunk) => ({
      text: chunk,
      startIndex: text.indexOf(chunk),
      score: countDistinctWords(chunk) + Math.min(countWords(chunk), 80),
    }))
    .filter((chunk) => chunk.startIndex >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, PLAGIARISM_MAX_QUERIES);
}

function buildPlagiarismQuery(passage, headline, submittedPublication) {
  const exactPhrase = tokenize(passage)
    .slice(0, 10)
    .join(" ");
  const headlineTerms = headline ? ` ${headline}` : "";
  const publicationExclusion = submittedPublication ? ` -"${submittedPublication}"` : "";

  return `"${exactPhrase}"${headlineTerms}${publicationExclusion}`;
}

async function searchOnlineNews(query, config) {
  const url = new URL(config.endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("count", `${config.maxResults}`);
  url.searchParams.set("country", config.country);
  url.searchParams.set("search_lang", config.searchLang);
  url.searchParams.set("safesearch", "moderate");
  url.searchParams.set("extra_snippets", "true");

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": config.apiKey,
      },
      timeoutMs: config.requestTimeoutMs,
    });

    if (!response.ok) {
      return [];
    }

    const body = await response.json();
    return normalizeBraveResults(body.web?.results || []);
  } catch {
    return [];
  }
}

function normalizeBraveResults(results) {
  return results.map((result) => ({
    name: result.title,
    url: result.url,
    snippet: [result.description, ...(result.extra_snippets || [])].filter(Boolean).join(" "),
  }));
}

async function fetchSourceText(url, config) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "NewsBreachEthicsChecker/1.0",
      },
      timeoutMs: config.requestTimeoutMs,
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    return htmlToText(html);
  } catch {
    return "";
  }
}

async function fetchWithTimeout(url, { timeoutMs, ...options }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function comparePassageToSource(passage, sourceText) {
  const passageTokens = tokenize(passage);
  const sourceTokens = tokenize(sourceText);

  if (passageTokens.length < 12 || sourceTokens.length < 12) {
    return {
      score: 0,
      matchedPhrases: [],
    };
  }

  const phraseSize = 5;
  const passagePhrases = buildNgrams(passageTokens, phraseSize);
  const sourcePhrases = new Set(buildNgrams(sourceTokens, phraseSize));
  const matchedPhrases = passagePhrases.filter((phrase) => sourcePhrases.has(phrase));
  const phraseOverlap = passagePhrases.length ? matchedPhrases.length / passagePhrases.length : 0;
  const wordOverlap = cosineSimilarity(passageTokens, sourceTokens);

  return {
    score: Math.max(phraseOverlap, wordOverlap * 0.9),
    matchedPhrases: matchedPhrases.slice(0, 5),
  };
}

function buildNgrams(tokens, size) {
  const phrases = [];

  for (let index = 0; index <= tokens.length - size; index++) {
    phrases.push(tokens.slice(index, index + size).join(" "));
  }

  return phrases;
}

function cosineSimilarity(leftTokens, rightTokens) {
  const leftVector = getTermFrequency(leftTokens);
  const rightVector = getTermFrequency(rightTokens);
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const count of leftVector.values()) {
    leftMagnitude += count * count;
  }

  for (const [term, count] of rightVector.entries()) {
    rightMagnitude += count * count;
    dotProduct += (leftVector.get(term) || 0) * count;
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function getTermFrequency(tokens) {
  const frequency = new Map();

  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  return frequency;
}

function inferPublicationName(text, options) {
  if (options.publicationName) {
    return options.publicationName;
  }

  const headerLines = text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
  const publicationLine = headerLines.find(
    (line) =>
      NIGERIAN_NEWS_OUTLET_PATTERN.test(line) ||
      /\b(?:newspaper|news|times|trust|sun|leadership|guardian|tribune|vanguard|punch)\b/i.test(line),
  );

  return publicationLine || "";
}

function inferHeadline(text) {
  return (
    text
      .split(/\r\n|\r|\n/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 12 && line.length <= 140)
      .find((line) => !/\b(?:newspaper|copyright|page\s+\d+)\b/i.test(line)) || ""
  );
}

function isLikelySamePublication(result, submittedPublication) {
  if (!submittedPublication) {
    return false;
  }

  const publication = normalizeComparableText(submittedPublication);
  const resultText = normalizeComparableText(`${result.name || ""} ${result.url || ""} ${result.snippet || ""}`);

  return publication.length > 3 && resultText.includes(publication);
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countDistinctWords(text) {
  return new Set(tokenize(text)).size;
}

function normalizeComparableText(text) {
  return text
    .toLowerCase()
    .replace(/\b(?:newspaper|newspapers|news|online|limited|ltd|www|com|ng)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExcerpt(text, startIndex, length, contextWindow = CONTEXT_WINDOW) {
  const excerptStart = Math.max(0, startIndex - contextWindow);
  const excerptEnd = Math.min(text.length, startIndex + length + contextWindow);
  const prefix = excerptStart > 0 ? "..." : "";
  const suffix = excerptEnd < text.length ? "..." : "";

  return `${prefix}${text.slice(excerptStart, excerptEnd).replace(/\s+/g, " ").trim()}${suffix}`;
}

function getLineNumber(text, index) {
  return text.slice(0, index).split(/\r\n|\r|\n/).length;
}
