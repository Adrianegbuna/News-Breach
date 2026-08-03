import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import Tesseract from "tesseract.js";

const TEXT_MIME_TYPES = new Set([
  "application/csv",
  "application/json",
  "application/xml",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
  "text/xml",
]);

const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const PDF_MIME_TYPES = new Set(["application/pdf"]);

const IMAGE_MIME_TYPES = new Set([
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp",
]);

const TEXT_EXTENSIONS = new Set([".csv", ".json", ".md", ".txt", ".xml", ".html", ".htm"]);
const DOCX_EXTENSIONS = new Set([".docx"]);
const PDF_EXTENSIONS = new Set([".pdf"]);
const IMAGE_EXTENSIONS = new Set([".bmp", ".gif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"]);
const OCR_LANGUAGE = process.env.OCR_LANGUAGE || "eng";
const MAX_PDF_OCR_PAGES = Number.parseInt(process.env.MAX_PDF_OCR_PAGES || "10", 10);
const MIN_EXTRACTED_TEXT_LENGTH = 30;
const PDF_TOPIC_MIN_FONT_SIZE = 13.5;
const PDF_TOPIC_MAX_LINES = 8;

export async function extractTextFromUpload(file, options = {}) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mimeType = (file.mimetype || "").toLowerCase();

  if (TEXT_MIME_TYPES.has(mimeType) || TEXT_EXTENSIONS.has(extension)) {
    return extractPlainText(file);
  }

  if (DOCX_MIME_TYPES.has(mimeType) || DOCX_EXTENSIONS.has(extension)) {
    return extractDocxText(file);
  }

  if (PDF_MIME_TYPES.has(mimeType) || PDF_EXTENSIONS.has(extension)) {
    return extractPdfText(file, options);
  }

  if (IMAGE_MIME_TYPES.has(mimeType) || IMAGE_EXTENSIONS.has(extension)) {
    return extractImageText(file, options);
  }

  return {
    supported: false,
    text: "",
    strategy: "unsupported",
    message:
      "This file was uploaded and stored, but automatic extraction currently supports TXT, CSV, JSON, Markdown, XML, HTML, DOCX, PDF, and common image files.",
  };
}

function extractPlainText(file) {
  try {
    const text = fs.readFileSync(file.path, "utf8");

    return {
      supported: true,
      text,
      strategy: "plain-text",
      message: "Text extracted successfully.",
    };
  } catch {
    return {
      supported: false,
      text: "",
      strategy: "plain-text",
      message: "The file was uploaded, but its text could not be read for ethics analysis.",
    };
  }
}

async function extractDocxText(file) {
  try {
    const result = await mammoth.extractRawText({ path: file.path });
    const text = result.value || "";

    return {
      supported: true,
      text,
      strategy: "docx",
      message: text.trim()
        ? "DOCX text extracted successfully."
        : "The DOCX was read, but no text was found for ethics analysis.",
    };
  } catch {
    return {
      supported: false,
      text: "",
      strategy: "docx",
      message: "The DOCX was uploaded, but its text could not be extracted.",
    };
  }
}

async function extractPdfText(file, options) {
  const data = fs.readFileSync(file.path);
  const parser = new PDFParse({ data });
  let documentLayout = {};

  try {
    documentLayout = await extractPdfDocumentLayout(data);
  } catch {
    documentLayout = {};
  }

  try {
    const textResult = await parser.getText();
    const selectableText = normalizePageText(textResult.pages);

    if (selectableText.trim().length >= MIN_EXTRACTED_TEXT_LENGTH) {
      return {
        supported: true,
        text: selectableText,
        strategy: "pdf-text",
        documentLayout,
        message: "PDF text extracted successfully.",
      };
    }

    const ocrText = await ocrPdfPages(parser, options);

    return {
      supported: true,
      text: ocrText,
      strategy: "pdf-ocr",
      message: ocrText.trim()
        ? "PDF OCR completed successfully."
        : "PDF OCR completed, but no readable text was detected.",
    };
  } catch {
    return {
      supported: false,
      text: "",
      strategy: "pdf",
      message: "The PDF was uploaded, but its text could not be extracted or OCR processed.",
    };
  } finally {
    await parser.destroy();
  }
}

