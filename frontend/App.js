import { StatusBar } from "expo-status-bar";
import * as DocumentPicker from "expo-document-picker";
import Constants from "expo-constants";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const API_PORT = "3000";
const API_BASE_URL = resolveApiBaseUrl();
const NPC_LOGO_URL =
  "https://fmicgovng.s3.amazonaws.com/cityhill/wp-content/uploads/2019/04/Logo-NPC-jp.jpg";

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [reviewMode, setReviewMode] = useState("breachDetection");
  const [status, setStatus] = useState("");
  const [review, setReview] = useState(null);
  const [latestUpload, setLatestUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return;
    }

    setSelectedFile(result.assets[0]);
    setStatus("");
    setReview(null);
    setLatestUpload(null);
  }

  async function submitUpload() {
    if (!selectedFile) {
      setStatus("Choose a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: selectedFile.mimeType || "application/octet-stream",
    });
    formData.append("mode", reviewMode);

    setIsUploading(true);
    setStatus("");
    setUploadProgress(0);

    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${API_BASE_URL}/uploads`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const uploadRecord = JSON.parse(xhr.responseText);
              setLatestUpload(uploadRecord);
              setReview(uploadRecord.review);
              setStatus(
                uploadRecord.review?.message || "File uploaded and reviewed.",
              );
              setSelectedFile(null);
              setUploadProgress(100);
              resolve();
            } catch (error) {
              reject(new Error("Upload failed: invalid server response."));
            }
          } else {
            let errorMessage = `Upload failed with status ${xhr.status}`;
            try {
              const errorBody = JSON.parse(xhr.responseText);
              errorMessage = errorBody?.message || errorMessage;
            } catch {
              // ignore parse failures
            }
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Upload failed due to a network error."));
        };

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.send(formData);
      });
    } catch (error) {
      setStatus(
        `Upload failed. Backend target: ${API_BASE_URL}. ${error.message || "Check that the backend is running."}`,
      );
      setReview(null);
      setLatestUpload(null);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.shell}>
        <View style={styles.appHeader}>
          <Image
            source={{ uri: NPC_LOGO_URL }}
            style={styles.appHeaderLogo}
            resizeMode="contain"
          />
          <View style={styles.appHeaderText}>
            <Text style={styles.appHeaderName}>Nigerian Press Council</Text>
            <Text style={styles.appHeaderMotto}>Truth and Fair Play</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Newspaper Review Form</Text>
          <Text style={styles.subtitle}>
            {reviewMode === "mediaStories"
              ? "Submit one paper to detect media/journalist story headings."
              : "Submit one paper for review against defined journalism ethics."}
          </Text>
        </View>

        <View style={styles.formPanel}>
          <Text style={styles.label}>Review mode</Text>
          <View style={styles.modeSelector}>
            <Pressable
              style={[
                styles.modeButton,
                styles.modeButtonBreach,
                reviewMode === "breachDetection" &&
                  styles.modeButtonActiveBreach,
              ]}
              onPress={() => setReviewMode("breachDetection")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  reviewMode === "breachDetection" &&
                    styles.modeButtonTextActive,
                ]}
              >
                Breach Detection
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeButton,
                styles.modeButtonMedia,
                reviewMode === "mediaStories" && styles.modeButtonActiveMedia,
              ]}
              onPress={() => setReviewMode("mediaStories")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  reviewMode === "mediaStories" && styles.modeButtonTextActive,
                ]}
              >
                Media Stories
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Upload Newspaper</Text>
          <Pressable style={styles.dropzone} onPress={pickFile}>
            <Text style={styles.dropzoneTitle}>
              {selectedFile ? selectedFile.name : "Select a file"}
            </Text>
            <Text style={styles.dropzoneMeta}>
              {selectedFile
                ? formatFileSize(selectedFile.size)
                : "PDF, CSV, spreadsheet, document, or image"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.submitButton,
              (!selectedFile || isUploading) && styles.submitButtonDisabled,
            ]}
            onPress={submitUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Upload & Check</Text>
            )}
          </Pressable>

          {isUploading && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>
                Processing document: {uploadProgress}%
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${uploadProgress}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {!!status && <Text style={styles.status}>{status}</Text>}
          {!!review &&
            (review.mode === "mediaStories" ? (
              <MediaStoryResults review={review} upload={latestUpload} />
            ) : (
              <ReviewResults review={review} upload={latestUpload} />
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MediaStoryResults({ review, upload }) {
  const stories = review.stories || [];
  const hasStories = stories.length > 0;

  return (
    <View style={styles.resultsPanel}>
      <View style={styles.resultsHeader}>
        <View style={styles.resultsTitleBlock}>
          <Text style={styles.resultsEyebrow}>Analysis complete</Text>
          <Text style={styles.resultsTitle}>Media Story Detection</Text>
        </View>
        <Text
          style={[
            styles.resultsBadge,
            hasStories ? styles.resultsBadgeWarning : styles.resultsBadgeClear,
          ]}
        >
          {hasStories ? "Media stories found" : "Clear"}
        </Text>
      </View>

      <View style={styles.reviewStats}>
        <ReviewStat
          label="Stories"
          value={stories.length}
          tone={hasStories ? "failed" : "passed"}
        />
      </View>

      {!!upload && (
        <View style={styles.uploadSummary}>
          <View style={styles.uploadSummaryItem}>
            <Text style={styles.uploadSummaryLabel}>Newspaper</Text>
            <Text style={styles.uploadSummaryValue}>
              {upload.newspaperName || upload.originalName || "Not available"}
            </Text>
          </View>
          <View style={styles.uploadSummaryItem}>
            <Text style={styles.uploadSummaryLabel}>Date</Text>
            <Text style={styles.uploadSummaryValue}>
              {upload.newspaperDate || formatDateTime(upload.uploadedAt)}
            </Text>
          </View>
        </View>
      )}

      {hasStories ? (
        stories.map((story) => (
          <View key={story.id} style={styles.storyItem}>
            <Text style={styles.storyHeadline}>{story.headline}</Text>
            <Text style={styles.storyLocation}>
              {formatBreachLocation(story) || "Location unavailable"}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyResult}>
          No media story headings were detected.
        </Text>
      )}
    </View>
  );
}

function resolveApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  const expoHost = getExpoDevServerHost();

  if (expoHost) {
    return `http://${expoHost}:${API_PORT}`;
  }

  return Platform.OS === "android"
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;
}

function getExpoDevServerHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (!hostUri) {
    return "";
  }

  const host = hostUri.replace(/^[a-z]+:\/\//i, "").split(/[/:]/)[0];
  return host === "localhost" || host === "127.0.0.1" ? "" : host;
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

async function getUploadErrorMessage(response) {
  try {
    const errorBody = await response.json();
    return errorBody?.message || `Upload failed with status ${response.status}`;
  } catch {
    return `Upload failed with status ${response.status}`;
  }
}

function ReviewResults({ review, upload }) {
  const reviewItems = review.summary || [];
  const hasBreaches = review.totalBreaches > 0;
  const extractionFailed = review.status === "extraction_failed";
  const hasSkippedEthics = reviewItems.some(
    (item) => item.status === "skipped",
  );
  const reviewSeverityCounts = getSeverityCounts(
    reviewItems.flatMap((item) => item.breaches || []),
  );
  const passedEthics = reviewItems.filter(
    (item) => item.status === "passed",
  ).length;
  const failedEthics = reviewItems.filter(
    (item) => item.status === "failed",
  ).length;
  const skippedEthics = reviewItems.filter(
    (item) => item.status === "skipped",
  ).length;
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
    <View style={styles.resultsPanel}>
      <View style={styles.resultsHeader}>
        <View style={styles.resultsTitleBlock}>
          <Text style={styles.resultsEyebrow}>Analysis complete</Text>
          <Text style={styles.resultsTitle}>Ethics Review</Text>
        </View>
        {hasBreaches && !extractionFailed ? (
          <SeverityBreakdown counts={reviewSeverityCounts} />
        ) : (
          <Text
            style={[
              styles.resultsBadge,
              extractionFailed
                ? styles.resultsBadgeNeutral
                : hasSkippedEthics
                  ? styles.resultsBadgeNeutral
                  : styles.resultsBadgeClear,
            ]}
          >
            {extractionFailed
              ? "Text needed"
              : hasSkippedEthics
                ? "Setup needed"
                : "Clear"}
          </Text>
        )}
      </View>

      <View style={styles.reviewStats}>
        <ReviewStat
          label="Breaches"
          value={review.totalBreaches || 0}
          tone={hasBreaches ? "failed" : "passed"}
        />
        <ReviewStat label="Passed" value={passedEthics} tone="passed" />
        <ReviewStat
          label="Flagged"
          value={failedEthics}
          tone={failedEthics ? "failed" : "neutral"}
        />
        <ReviewStat
          label="Skipped"
          value={skippedEthics}
          tone={skippedEthics ? "neutral" : "muted"}
        />
      </View>

      {!!upload && (
        <View style={styles.uploadSummary}>
          <View style={styles.uploadSummaryItem}>
            <Text style={styles.uploadSummaryLabel}>Newspaper</Text>
            <Text style={styles.uploadSummaryValue}>
              {upload.newspaperName || upload.originalName || "Not available"}
            </Text>
          </View>
          <View style={styles.uploadSummaryItem}>
            <Text style={styles.uploadSummaryLabel}>Date</Text>
            <Text style={styles.uploadSummaryValue}>
              {upload.newspaperDate || formatDateTime(upload.uploadedAt)}
            </Text>
          </View>
        </View>
      )}

      {extractionFailed ? (
        <Text style={styles.emptyResult}>
          {review.textExtraction?.message || review.message}
        </Text>
      ) : (
        reviewItems.map((item) => {
          const severityCounts = getSeverityCounts(item.breaches || []);
          const severityTone = getSeverityTone(item.breaches || []);

          return (
            <View
              key={item.ethic.id}
              style={[
                styles.ethicRow,
                item.status === "failed"
                  ? severityTone === "medium"
                    ? styles.ethicRowWarning
                    : styles.ethicRowFailed
                  : item.status === "skipped"
                    ? styles.ethicRowSkipped
                    : styles.ethicRowPassed,
              ]}
            >
              <Pressable
                style={styles.ethicSummary}
                onPress={() =>
                  (item.breachCount > 0 || item.note) &&
                  toggleEthic(item.ethic.id)
                }
                disabled={item.breachCount === 0 && !item.note}
              >
                <View style={styles.ethicSummaryText}>
                  <View style={styles.ethicTitleRow}>
                    <View
                      style={[
                        styles.ethicDot,
                        item.status === "failed"
                          ? severityTone === "medium"
                            ? styles.ethicDotWarning
                            : styles.ethicDotFailed
                          : item.status === "skipped"
                            ? styles.ethicDotSkipped
                            : styles.ethicDotPassed,
                      ]}
                    />
                    <Text
                      style={[
                        styles.ethicTitle,
                        item.status === "failed"
                          ? severityTone === "medium"
                            ? styles.ethicTitleWarning
                            : styles.ethicTitleFailed
                          : item.status === "skipped"
                            ? styles.ethicTitleSkipped
                            : styles.ethicTitlePassed,
                      ]}
                    >
                      {item.ethic.title}
                    </Text>
                  </View>
                  <Text style={styles.ethicRule}>{item.ethic.rule}</Text>
                </View>
                <View style={styles.ethicStatusBlock}>
                  {item.status === "failed" ? (
                    <SeverityBreakdown counts={severityCounts} compact />
                  ) : (
                    <Text
                      style={[
                        styles.ethicStatus,
                        item.status === "skipped"
                          ? styles.ethicStatusSkipped
                          : styles.ethicStatusPassed,
                      ]}
                    >
                      {formatEthicStatus(item)}
                    </Text>
                  )}
                  {(item.breachCount > 0 || item.note) && (
                    <Text style={styles.dropdownIndicator}>
                      {expandedEthics[item.ethic.id]
                        ? "Hide details"
                        : "Show details"}
                    </Text>
                  )}
                </View>
              </Pressable>

              {(item.breachCount > 0 || item.note) &&
                expandedEthics[item.ethic.id] && (
                  <View style={styles.breachList}>
                    {!!item.note && (
                      <Text style={styles.ethicNote}>{item.note}</Text>
                    )}
                    {item.breaches.map((breach) => (
                      <View
                        key={breach.id}
                        style={[
                          styles.breachItem,
                          isMediumSeverity(breach.severity)
                            ? styles.breachItemWarning
                            : styles.breachItemFailed,
                        ]}
                      >
                        <View style={styles.breachTopRow}>
                          <Text
                            style={[
                              styles.breachLocation,
                              isMediumSeverity(breach.severity)
                                ? styles.breachLocationWarning
                                : styles.breachLocationFailed,
                            ]}
                          >
                            {formatBreachLocation(breach) ||
                              "Location unavailable"}
                          </Text>
                          <View style={styles.breachMetaRow}>
                            {!!breach.severity && (
                              <Text
                                style={[
                                  styles.breachMeta,
                                  isMediumSeverity(breach.severity)
                                    ? styles.breachMetaWarning
                                    : styles.breachMetaFailed,
                                ]}
                              >
                                Severity: {formatLabel(breach.severity)}
                              </Text>
                            )}
                            {!!breach.confidenceLabel && (
                              <Text style={styles.breachMeta}>
                                Confidence: {breach.confidenceLabel}
                              </Text>
                            )}
                          </View>
                        </View>
                        <BreachTextSection
                          label="Topic"
                          text={breach.topic || breach.headline}
                          textStyle={styles.breachHeadline}
                        />
                        <BreachTextSection
                          label="Breach text"
                          text={breach.excerpt}
                          textStyle={styles.breachExcerpt}
                        />
                        {!!breach.triggerText && (
                          <View style={styles.triggerBlock}>
                            <Text style={styles.triggerLabel}>
                              Triggered sentence
                            </Text>
                            <Text style={styles.triggerText}>
                              {breach.triggerText}
                            </Text>
                          </View>
                        )}
                        <BreachTextSection
                          label="Reason"
                          text={breach.reason}
                          textStyle={styles.breachReason}
                        />
                        <BreachTextSection
                          label="Recommendation"
                          text={breach.recommendation}
                          textStyle={styles.breachRecommendation}
                        />
                        {!!breach.evidence?.length && (
                          <View style={styles.evidenceList}>
                            <Text style={styles.breachSectionLabel}>
                              Evidence
                            </Text>
                            {breach.evidence.map((evidence, index) => (
                              <Text
                                key={`${breach.id}-evidence-${index}`}
                                style={styles.evidenceText}
                              >
                                {evidence.label}: {evidence.value}
                              </Text>
                            ))}
                          </View>
                        )}
                        <BreachTextSection
                          label="External source"
                          text={breach.source?.url}
                          textStyle={styles.breachSource}
                        />
                      </View>
                    ))}
                  </View>
                )}
            </View>
          );
        })
      )}
    </View>
  );
}

