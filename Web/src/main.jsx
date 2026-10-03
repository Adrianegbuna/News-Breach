import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL = resolveApiBaseUrl();
const NPC_LOGO_URL =
  "https://fmicgovng.s3.amazonaws.com/cityhill/wp-content/uploads/2019/04/Logo-NPC-jp.jpg";
const MAX_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024;
const INVALID_FILE_FORMAT_MESSAGE =
  "incorrect file format, send a .pdf or .docx file";
const FILE_TOO_LARGE_MESSAGE =
  "File is too large. Send a .pdf or .docx file that is 30mb or smaller.";
const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function App() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reviewMode, setReviewMode] = useState("breachDetection");
  const [status, setStatus] = useState("");
  const [review, setReview] = useState(null);
  const [latestUpload, setLatestUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const activeReview = latestUpload?.reviews?.[reviewMode] || review;
  const hasResults = Boolean(latestUpload?.reviews);

  function pickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setReview(null);
    setLatestUpload(null);

    if (!file) {
      return;
    }

    if (!isAllowedDocument(file)) {
      setSelectedFile(null);
      setStatus(INVALID_FILE_FORMAT_MESSAGE);
      event.target.value = "";
      return;
    }

    if (isTooLarge(file)) {
      setSelectedFile(null);
      setStatus(FILE_TOO_LARGE_MESSAGE);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setStatus("");
  }

  async function submitUpload() {
    if (!selectedFile) {
      setStatus("Choose a file first.");
      return;
    }

    if (!isAllowedDocument(selectedFile)) {
      setStatus(INVALID_FILE_FORMAT_MESSAGE);
      return;
    }

    if (isTooLarge(selectedFile)) {
      setStatus(FILE_TOO_LARGE_MESSAGE);
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);
    formData.append("mode", reviewMode);

    setIsUploading(true);
    setIsProcessing(false);
    setStatus("Waiting for network...");
    setUploadProgress(0);

    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let uploadCompleted = false;

        xhr.open("POST", `${API_BASE_URL}/uploads`);
        xhr.timeout = 120000;

        xhr.onloadstart = () => {
          setStatus("Connecting to backend server...");
        };

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          const percent = Math.min(
            100,
            Math.max(0, Math.round((event.loaded / event.total) * 100)),
          );
          setUploadProgress(percent);
          setStatus(`Uploading file... ${percent}%`);

          if (percent >= 100 && !uploadCompleted) {
            uploadCompleted = true;
            setUploadProgress(100);
            setIsProcessing(true);
            setStatus("Processing document with both detectors...");
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const uploadRecord = JSON.parse(xhr.responseText);
              setLatestUpload(uploadRecord);
              setReview(uploadRecord.reviews?.[reviewMode] || uploadRecord.review);
              setStatus(
                "File checked. Toggle between Breach Detection and Media Stories to view both results.",
              );
              setSelectedFile(null);
              setIsProcessing(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
              resolve();
            } catch {
              reject(new Error("Upload failed: invalid server response."));
            }
            return;
          }

          let errorMessage = `Upload failed with status ${xhr.status}`;
          try {
            const errorBody = JSON.parse(xhr.responseText);
            errorMessage = errorBody?.message || errorMessage;
          } catch {
            // Ignore parse failures.
          }
          if (xhr.status === 502) {
            errorMessage =
              "The server could not finish processing this file. Try a searchable PDF or .docx file.";
          }
          reject(new Error(errorMessage));
        };

        xhr.onerror = () => {
          reject(new Error("Upload failed due to a network error."));
        };

        xhr.ontimeout = () => {
          reject(new Error("Upload timed out while connecting to the backend."));
        };

        xhr.send(formData);
      });
    } catch (error) {
      setStatus(error.message || "Upload failed. Check that the backend is running.");
      setReview(null);
      setLatestUpload(null);
      setIsProcessing(false);
    } finally {
      setIsUploading(false);
    }
  }

  function downloadResults() {
    if (!latestUpload?.reviews) {
      setStatus("Run a check before downloading results.");
      return;
    }

    const fileName = getResultFileName(latestUpload.originalName);
    const resultText = buildResultDocument(latestUpload);
    const blob = new Blob([buildPdfBytes(resultText)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${fileName}.`);
  }

  return (
    <main className="container">
      <div className="shell">
        <section className="top-band">
          <header className="app-header">
            <img className="app-header-logo" src={NPC_LOGO_URL} alt="" />
            <div className="app-header-text">
              <div className="app-header-name">Nigerian Press Council</div>
              <div className="app-header-motto">Truth and Fair Play</div>
            </div>
          </header>

          <div className="hero">
            <h1>Newspaper Review</h1>
            <p>
              Upload a PDF or DOCX once, then inspect both Breach Detection and
              Media Story Detection results from the same check.
            </p>
          </div>
        </section>

        <section className="form-panel">
          <label className="label">Review mode</label>
          <div className="mode-selector">
            <button
              className={`mode-button ${
                reviewMode === "breachDetection" ? "active" : ""
              }`}
              type="button"
              onClick={() => setReviewMode("breachDetection")}
            >
              Breach Detection
            </button>
            <button
              className={`mode-button ${reviewMode === "mediaStories" ? "active" : ""}`}
              type="button"
              onClick={() => setReviewMode("mediaStories")}
            >
              Media Stories
            </button>
          </div>

          <label className="label">Upload Newspaper</label>
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
          />
          <button className="dropzone" type="button" onClick={pickFile}>
            <span className="dropzone-title">
              {selectedFile ? selectedFile.name : "Select a file"}
            </span>
            <span className="dropzone-meta">
              {selectedFile
                ? formatFileSize(selectedFile.size)
                : "PDF or DOCX only. Maximum 30mb"}
            </span>
          </button>

          <button
            className="submit-button"
            type="button"
            onClick={submitUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? <span className="spinner" /> : "Upload & Check"}
          </button>

          {hasResults && (
            <button className="download-button" type="button" onClick={downloadResults}>
              Download Results
            </button>
          )}

          {(isUploading || isProcessing) && (
            <div className="progress-section">
              <div className="progress-label">
                {isProcessing
                  ? `Processing document: ${uploadProgress}%`
                  : `Uploading file: ${uploadProgress}%`}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {status && <p className="status">{status}</p>}

          {activeReview &&
            (activeReview.mode === "mediaStories" ? (
              <MediaStoryResults
                key={`${latestUpload?.id || "latest"}-${activeReview.mode}`}
                review={activeReview}
                upload={latestUpload}
              />
            ) : (
              <ReviewResults
                key={`${latestUpload?.id || "latest"}-${activeReview.mode}`}
                review={activeReview}
                upload={latestUpload}
              />
            ))}
        </section>
      </div>
    </main>
  );
}

function MediaStoryResults({ review, upload }) {
  const stories = review.stories || [];
  const hasStories = stories.length > 0;

  return (
    <section className="results-panel">
      <div className="results-header">
        <div className="results-title-block">
          <div className="results-eyebrow">Analysis complete</div>
          <h2>Media Story Detection</h2>
        </div>
        <span className={`results-badge ${hasStories ? "warning" : "clear"}`}>
          {hasStories ? "Media stories found" : "Clear"}
        </span>
      </div>

      <div className="review-stats">
        <ReviewStat label="Stories" value={stories.length} tone={hasStories ? "failed" : "passed"} />
      </div>

      {upload && <UploadSummary upload={upload} />}

      {hasStories ? (
        stories.map((story) => (
          <article className="story-item" key={story.id}>
            <h3>{story.headline}</h3>
            <p>{formatBreachLocation(story) || "Location unavailable"}</p>
          </article>
        ))
      ) : (
        <p className="empty-result">No media story headings were detected.</p>
      )}
    </section>
  );
}

function ReviewResults({ review, upload }) {
  const reviewItems = review.summary || [];
  const hasBreaches = review.totalBreaches > 0;
  const extractionFailed = review.status === "extraction_failed";
  const hasSkippedEthics = reviewItems.some((item) => item.status === "skipped");
  const reviewSeverityCounts = getSeverityCounts(
    reviewItems.flatMap((item) => item.breaches || []),
  );
  const passedEthics = reviewItems.filter((item) => item.status === "passed").length;
  const failedEthics = reviewItems.filter((item) => item.status === "failed").length;
  const skippedEthics = reviewItems.filter((item) => item.status === "skipped").length;
  const [expandedEthics, setExpandedEthics] = useState(() =>
    Object.fromEntries(
      reviewItems
        .filter((item) => item.breachCount > 0)
        .map((item) => [item.ethic.id, true]),
    ),
  );

  function toggleEthic(ethicId) {
    setExpandedEthics((current) => ({
      ...current,
      [ethicId]: !current[ethicId],
    }));
  }

  return (
    <section className="results-panel">
      <div className="results-header">
        <div className="results-title-block">
          <div className="results-eyebrow">Analysis complete</div>
          <h2>Ethics Review</h2>
        </div>
        {hasBreaches && !extractionFailed ? (
          <SeverityBreakdown counts={reviewSeverityCounts} />
        ) : (
          <span
            className={`results-badge ${
              extractionFailed || hasSkippedEthics ? "neutral" : "clear"
            }`}
          >
            {extractionFailed ? "Text needed" : hasSkippedEthics ? "Setup needed" : "Clear"}
          </span>
        )}
      </div>

      <div className="review-stats">
        <ReviewStat label="Breaches" value={review.totalBreaches || 0} tone={hasBreaches ? "failed" : "passed"} />
        <ReviewStat label="Passed" value={passedEthics} tone="passed" />
        <ReviewStat label="Flagged" value={failedEthics} tone={failedEthics ? "failed" : "neutral"} />
        <ReviewStat label="Skipped" value={skippedEthics} tone={skippedEthics ? "neutral" : "muted"} />
      </div>

      {upload && <UploadSummary upload={upload} />}

      {extractionFailed ? (
        <p className="empty-result">{review.textExtraction?.message || review.message}</p>
      ) : (
        reviewItems.map((item) => {
          const severityCounts = getSeverityCounts(item.breaches || []);
          const severityTone = getSeverityTone(item.breaches || []);
          const rowTone =
            item.status === "failed"
              ? severityTone === "medium"
                ? "warning"
                : "failed"
              : item.status === "skipped"
                ? "skipped"
                : "passed";

          return (
            <article className={`ethic-row ${rowTone}`} key={item.ethic.id}>
              <button
                className="ethic-summary"
                type="button"
                onClick={() =>
                  (item.breachCount > 0 || item.note) && toggleEthic(item.ethic.id)
                }
                disabled={item.breachCount === 0 && !item.note}
              >
                <div className="ethic-summary-text">
                  <div className="ethic-title-row">
                    <span className={`ethic-dot ${rowTone}`} />
                    <h3>{item.ethic.title}</h3>
                  </div>
                  <p>{item.ethic.rule}</p>
                </div>
                <div className="ethic-status-block">
                  {item.status === "failed" ? (
                    <SeverityBreakdown counts={severityCounts} compact />
                  ) : (
                    <span className={`ethic-status ${rowTone}`}>
                      {formatEthicStatus(item)}
                    </span>
                  )}
                  {(item.breachCount > 0 || item.note) && (
                    <span className="dropdown-indicator">
                      {expandedEthics[item.ethic.id] ? "Hide details" : "Show details"}
                    </span>
                  )}
                </div>
              </button>

              {(item.breachCount > 0 || item.note) && expandedEthics[item.ethic.id] && (
                <div className="breach-list">
                  {item.note && <p className="ethic-note">{item.note}</p>}
                  {(item.breaches || []).map((breach) => (
                    <div
                      className={`breach-item ${
                        isMediumSeverity(breach.severity) ? "warning" : "failed"
                      }`}
                      key={breach.id}
                    >
                      <div className="breach-top-row">
                        <span
                          className={`breach-location ${
                            isMediumSeverity(breach.severity) ? "warning" : "failed"
                          }`}
                        >
                          {formatBreachLocation(breach) || "Location unavailable"}
                        </span>
                        <div className="breach-meta-row">
                          {breach.severity && (
                            <span
                              className={`breach-meta ${
                                isMediumSeverity(breach.severity) ? "warning" : "failed"
                              }`}
                            >
                              Severity: {formatLabel(breach.severity)}
                            </span>
                          )}
                          {breach.confidenceLabel && (
                            <span className="breach-meta">
                              Confidence: {breach.confidenceLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <BreachTextSection label="Breach text" text={breach.excerpt} className="breach-excerpt" />
                      {breach.triggerText && (
                        <div className="trigger-block">
                          <div className="trigger-label">Triggered sentence</div>
                          <div className="trigger-text">{breach.triggerText}</div>
                        </div>
                      )}
                      <BreachTextSection label="Reason" text={breach.reason} className="breach-reason" />
                      <BreachTextSection label="Recommendation" text={breach.recommendation} className="breach-recommendation" />
                      <BreachTextSection label="External source" text={breach.source?.url} className="breach-source" />
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}

function UploadSummary({ upload }) {
  return (
    <div className="upload-summary">
      <div className="upload-summary-item">
        <div className="upload-summary-label">Newspaper</div>
        <div className="upload-summary-value">
          {upload.newspaperName || upload.originalName || "Not available"}
        </div>
      </div>
      <div className="upload-summary-item">
        <div className="upload-summary-label">Date</div>
        <div className="upload-summary-value">
          {upload.newspaperDate || formatDateTime(upload.uploadedAt)}
        </div>
      </div>
    </div>
  );
}

function ReviewStat({ label, value, tone }) {
  return (
    <div className={`review-stat ${tone || "neutral"}`}>
      <div className="review-stat-value">{value}</div>
      <div className="review-stat-label">{label}</div>
    </div>
  );
}

function BreachTextSection({ label, text, className }) {
  if (!text) {
    return null;
  }

  return (
    <div className="breach-text-section">
      <div className="breach-section-label">{label}</div>
      <div className={className}>{text}</div>
    </div>
  );
}

function SeverityBreakdown({ counts, compact = false }) {
  const items = [
    { key: "high", label: "High", count: counts.high, tone: "high" },
    { key: "medium", label: compact ? "Med" : "Medium", count: counts.medium, tone: "medium" },
    { key: "low", label: "Low", count: counts.low, tone: "low" },
  ].filter((item) => item.count > 0);

  if (!items.length) {
    return null;
  }

  return (
    <div className={`severity-breakdown ${compact ? "compact" : ""}`}>
      {items.map((item) => (
        <span className={`severity-badge ${item.tone}`} key={item.key}>
          {item.count} {item.label}
        </span>
      ))}
    </div>
  );
}

function resolveApiBaseUrl() {
  const configuredUrl = window.NEWS_BREACH_API_BASE_URL?.trim();

  if (configuredUrl) {
    return trimTrailingSlash(ensureUrlProtocol(configuredUrl));
  }

  if (window.location.hostname === "localhost" && window.location.port !== "3000") {
    return "http://localhost:3000";
  }

  return window.location.origin;
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function ensureUrlProtocol(value) {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(value) ? value : `https://${value}`;
}

function isAllowedDocument(file) {
  const name = file?.name || "";
  const mimeType = (file?.type || "").toLowerCase();
  const hasAllowedExtension = /\.(pdf|docx)$/i.test(name);

  return (
    hasAllowedExtension &&
    (!mimeType ||
      mimeType === "application/octet-stream" ||
      ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType))
  );
}

function isTooLarge(file) {
  return Number.isFinite(file?.size) && file.size > MAX_UPLOAD_SIZE_BYTES;
}

function getResultFileName(originalName = "upload") {
  const cleanedName = originalName.replace(/\.[^.]+$/, "") || "upload";
  const safeName = cleanedName
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return `${safeName || "upload"}-result.pdf`;
}

function buildResultDocument(upload) {
  const breachReview = upload.reviews?.breachDetection;
  const mediaReview = upload.reviews?.mediaStories;
  const lines = [
    "Newspaper Review Results",
    "========================",
    "",
    `Original file: ${upload.originalName || "Not available"}`,
    `Newspaper: ${upload.newspaperName || "Not available"}`,
    `Date: ${upload.newspaperDate || formatDateTime(upload.uploadedAt)}`,
    `Checked at: ${formatDateTime(upload.uploadedAt)}`,
    "",
    ...formatBreachReviewForDownload(breachReview),
    "",
    ...formatMediaReviewForDownload(mediaReview),
  ];

  return lines.join("\n");
}

function buildPdfBytes(text) {
  const pages = paginatePdfLines(text);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages
      .map((_, index) => `${4 + index * 2} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  pages.forEach((pageLines, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const content = buildPdfPageContent(pageLines);

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );
  });

  return encodePdfObjects(objects);
}

function paginatePdfLines(text) {
  const wrappedLines = text
    .split("\n")
    .flatMap((line) => wrapPdfLine(line.replace(/\s+/g, " ").trimEnd()));
  const pageSize = 44;
  const pages = [];

  for (let index = 0; index < wrappedLines.length; index += pageSize) {
    pages.push(wrappedLines.slice(index, index + pageSize));
  }

  return pages.length ? pages : [["No result available."]];
}

function wrapPdfLine(line, width = 86) {
  if (!line) {
    return [""];
  }

  const words = line.split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= width) {
      currentLine = nextLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function buildPdfPageContent(lines) {
  return lines
    .map((line, index) => {
      const y = 752 - index * 16;
      const fontSize = getPdfLineFontSize(line);
      return `BT /F1 ${fontSize} Tf 48 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join("\n");
}

function getPdfLineFontSize(line) {
  if (/^(Newspaper Review Results|Breach Detection|Media Story Detection)$/.test(line)) {
    return 15;
  }

  if (/^[-=]{8,}$/.test(line)) {
    return 6;
  }

  return 10;
}

function escapePdfText(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function encodePdfObjects(objects) {
  const encoder = new TextEncoder();
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdf);
}

function formatBreachReviewForDownload(review) {
  if (!review) {
    return ["Breach Detection", "----------------", "No result available."];
  }

  const lines = [
    "Breach Detection",
    "----------------",
    `Status: ${review.message || "Completed"}`,
    `Total breaches: ${review.totalBreaches || 0}`,
    "",
  ];

  for (const item of review.summary || []) {
    lines.push(`${item.ethic?.title || "Ethic"}: ${formatEthicStatus(item)}`);

    if (item.note) {
      lines.push(`Note: ${item.note}`);
    }

    for (const breach of item.breaches || []) {
      lines.push("");
      lines.push(`Location: ${formatBreachLocation(breach) || "Unavailable"}`);
      if (breach.severity) {
        lines.push(`Severity: ${formatLabel(breach.severity)}`);
      }
      if (breach.confidenceLabel) {
        lines.push(`Confidence: ${breach.confidenceLabel}`);
      }
      if (breach.excerpt) {
        lines.push(`Breach text: ${breach.excerpt}`);
      }
      if (breach.triggerText) {
        lines.push(`Triggered sentence: ${breach.triggerText}`);
      }
      if (breach.reason) {
        lines.push(`Reason: ${breach.reason}`);
      }
      if (breach.recommendation) {
        lines.push(`Recommendation: ${breach.recommendation}`);
      }
      if (breach.source?.url) {
        lines.push(`External source: ${breach.source.url}`);
      }
    }

    lines.push("");
  }

  return lines;
}

function formatMediaReviewForDownload(review) {
  if (!review) {
    return ["Media Story Detection", "---------------------", "No result available."];
  }

  const stories = review.stories || [];
  const lines = [
    "Media Story Detection",
    "---------------------",
    `Status: ${review.message || "Completed"}`,
    `Stories found: ${stories.length}`,
    "",
  ];

  if (!stories.length) {
    lines.push("No media story headings were detected.");
    return lines;
  }

  stories.forEach((story, index) => {
    lines.push(`${index + 1}. ${story.headline || "Untitled story"}`);
    lines.push(`   Location: ${formatBreachLocation(story) || "Unavailable"}`);
  });

  return lines;
}

function getSeverityCounts(breaches) {
  return breaches.reduce(
    (counts, breach) => {
      if (isHighSeverity(breach.severity)) {
        counts.high += 1;
      } else if (isMediumSeverity(breach.severity)) {
        counts.medium += 1;
      } else {
        counts.low += 1;
      }

      return counts;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

function getSeverityTone(breaches) {
  if (breaches.some((breach) => isHighSeverity(breach.severity))) {
    return "high";
  }

  if (breaches.some((breach) => isMediumSeverity(breach.severity))) {
    return "medium";
  }

  return "low";
}

function isHighSeverity(severity) {
  return severity === "high" || severity === "critical";
}

function isMediumSeverity(severity) {
  return severity === "medium";
}

function formatEthicStatus(item) {
  if (item.status === "failed") {
    return `${item.breachCount} ${item.breachCount === 1 ? "Breach" : "Breaches"}`;
  }

  if (item.status === "skipped") {
    return "Needs Setup";
  }

  return "Passed";
}

function formatLabel(value) {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBreachLocation(breach) {
  return [
    breach.pageNumber ? `Page ${breach.pageNumber}` : "",
    breach.lineNumber ? `Line ${breach.lineNumber}` : "",
  ]
    .filter(Boolean)
    .join(" - ");
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFileSize(size) {
  if (!size) {
    return "Ready to upload";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

createRoot(document.getElementById("root")).render(<App />);
