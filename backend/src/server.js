import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import initSqlJs from "sql.js";
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
const dataDir = resolveConfiguredPath(
  process.env.DATA_DIR,
  path.join(rootDir, "data"),
);
const dbPath = path.join(dataDir, "uploads.sqlite");
const ocrCacheDir = resolveConfiguredPath(
  process.env.OCR_CACHE_DIR,
  path.join(dataDir, "ocr-cache"),
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
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(ocrCacheDir, { recursive: true });

const SQL = await initSqlJs();
const databaseFile = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
const db = databaseFile ? new SQL.Database(databaseFile) : new SQL.Database();

db.run(`
  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER NOT NULL,
    file_created_at TEXT,
    uploaded_at TEXT NOT NULL,
    analysis_json TEXT
  );
`);

ensureColumn("uploads", "analysis_json", "TEXT");
ensureColumn("uploads", "file_created_at", "TEXT");
ensureColumn("uploads", "newspaper_name", "TEXT");
ensureColumn("uploads", "newspaper_date", "TEXT");

function saveDatabase() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function ensureColumn(tableName, columnName, columnDefinition) {
  const result = db.exec(`PRAGMA table_info(${tableName})`);
  const columns = result[0]?.values.map((row) => row[1]) ?? [];

  if (!columns.includes(columnName)) {
    db.run(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
    );
  }
}

saveDatabase();

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
    fileSize: 25 * 1024 * 1024,
  },
});

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

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

app.post("/uploads", upload.single("file"), async (req, res) => {
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
    const mode =
      req.body?.mode === "mediaStories" ? "mediaStories" : "breachDetection";
    const analysis =
      mode === "mediaStories"
        ? await detectMediaStories(
            extraction.supported ? extraction.text : "",
            {
              documentLayout: extraction.documentLayout,
            },
          )
        : await analyzeEthics(extraction.supported ? extraction.text : "", {
            publicationName:
              req.body?.publicationName ||
              newspaperMetadata.name ||
              path.parse(req.file.originalname).name,
            documentLayout: extraction.documentLayout,
          });
    const review = {
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

    const uploadRecord = {
      id: randomUUID(),
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      fileCreatedAt:
        fileStats.birthtime?.toISOString?.() || fileStats.ctime.toISOString(),
      newspaperName: newspaperMetadata.name,
      newspaperDate: newspaperMetadata.date,
      uploadedAt: new Date().toISOString(),
      review,
    };

    const insert = db.prepare(`
      INSERT INTO uploads (
        id,
        original_name,
        stored_name,
        mime_type,
        size,
        file_created_at,
        newspaper_name,
        newspaper_date,
        uploaded_at,
        analysis_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run([
      uploadRecord.id,
      uploadRecord.originalName,
      uploadRecord.storedName,
      uploadRecord.mimeType,
      uploadRecord.size,
      uploadRecord.fileCreatedAt,
      uploadRecord.newspaperName,
      uploadRecord.newspaperDate,
      uploadRecord.uploadedAt,
      JSON.stringify(uploadRecord.review),
    ]);
    insert.free();
    saveDatabase();

    return res.status(201).json(uploadRecord);
  } catch {
    return res.status(500).json({
      message:
        "The file was uploaded, but the ethics review could not be completed.",
    });
  }
});

app.get("/uploads", (_req, res) => {
  const result = db.exec(`
    SELECT
      id,
      original_name AS originalName,
      stored_name AS storedName,
      mime_type AS mimeType,
      size,
      file_created_at AS fileCreatedAt,
      newspaper_name AS newspaperName,
      newspaper_date AS newspaperDate,
      uploaded_at AS uploadedAt,
      analysis_json AS analysisJson
    FROM uploads
    ORDER BY uploaded_at DESC
  `);

  const rows = result[0]
    ? result[0].values.map((value) =>
        Object.fromEntries(
          result[0].columns.map((column, index) => [column, value[index]]),
        ),
      )
    : [];

  res.json(rows.map(hydrateUploadRow));
});

app.listen(port, host, () => {
  console.log(`Backend server listening on http://${host}:${port}`);
});

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

function hydrateUploadRow(row) {
  const { analysisJson, ...upload } = row;

  return {
    ...upload,
    review: parseAnalysisJson(analysisJson),
  };
}

function parseAnalysisJson(analysisJson) {
  if (!analysisJson) {
    return null;
  }

  try {
    return JSON.parse(analysisJson);
  } catch {
    return null;
  }
}
