const MEDIA_TITLE_PATTERNS = [/\bMedia\b/i, /\bJournalist\b/i];

export async function detectMediaStories(text, options = {}) {
  const reviewText = text || "";
  const documentContext = buildDocumentContext(
    reviewText,
    options.documentLayout,
  );
  const topics = Array.isArray(documentContext.layoutTopics)
    ? documentContext.layoutTopics
    : [];

  const storyHits = topics
    .map((topic) => ({
      ...topic,
      text: topic.text || "",
    }))
    .filter((topic) =>
      MEDIA_TITLE_PATTERNS.some((pattern) => pattern.test(topic.text)),
    )
    .map((topic, index) => ({
      id: `media-story-${index + 1}`,
      headline: topic.text,
      topic: topic.text,
      pageNumber: topic.pageNumber,
      lineNumber: topic.lineNumber || null,
      fontSize: topic.fontSize,
    }));

  return {
    analysisVersion: "2026-08-media-stories-v1",
    storyStats: {
      totalStories: storyHits.length,
    },
    totalStories: storyHits.length,
    stories: storyHits,
  };
}

function buildDocumentContext(text, documentLayout = {}) {
  const lines = [];
  const lineMatches = Array.from(
    text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g),
  ).filter((match) => match[0]);
  const layoutMatcher = createLayoutLineMatcher(documentLayout.lines);
  let pageNumber = null;
  let pageStartLineNumber = 1;
  let cursor = 0;

  for (let index = 0; index < lineMatches.length; index++) {
    const rawLine = lineMatches[index][0];
    const lineText = rawLine.replace(/\r\n|\r|\n/g, "");
    const trimmed = lineText.trim();
    const pageMatch = trimmed.match(/^Page\s+(\d+)\b/i);
    const startIndex = cursor;
    const endIndex = cursor + rawLine.length;

    if (pageMatch) {
      pageNumber = Number.parseInt(pageMatch[1], 10);
      pageStartLineNumber = index + 1;
    }

    const layoutLine = findMatchingLayoutLine(
      layoutMatcher,
      pageNumber,
      trimmed,
    );
    const lineInfo = {
      text: trimmed,
      startIndex,
      endIndex,
      documentLineNumber: index + 1,
      lineNumber: pageNumber ? index + 1 - pageStartLineNumber + 1 : index + 1,
      pageNumber,
      x: layoutLine?.x,
      right: layoutLine?.right,
      y: layoutLine?.y,
      fontSize: layoutLine?.fontSize,
    };

    lines.push(lineInfo);
    cursor = endIndex;
  }

  return {
    text,
    lines,
    layoutTopics: normalizeLayoutTopics(documentLayout.topics),
  };
}

function createLayoutLineMatcher(layoutLines = []) {
  const byPage = new Map();

  for (const line of layoutLines) {
    if (!line?.text || !Number.isFinite(line.pageNumber)) {
      continue;
    }

    const pageLines = byPage.get(line.pageNumber) || [];
    pageLines.push({
      ...line,
      comparableText: normalizeLayoutComparableText(line.text),
    });
    byPage.set(line.pageNumber, pageLines);
  }

  for (const pageLines of byPage.values()) {
    pageLines.sort((left, right) => right.y - left.y || left.x - right.x);
  }

  return {
    byPage,
    cursors: new Map(),
  };
}

function findMatchingLayoutLine(layoutMatcher, pageNumber, text) {
  if (!layoutMatcher || !Number.isFinite(pageNumber) || !text) {
    return null;
  }

  const pageLines = layoutMatcher.byPage.get(pageNumber) || [];
  const comparableText = normalizeLayoutComparableText(text);

  if (comparableText.length < 4 || !pageLines.length) {
    return null;
  }

  const cursor = layoutMatcher.cursors.get(pageNumber) || 0;
  const matchedIndex =
    findLayoutLineIndex(pageLines, comparableText, cursor) ??
    findLayoutLineIndex(pageLines, comparableText, 0);

  if (!Number.isFinite(matchedIndex)) {
    return null;
  }

  if (matchedIndex >= cursor) {
    layoutMatcher.cursors.set(pageNumber, matchedIndex + 1);
  }

  return pageLines[matchedIndex];
}

function findLayoutLineIndex(pageLines, comparableText, startIndex) {
  let bestIndex = null;
  let bestScore = 0;

  for (let index = startIndex; index < pageLines.length; index++) {
    const candidateText = pageLines[index].comparableText;
    const score = getLayoutTextMatchScore(comparableText, candidateText);

    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }

    if (score === 1) {
      break;
    }
  }

  return bestScore >= 0.78 ? bestIndex : null;
}

function getLayoutTextMatchScore(leftText, rightText) {
  if (!leftText || !rightText) {
    return 0;
  }

  if (leftText === rightText) {
    return 1;
  }

  if (leftText.includes(rightText) || rightText.includes(leftText)) {
    return (
      Math.min(leftText.length, rightText.length) /
      Math.max(leftText.length, rightText.length)
    );
  }

  return 0;
}

function normalizeLayoutTopics(topics = []) {
  return topics
    .filter((topic) => topic?.text && Number.isFinite(topic.pageNumber))
    .map((topic) => ({
      ...topic,
      text: topic.text.trim(),
    }));
}

function normalizeLayoutComparableText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
