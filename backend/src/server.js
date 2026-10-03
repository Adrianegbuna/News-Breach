import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { analyzeEthics } from "./breachDetector.js";
import { detectMediaStories } from "./mediaStoryDetection.js";
import { extractTextFromUpload } from "./textExtractor.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const uploadsDir = resolveConfiguredPath(
  process.env.UPLOADS_DIR,
  path.join(rootDir, "uploads"),
);
const ocrCacheDir = resolveConfiguredPath(
  process.env.OCR_CACHE_DIR,
  path.join(rootDir, "data", "ocr-cache"),
);
const ocrLangDir =
  process.env.OCR_LANG_DIR?.trim() ||
  firstExistingPath([
    path.resolve(
      rootDir,
      "node_modules",
      "@tesseract.js-data",
      "eng",
      "4.0.0_best_int",
    ),
    path.resolve(
      rootDir,
      "..",
      "node_modules",
      "@tesseract.js-data",
      "eng",
      "4.0.0_best_int",
    ),
  ]);

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(ocrCacheDir, { recursive: true });

const MAX_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024;
const INVALID_FILE_FORMAT_MESSAGE =
  "incorrect file format, send a .pdf or .docx file";
const FILE_TOO_LARGE_MESSAGE =
  "File is too large. Send a .pdf or .docx file that is 30mb or smaller.";
const ALLOWED_UPLOAD_EXTENSIONS = new Set([".pdf", ".docx"]);
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedUpload(file)) {
      cb(null, true);
      return;
    }

    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
  },
});

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "News Breach API is running",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "news-breach-backend",
  });
});

app.post("/uploads", handleSingleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No file uploaded",
    });
  }

  try {
    const fileStats = fs.statSync(req.file.path);
    const extraction = await extractTextFromUpload(req.file, {
      ocrCacheDir,
      ocrLangDir,
    });
    const newspaperMetadata = inferNewspaperMetadata(extraction.text);
    const reviewText = extraction.supported ? extraction.text : "";
    const [breachAnalysis, mediaStoriesAnalysis] = await Promise.all([
      analyzeEthics(reviewText, {
        publicationName:
          req.body?.publicationName ||
          newspaperMetadata.name ||
          path.parse(req.file.originalname).name,
        documentLayout: extraction.documentLayout,
      }),
      detectMediaStories(reviewText, {
        documentLayout: extraction.documentLayout,
      }),
    ]);
    const reviews = {
      breachDetection: buildReview(extraction, breachAnalysis, "breachDetection"),
      mediaStories: buildReview(extraction, mediaStoriesAnalysis, "mediaStories"),
    };
    const requestedMode =
      req.body?.mode === "mediaStories" ? "mediaStories" : "breachDetection";
    const review = reviews[requestedMode];

    const uploadRecord = {
      id: randomUUID(),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      fileCreatedAt:
        fileStats.birthtime?.toISOString?.() || fileStats.ctime.toISOString(),
      newspaperName: newspaperMetadata.name,
      newspaperDate: newspaperMetadata.date,
      uploadedAt: new Date().toISOString(),
      review,
      reviews,
    };

    return res.status(201).json(uploadRecord);
  } catch (error) {
    console.error("Upload processing failed", error);
    return res.status(500).json({
      message:
        "The file was uploaded, but the review could not be completed.",
    });
  } finally {
    deleteUploadedFile(req.file);
  }
});

app.get("/uploads", (_req, res) => {
  res.json([]);
});

app.listen(port, host, () => {
  console.log(`Backend server listening on http://${host}:${port}`);
});

function handleSingleUpload(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? FILE_TOO_LARGE_MESSAGE
          : INVALID_FILE_FORMAT_MESSAGE;

      deleteUploadedFile(req.file);
      res.status(400).json({ message });
      return;
    }

    deleteUploadedFile(req.file);
    res.status(400).json({
      message: error.message || INVALID_FILE_FORMAT_MESSAGE,
    });
  });
}

function isAllowedUpload(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mimeType = (file.mimetype || "").toLowerCase();

  return (
    ALLOWED_UPLOAD_EXTENSIONS.has(extension) &&
    (!mimeType ||
      mimeType === "application/octet-stream" ||
      ALLOWED_UPLOAD_MIME_TYPES.has(mimeType))
  );
}

function deleteUploadedFile(file) {
  if (!file?.path) {
    return;
  }

  fs.rm(file.path, { force: true }, () => {});
}

function buildReview(extraction, analysis, mode) {
  return {
    mode,
    status: extraction.supported ? "completed" : "extraction_failed",
    message: getReviewMessage(extraction, analysis, mode),
    textExtraction: {
      supported: extraction.supported,
      strategy: extraction.strategy,
      message: extraction.message,
    },
    ...analysis,
  };
}

function resolveConfiguredPath(configuredPath, fallbackPath) {
  const targetPath = configuredPath?.trim() || fallbackPath;
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(rootDir, targetPath);
}

function firstExistingPath(paths) {
  return paths.find((candidatePath) => fs.existsSync(candidatePath));
}

function inferNewspaperMetadata(text = "") {
  const firstPageText = getFirstPageText(text);

  return {
    name: inferNewspaperName(firstPageText),
    date: inferNewspaperDate(firstPageText),
  };
}

function getFirstPageText(text) {
  const pageMatch = text.match(
    /(?:^|\n)Page\s+1\b([\s\S]*?)(?=\n\s*Page\s+2\b|$)/i,
  );

  if (pageMatch) {
    return pageMatch[1].trim();
  }

  return text
    .split(/\r\n|\r|\n/)
    .slice(0, 120)
    .join("\n")
    .slice(0, 8000);
}