function ReviewStat({ label, value, tone }) {
  return (
    <View
      style={[
        styles.reviewStat,
        tone === "failed"
          ? styles.reviewStatFailed
          : tone === "passed"
            ? styles.reviewStatPassed
            : tone === "muted"
              ? styles.reviewStatMuted
              : styles.reviewStatNeutral,
      ]}
    >
      <Text style={styles.reviewStatValue}>{value}</Text>
      <Text style={styles.reviewStatLabel}>{label}</Text>
    </View>
  );
}

function BreachTextSection({ label, text, textStyle }) {
  if (!text) {
    return null;
  }

  return (
    <View style={styles.breachTextSection}>
      <Text style={styles.breachSectionLabel}>{label}</Text>
      <Text style={textStyle}>{text}</Text>
    </View>
  );
}

function SeverityBreakdown({ counts, compact = false }) {
  const items = [
    {
      key: "high",
      label: compact ? "High" : "High",
      count: counts.high,
      style: styles.severityBadgeHigh,
    },
    {
      key: "medium",
      label: compact ? "Med" : "Medium",
      count: counts.medium,
      style: styles.severityBadgeMedium,
    },
    {
      key: "low",
      label: "Low",
      count: counts.low,
      style: styles.severityBadgeLow,
    },
  ].filter((item) => item.count > 0);

  if (!items.length) {
    return null;
  }

  return (
    <View
      style={[
        styles.severityBreakdown,
        compact && styles.severityBreakdownCompact,
      ]}
    >
      {items.map((item) => (
        <Text key={item.key} style={[styles.severityBadge, item.style]}>
          {item.count} {item.label}
        </Text>
      ))}
    </View>
  );
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1ea",
  },
  shell: {
    justifyContent: "center",
    minHeight: "100%",
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  appHeader: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d9e5e2",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    padding: 8,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  appHeaderLogo: {
    backgroundColor: "#f7faf9",
    borderColor: "#dcebe8",
    borderRadius: 8,
    borderWidth: 1,
    height: 58,
    width: 58,
  },
  appHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  appHeaderName: {
    color: "#15201d",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  appHeaderMotto: {
    color: "#006b5f",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 2,
    textTransform: "uppercase",
  },
  hero: {
    marginBottom: 18,
  },
  kicker: {
    color: "#8d3f27",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  title: {
    color: "#171717",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 48,
    marginBottom: 14,
  },
  subtitle: {
    color: "#4c555c",
    fontSize: 18,
    lineHeight: 26,
    maxWidth: 420,
  },
  formPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#e0ddd4",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  label: {
    color: "#202020",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  dropzone: {
    alignItems: "center",
    backgroundColor: "#f7faf9",
    borderColor: "#9bb8b0",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1.5,
    minHeight: 112,
    justifyContent: "center",
    padding: 12,
  },
  dropzoneTitle: {
    color: "#15201d",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  dropzoneMeta: {
    color: "#66736d",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: "#006b5f",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ab1ac",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  modeSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  modeButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  modeButtonBreach: {
    backgroundColor: "#fff2f2",
    borderColor: "#d9534f",
  },
  modeButtonMedia: {
    backgroundColor: "#e8f0ff",
    borderColor: "#3b7bd1",
  },
  modeButtonActiveBreach: {
    backgroundColor: "#d9534f",
    borderColor: "#d9534f",
  },
  modeButtonActiveMedia: {
    backgroundColor: "#3b7bd1",
    borderColor: "#3b7bd1",
  },
  modeButtonText: {
    color: "#1f2d2d",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  modeButtonTextActive: {
    color: "#ffffff",
  },
  storyItem: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e2df",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    padding: 12,
  },
  storyHeadline: {
    color: "#15201d",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  storyLocation: {
    color: "#58635f",
    fontSize: 13,
  },
  status: {
    color: "#35423f",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  resultsPanel: {
    backgroundColor: "#f8faf9",
    borderColor: "#d9e1de",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 10,
  },
  resultsHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    marginBottom: 10,
  },
  resultsTitleBlock: {
    flex: 1,
    minWidth: 180,
  },
  resultsEyebrow: {
    color: "#7f6a32",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  resultsTitle: {
    color: "#15201d",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  resultsBadge: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  resultsBadgeClear: {
    backgroundColor: "#dff2e8",
    color: "#17623c",
  },
  resultsBadgeWarning: {
    backgroundColor: "#ffe0d5",
    color: "#9b3215",
  },
  resultsBadgeNeutral: {
    backgroundColor: "#e9eceb",
    color: "#4d5854",
  },
  severityBreakdown: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "flex-end",
  },
  severityBreakdownCompact: {
    maxWidth: 150,
  },
  severityBadge: {
    borderRadius: 8,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  severityBadgeHigh: {
    backgroundColor: "#ffe0d5",
    color: "#9b3215",
  },
  severityBadgeMedium: {
    backgroundColor: "#fff0bd",
    color: "#7a4f00",
  },
  severityBadgeLow: {
    backgroundColor: "#e9eceb",
    color: "#4d5854",
  },
  reviewStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  reviewStat: {
    backgroundColor: "#ffffff",
    borderColor: "#e1e8e5",
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 112,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  reviewStatPassed: {
    borderColor: "#b9dcc8",
  },
  reviewStatFailed: {
    borderColor: "#edc4b5",
  },
  reviewStatNeutral: {
    borderColor: "#d5ddda",
  },
  reviewStatMuted: {
    opacity: 0.72,
  },
  reviewStatValue: {
    color: "#17211e",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  reviewStatLabel: {
    color: "#66736d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 2,
    textTransform: "uppercase",
  },
  ethicRow: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
  },
  ethicRowPassed: {
    borderColor: "#d9e7df",
    borderLeftColor: "#2d8a57",
    borderLeftWidth: 4,
  },
  ethicRowFailed: {
    borderColor: "#f0d5cc",
    borderLeftColor: "#b9421d",
    borderLeftWidth: 4,
  },
  ethicRowWarning: {
    borderColor: "#eadb9b",
    borderLeftColor: "#a97900",
    borderLeftWidth: 4,
  },
  ethicRowSkipped: {
    borderColor: "#d9dddc",
    borderLeftColor: "#8b9692",
    borderLeftWidth: 4,
  },
  ethicSummary: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    padding: 10,
  },
  ethicSummaryText: {
    flex: 1,
    minWidth: 0,
  },
  ethicTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  ethicDot: {
    borderRadius: 8,
    height: 9,
    width: 9,
  },
  ethicDotPassed: {
    backgroundColor: "#2d8a57",
  },
  ethicDotFailed: {
    backgroundColor: "#b9421d",
  },
  ethicDotWarning: {
    backgroundColor: "#a97900",
  },
  ethicDotSkipped: {
    backgroundColor: "#8b9692",
  },
  ethicTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  ethicTitlePassed: {
    color: "#15201d",
  },
  ethicTitleFailed: {
    color: "#15201d",
  },
  ethicTitleWarning: {
    color: "#15201d",
  },
  ethicTitleSkipped: {
    color: "#15201d",
  },
  ethicRule: {
    color: "#58635f",
    fontSize: 13,
    lineHeight: 19,
  },
  ethicStatusBlock: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 104,
  },
  ethicStatus: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  ethicStatusPassed: {
    backgroundColor: "#dff2e8",
    color: "#17623c",
  },
  ethicStatusFailed: {
    backgroundColor: "#ffe0d5",
    color: "#9b3215",
  },
  ethicStatusWarning: {
    backgroundColor: "#fff0bd",
    color: "#7a4f00",
  },
  ethicStatusSkipped: {
    backgroundColor: "#e9eceb",
    color: "#4d5854",
  },
  dropdownIndicator: {
    color: "#006b5f",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyResult: {
    color: "#5d6864",
    fontSize: 14,
    lineHeight: 20,
  },
  progressSection: {
    marginTop: 14,
    width: "100%",
  },
  progressLabel: {
    color: "#1f4b3a",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  progressBar: {
    backgroundColor: "#dfe7e2",
    borderRadius: 999,
    height: 12,
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: {
    backgroundColor: "#0f8a5c",
    height: "100%",
    width: "0%",
  },
  uploadSummary: {
    backgroundColor: "#ffffff",
    borderColor: "#e1e8e5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    padding: 8,
  },
  uploadSummaryItem: {
    flexGrow: 1,
    flexShrink: 1,
    gap: 3,
    minWidth: 160,
  },
  uploadSummaryLabel: {
    color: "#66736d",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  uploadSummaryValue: {
    color: "#15201d",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  breachList: {
    backgroundColor: "#fbfcfb",
    borderColor: "#edf1ef",
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  ethicNote: {
    color: "#4f5b57",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  breachItem: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  breachItemFailed: {
    borderColor: "#f3d8ce",
  },
  breachItemWarning: {
    borderColor: "#efd481",
  },
  breachTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
    marginBottom: 6,
  },
  breachLocation: {
    backgroundColor: "#f6f0ed",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  breachLocationFailed: {
    color: "#9b3215",
  },
  breachLocationWarning: {
    color: "#7a4f00",
  },
  breachHeadline: {
    color: "#15201d",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  breachMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "flex-end",
  },
  breachMeta: {
    backgroundColor: "#f0f3f2",
    borderRadius: 8,
    color: "#4f5b57",
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 3,
    textTransform: "uppercase",
  },
  breachMetaFailed: {
    backgroundColor: "#ffe0d5",
    color: "#9b3215",
  },
  breachMetaWarning: {
    backgroundColor: "#fff0bd",
    color: "#7a4f00",
  },
  breachExcerpt: {
    color: "#202020",
    fontSize: 14,
    lineHeight: 20,
  },
  breachTextSection: {
    backgroundColor: "#fbfcfb",
    borderColor: "#edf1ef",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    padding: 7,
  },
  breachSectionLabel: {
    color: "#596562",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 15,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  triggerBlock: {
    backgroundColor: "#fff6f2",
    borderColor: "#eeb9a6",
    borderLeftWidth: 3,
    borderRadius: 8,
    marginBottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  triggerLabel: {
    color: "#9b3215",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  triggerText: {
    color: "#b42318",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  breachReason: {
    color: "#4e5a56",
    fontSize: 13,
    lineHeight: 19,
  },
  breachRecommendation: {
    color: "#26342f",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  evidenceList: {
    backgroundColor: "#f7faf9",
    borderColor: "#e1e8e5",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
    padding: 7,
  },
  evidenceText: {
    color: "#596562",
    fontSize: 12,
    lineHeight: 18,
  },
  breachSource: {
    color: "#006b5f",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
  },
});