async function extractPdfDocumentLayout(data) {
  const loadingTask = getDocument({
    data: new Uint8Array(data),
    disableWorker: true,
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;
  const lines = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent({
        disableNormalization: false,
      });

      lines.push(...groupPdfTextItemsIntoLines(textContent.items, pageNumber));
    }
  } finally {
    await document.destroy();
  }

  return {
    lines: lines.map(({ fontNames, ...line }) => line),
    topics: buildPdfTopicCandidates(lines),
  };
}

function groupPdfTextItemsIntoLines(items = [], pageNumber) {
  const words = items
    .filter((item) => item.str?.trim())
    .map((item) => ({
      text: normalizeInlineText(item.str),
      x: item.transform[4],
      y: item.transform[5],
      width: item.width || 0,
      fontSize: getPdfTextItemFontSize(item),
      fontName: item.fontName || "",
    }))
    .filter((item) => item.text);
  const rows = [];

  for (const word of words.sort((left, right) => right.y - left.y || left.x - right.x)) {
    const row = rows.find((candidate) => Math.abs(candidate.y - word.y) <= getRowTolerance(candidate, word));

    if (row) {
      row.items.push(word);
      row.y = getAverage(row.items.map((item) => item.y));
    } else {
      rows.push({
        y: word.y,
        items: [word],
      });
    }
  }

  return rows.flatMap((row) => splitPdfRowIntoLines(row, pageNumber)).sort((left, right) => {
    if (left.pageNumber !== right.pageNumber) {
      return left.pageNumber - right.pageNumber;
    }

    return right.y - left.y || left.x - right.x;
  });
}

function splitPdfRowIntoLines(row, pageNumber) {
  const items = row.items.sort((left, right) => left.x - right.x);
  const rowFontSize = getMedian(items.map((item) => item.fontSize));
  const splitGap = Math.max(14, rowFontSize * 1.35);
  const segments = [];
  let segment = [];
  let previousItem = null;

  for (const item of items) {
    const gap = previousItem ? item.x - (previousItem.x + previousItem.width) : 0;
    const hasFontSizeJump = previousItem && Math.abs(item.fontSize - previousItem.fontSize) >= 8 && gap > 2;

    if (previousItem && (gap > splitGap || hasFontSizeJump)) {
      segments.push(segment);
      segment = [];
    }

    segment.push(item);
    previousItem = item;
  }

  if (segment.length) {
    segments.push(segment);
  }

  return segments.map((segmentItems) => buildPdfLine(segmentItems, row.y, pageNumber));
}

function buildPdfLine(items, y, pageNumber) {
  const x = Math.min(...items.map((item) => item.x));
  const right = Math.max(...items.map((item) => item.x + item.width));
  const fontSizes = items.map((item) => item.fontSize);

  return {
    pageNumber,
    text: normalizeInlineText(items.map((item) => item.text).join(" ")),
    x,
    right,
    y,
    fontSize: getMedian(fontSizes),
    maxFontSize: Math.max(...fontSizes),
    fontNames: [...new Set(items.map((item) => item.fontName).filter(Boolean))],
  };
}

function buildPdfTopicCandidates(lines) {
  const candidateLines = lines.filter(isPdfTopicLine);
  const usedLines = new Set();
  const topics = [];

  for (let index = 0; index < candidateLines.length; index++) {
    const line = candidateLines[index];

    if (usedLines.has(line)) {
      continue;
    }

    const block = [line];
    usedLines.add(line);
    let previousLine = line;

    while (block.length < PDF_TOPIC_MAX_LINES) {
      const nextLine = candidateLines.find(
        (candidate, candidateIndex) =>
          candidateIndex > index &&
          !usedLines.has(candidate) &&
          candidate.pageNumber === previousLine.pageNumber &&
          candidate.y < previousLine.y &&
          previousLine.y - candidate.y <= Math.max(46, Math.max(previousLine.fontSize, candidate.fontSize) * 1.8) &&
          arePdfLinesAligned(previousLine, candidate),
      );

      if (!nextLine) {
        break;
      }

      block.push(nextLine);
      usedLines.add(nextLine);
      previousLine = nextLine;
    }

    const topic = buildPdfTopic(block);

    if (countWords(topic.text) >= 2) {
      topics.push(topic);
    }
  }

  return topics;
}

function buildPdfTopic(lines) {
  return {
    pageNumber: lines[0].pageNumber,
    text: lines.map((line) => line.text).join("\n"),
    x: Math.min(...lines.map((line) => line.x)),
    right: Math.max(...lines.map((line) => line.right)),
    yTop: Math.max(...lines.map((line) => line.y)),
    yBottom: Math.min(...lines.map((line) => line.y)),
    fontSize: Math.max(...lines.map((line) => line.fontSize)),
  };
}

