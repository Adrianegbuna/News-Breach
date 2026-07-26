import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import initSqlJs from "sql.js";
import { analyzeEthics } from "./ethicsAnalyzer.js";
import { extractTextFromUpload } from "./textExtractor.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const uploadsDir = resolveConfiguredPath(process.env.UPLOADS_DIR, path.join(rootDir, "uploads"));
const dataDir = resolveConfiguredPath(process.env.DATA_DIR, path.join(rootDir, "data"));
const dbPath = path.join(dataDir, "uploads.sqlite");
const ocrCacheDir = resolveConfiguredPath(process.env.OCR_CACHE_DIR, path.join(dataDir, "ocr-cache"));
const ocrLangDir =
  process.env.OCR_LANG_DIR?.trim() ||
  firstExistingPath([
    path.resolve(rootDir, "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int"),
    path.resolve(rootDir, "..", "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int"),
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
    uploaded_at TEXT NOT NULL,
    analysis_json TEXT
  );
`);

ensureColumn("uploads", "analysis_json", "TEXT");

function saveDatabase() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function ensureColumn(tableName, columnName, columnDefinition) {
  const result = db.exec(`PRAGMA table_info(${tableName})`);
  const columns = result[0]?.values.map((row) => row[1]) ?? [];

  if (!columns.includes(columnName)) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
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
    const extraction = await extractTextFromUpload(req.file, { ocrCacheDir, ocrLangDir });
    const analysis = await analyzeEthics(extraction.supported ? extraction.text : "", {
      publicationName: req.body?.publicationName || path.parse(req.file.originalname).name,
    });
    const ethicsReview = {
      status: extraction.supported ? "completed" : "extraction_failed",
      message: getReviewMessage(extraction, analysis.totalBreaches),
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
      uploadedAt: new Date().toISOString(),
      ethicsReview,
    };

    const insert = db.prepare(`
      INSERT INTO uploads (id, original_name, stored_name, mime_type, size, uploaded_at, analysis_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run([
      uploadRecord.id,
      uploadRecord.originalName,
      uploadRecord.storedName,
      uploadRecord.mimeType,
      uploadRecord.size,
      uploadRecord.uploadedAt,
      JSON.stringify(uploadRecord.ethicsReview),
    ]);
    insert.free();
    saveDatabase();

    return res.status(201).json(uploadRecord);
  } catch {
    return res.status(500).json({
      message: "The file was uploaded, but the ethics review could not be completed.",
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
      uploaded_at AS uploadedAt,
      analysis_json AS analysisJson
    FROM uploads
    ORDER BY uploaded_at DESC
  `);

  const rows = result[0]
    ? result[0].values.map((value) =>
        Object.fromEntries(result[0].columns.map((column, index) => [column, value[index]])),
      )
    : [];

  res.json(rows.map(hydrateUploadRow));
});

app.listen(port, host, () => {
  console.log(`Backend server listening on http://${host}:${port}`);
});

function resolveConfiguredPath(configuredPath, fallbackPath) {
  const targetPath = configuredPath?.trim() || fallbackPath;
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(rootDir, targetPath);
}

function firstExistingPath(paths) {
  return paths.find((candidatePath) => fs.existsSync(candidatePath));
}

function getReviewMessage(extraction, totalBreaches) {
  if (!extraction.supported) {
    return extraction.message;
  }

  if (!extraction.text?.trim()) {
    return extraction.message;
  }

  if (totalBreaches > 0) {
    return "Review complete. Potential ethics breaches were detected.";
  }

  return "Review complete. No potential ethics breaches were detected.";
}

function hydrateUploadRow(row) {
  const { analysisJson, ...upload } = row;

  return {
    ...upload,
    ethicsReview: parseAnalysisJson(analysisJson),
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