function inferNewspaperName(firstPageText) {
  const compactText = firstPageText.replace(/\s+/g, " ").trim();
  const mastheadText = firstPageText.replace(/\r\n|\r/g, "\n");
  const knownNewspapers = [
    {
      name: "Daily Independent",
      patterns: [
        /\bindependent\.ng\b/i,
        /\b(?:daily|sunday|saturday)\s+independent\b/i,
        /(?:^|\n)\s*INDEPENDENT\s*(?:\n|$)/,
      ],
    },
    {
      name: "Leadership",
      patterns: [/\bleadership\.ng\b/i, /\bleadership\b/i],
    },
    {
      name: "The Sun",
      patterns: [/\bsunnewsonline\.com\b/i, /\bthe\s+sun\b/i],
    },
    { name: "Vanguard", patterns: [/\bvanguardngr\.com\b/i, /\bvanguard\b/i] },
    {
      name: "Punch",
      patterns: [/\bpunchng\.com\b/i, /\bthe\s+punch\b/i, /\bpunch\b/i],
    },
    {
      name: "The Guardian",
      patterns: [/\bguardian\.ng\b/i, /\bthe\s+guardian\b/i],
    },
    {
      name: "Daily Trust",
      patterns: [/\bdailytrust\.com\b/i, /\bdaily\s+trust\b/i],
    },
    {
      name: "Nigerian Tribune",
      patterns: [/\btribuneonlineng\.com\b/i, /\bnigerian\s+tribune\b/i],
    },
    { name: "ThisDay", patterns: [/\bthisdaylive\.com\b/i, /\bthisday\b/i] },
    {
      name: "The Nation",
      patterns: [/\bthenationonlineng\.net\b/i, /\bthe\s+nation\b/i],
    },
    {
      name: "New Telegraph",
      patterns: [/\bnewtelegraphng\.com\b/i, /\bnew\s+telegraph\b/i],
    },
    { name: "Blueprint", patterns: [/\bblueprint\.ng\b/i, /\bblueprint\b/i] },
    {
      name: "BusinessDay",
      patterns: [/\bbusinessday\.ng\b/i, /\bbusiness\s*day\b/i],
    },
    {
      name: "Daily Post",
      patterns: [/\bdailypost\.ng\b/i, /\bdaily\s+post\b/i],
    },
    {
      name: "Premium Times",
      patterns: [/\bpremiumtimesng\.com\b/i, /\bpremium\s+times\b/i],
    },
    { name: "The Cable", patterns: [/\bthecable\.ng\b/i, /\bthe\s+cable\b/i] },
  ];

  const knownMatch = knownNewspapers.find((newspaper) =>
    newspaper.patterns.some(
      (pattern) => pattern.test(compactText) || pattern.test(mastheadText),
    ),
  );

  if (knownMatch) {
    return knownMatch.name;
  }

  return inferMastheadLine(firstPageText);
}

function inferMastheadLine(firstPageText) {
  const ignoredLinePattern =
    /(?:^Page\s+\d+\b|www\.|@|\/|vol\.|no\.|n\d+|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b|\b(?:newspaper|most read|political|business elite|continues on)\b)/i;

  return (
    firstPageText
      .split(/\r\n|\r|\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length >= 3 && line.length <= 50)
      .find((line) => {
        if (ignoredLinePattern.test(line)) {
          return false;
        }

        const words = line.split(/\s+/).filter(Boolean);
        return (
          words.length <= 5 &&
          (line === line.toUpperCase() ||
            words.every((word) => /^[A-Z][A-Za-z'-]*$/.test(word)))
        );
      }) || ""
  );
}

function inferNewspaperDate(firstPageText) {
  const compactText = firstPageText.replace(/\s+/g, " ").trim();
  const monthNameDate = compactText.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{2,4})\b/i,
  );

  if (monthNameDate) {
    return formatShortDate(
      monthNameDate[1],
      monthNameDate[2],
      monthNameDate[3],
    );
  }

  const dayMonthNameDate = compactText.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)[,]?\s+(\d{2,4})\b/i,
  );

  if (dayMonthNameDate) {
    return formatShortDate(
      dayMonthNameDate[2],
      dayMonthNameDate[1],
      dayMonthNameDate[3],
    );
  }

  const numericDate = compactText.match(
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/,
  );

  if (numericDate) {
    return formatShortDate(numericDate[1], numericDate[2], numericDate[3]);
  }

  return "";
}

function formatShortDate(monthValue, dayValue, yearValue) {
  const month = normalizeMonth(monthValue);
  const day = Number.parseInt(dayValue, 10);
  const year = Number.parseInt(yearValue, 10);

  if (!month || !day || !year) {
    return "";
  }

  const shortYear = yearValue.length === 2 ? year : year % 100;

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(shortYear).padStart(2, "0")}`;
}

function normalizeMonth(monthValue) {
  const monthNames = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  if (/^\d+$/.test(monthValue)) {
    const month = Number.parseInt(monthValue, 10);
    return month >= 1 && month <= 12 ? month : 0;
  }

  return monthNames[monthValue.toLowerCase()] || 0;
}

function getReviewMessage(extraction, analysis, mode) {
  if (!extraction.supported) {
    return extraction.message;
  }

  if (!extraction.text?.trim()) {
    return extraction.message;
  }

  if (mode === "mediaStories") {
    return analysis.totalStories > 0
      ? "Review complete. Media story headings were detected."
      : "Review complete. No media story headings were detected.";
  }

  return analysis.totalBreaches > 0
    ? "Review complete. Potential ethics breaches were detected."
    : "Review complete. No potential ethics breaches were detected.";
}