function isPdfTopicLine(line) {
  const text = line.text;

  if (line.fontSize < PDF_TOPIC_MIN_FONT_SIZE || !text || countWords(text) > 24) {
    return false;
  }

  if (isNonStoryPdfLine(text) || /[.;]$/.test(text)) {
    return false;
  }

  return countWords(text) >= 2 || (line.fontSize >= 16 && /[A-Za-z]{4}/.test(text));
}

function isNonStoryPdfLine(text) {
  return (
    /^(?:Page\s*\d+|PEOPLES\s+DAILY|N\s*E\s*W\s*S|W\s*O\s*R\s*L\s*D|CONTENTS|News|Op\.Ed|Politics|Stock Watch|Business|Metro|World Analysis|Africa News|World News|Digest|Feature|Sports|Back Page)$/i.test(
      text,
    ) ||
    /(?:www\.|@|Vol\.|^\s*N\d+\b|Phones?\s+for\s+News|advert|email|international_)/i.test(text) ||
    /^(?:by|from|with|reported\s+by|compiled\s+by|edited\s+by)\b/i.test(text) ||
    /\b(?:photo|pix|picture)\s*:/i.test(text) ||
    /^L\s*[-–]/i.test(text)
  );
}

function arePdfLinesAligned(previousLine, nextLine) {
  const overlap = Math.min(previousLine.right, nextLine.right) - Math.max(previousLine.x, nextLine.x);
  const previousCenter = (previousLine.x + previousLine.right) / 2;
  const nextCenter = (nextLine.x + nextLine.right) / 2;

  return overlap >= -18 || Math.abs(previousLine.x - nextLine.x) <= 42 || Math.abs(previousCenter - nextCenter) <= 80;
}

function getPdfTextItemFontSize(item) {
  return Math.hypot(item.transform[2], item.transform[3]) || item.height || 0;
}

function getRowTolerance(row, word) {
  const rowFontSize = getMedian(row.items.map((item) => item.fontSize));

  return Math.max(1.6, Math.min(rowFontSize, word.fontSize) * 0.3);
}

function getMedian(values) {
  const sortedValues = values.filter(Number.isFinite).sort((left, right) => left - right);

  if (!sortedValues.length) {
    return 0;
  }

  return sortedValues[Math.floor((sortedValues.length - 1) / 2)];
}

function getAverage(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function extractImageText(file, options) {
  let worker;

  try {
    worker = await createOcrWorker(options);
    const result = await worker.recognize(file.path);
    const text = result.data?.text || "";

    return {
      supported: true,
      text,
      strategy: "image-ocr",
      message: text.trim()
        ? "Image OCR completed successfully."
        : "Image OCR completed, but no readable text was detected.",
    };
  } catch {
    return {
      supported: false,
      text: "",
      strategy: "image-ocr",
      message: "The image was uploaded, but OCR could not read its text.",
    };
  } finally {
    await worker?.terminate();
  }
}

async function ocrPdfPages(parser, options) {
  const screenshotResult = await parser.getScreenshot({
    first: Number.isFinite(MAX_PDF_OCR_PAGES) ? MAX_PDF_OCR_PAGES : 10,
    imageBuffer: true,
    desiredWidth: 1800,
  });
  const worker = await createOcrWorker(options);
  const pageTexts = [];

  try {
    for (const page of screenshotResult.pages) {
      const result = await worker.recognize(Buffer.from(page.data));
      pageTexts.push(`Page ${page.pageNumber}\n${result.data?.text || ""}`.trim());
    }
  } finally {
    await worker.terminate();
  }

  return pageTexts.join("\n\n");
}

async function createOcrWorker(options) {
  const cachePath = options.ocrCacheDir;
  const langPath = options.ocrLangDir;

  if (cachePath) {
    fs.mkdirSync(cachePath, { recursive: true });
  }

  return Tesseract.createWorker(OCR_LANGUAGE, undefined, {
    cachePath,
    gzip: true,
    langPath,
    logger: () => {},
  });
}

function normalizePageText(pages = []) {
  return pages
    .map((page) => `Page ${page.num}\n${page.text || ""}`.trim())
    .filter(Boolean)
    .join("\n\n");
}

function normalizeInlineText(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function countWords(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
