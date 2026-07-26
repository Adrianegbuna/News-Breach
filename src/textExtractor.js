import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
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

  try {
    const textResult = await parser.getText();
    const selectableText = normalizePageText(textResult.pages);

    if (selectableText.trim().length >= MIN_EXTRACTED_TEXT_LENGTH) {
      return {
        supported: true,
        text: selectableText,
        strategy: "pdf-text",
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
