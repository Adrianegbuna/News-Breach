import { StatusBar } from "expo-status-bar";
import * as DocumentPicker from "expo-document-picker";
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

const DEFAULT_API_BASE_URL = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
const NPC_LOGO_URL = "https://fmicgovng.s3.amazonaws.com/cityhill/wp-content/uploads/2019/04/Logo-NPC-jp.jpg";

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState("");
  const [review, setReview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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

    setIsUploading(true);
    setStatus("");

    try {
      const response = await fetch(`${API_BASE_URL}/uploads`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const uploadRecord = await response.json();
      setReview(uploadRecord.ethicsReview);
      setStatus(uploadRecord.ethicsReview?.message || "File uploaded and reviewed.");
      setSelectedFile(null);
    } catch (error) {
      setStatus(`Upload failed. Backend target: ${API_BASE_URL}. ${error.message || "Check that the backend is running."}`);
      setReview(null);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.shell}>
        <View style={styles.appHeader}>
          <Image source={{ uri: NPC_LOGO_URL }} style={styles.appHeaderLogo} resizeMode="contain" />
          <View style={styles.appHeaderText}>
            <Text style={styles.appHeaderName}>Nigerian Press Council</Text>
            <Text style={styles.appHeaderMotto}>Truth and Fair Play</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>News Breach Detection Form</Text>
          <Text style={styles.subtitle}>Submit one paper for review against defined journalism ethics.</Text>
        </View>

        <View style={styles.formPanel}>
          <Text style={styles.label}>Upload Newspaper</Text>
          <Pressable style={styles.dropzone} onPress={pickFile}>
            <Text style={styles.dropzoneTitle}>
              {selectedFile ? selectedFile.name : "Select a file"}
            </Text>
            <Text style={styles.dropzoneMeta}>
              {selectedFile ? formatFileSize(selectedFile.size) : "PDF, CSV, spreadsheet, document, or image"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.submitButton, (!selectedFile || isUploading) && styles.submitButtonDisabled]}
            onPress={submitUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Upload & Check</Text>
            )}
          </Pressable>

          {!!status && <Text style={styles.status}>{status}</Text>}
          {!!review && <ReviewResults review={review} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewResults({ review }) {
  const reviewItems = review.summary || [];
  const hasBreaches = review.totalBreaches > 0;
  const extractionFailed = review.status === "extraction_failed";
  const hasSkippedEthics = reviewItems.some((item) => item.status === "skipped");
  const reviewSeverityCounts = getSeverityCounts(reviewItems.flatMap((item) => item.breaches || []));
  const [expandedEthics, setExpandedEthics] = useState(() =>
    Object.fromEntries(reviewItems.filter((item) => item.breachCount > 0).map((item) => [item.ethic.id, true])),
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
        <Text style={styles.resultsTitle}>Ethics Review</Text>
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
            {extractionFailed ? "Text needed" : hasSkippedEthics ? "Setup needed" : "Clear"}
          </Text>
        )}
      </View>

      {extractionFailed ? (
        <Text style={styles.emptyResult}>{review.textExtraction?.message || review.message}</Text>
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
              onPress={() => (item.breachCount > 0 || item.note) && toggleEthic(item.ethic.id)}
              disabled={item.breachCount === 0 && !item.note}
            >
              <View style={styles.ethicSummaryText}>
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
                <Text style={styles.ethicRule}>{item.ethic.rule}</Text>
              </View>
              <View style={styles.ethicStatusBlock}>
                {item.status === "failed" ? (
                  <SeverityBreakdown counts={severityCounts} compact />
                ) : (
                  <Text
                    style={[
                      styles.ethicStatus,
                      item.status === "skipped" ? styles.ethicStatusSkipped : styles.ethicStatusPassed,
                    ]}
                  >
                    {formatEthicStatus(item)}
                  </Text>
                )}
                {(item.breachCount > 0 || item.note) && (
                  <Text style={styles.dropdownIndicator}>{expandedEthics[item.ethic.id] ? "Hide" : "Show"}</Text>
                )}
              </View>
            </Pressable>

            {(item.breachCount > 0 || item.note) && expandedEthics[item.ethic.id] && (
              <View style={styles.breachList}>
                {!!item.note && <Text style={styles.ethicNote}>{item.note}</Text>}
                {item.breaches.map((breach) => (
                  <View
                    key={breach.id}
                    style={[
                      styles.breachItem,
                      isMediumSeverity(breach.severity) ? styles.breachItemWarning : styles.breachItemFailed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.breachLocation,
                        isMediumSeverity(breach.severity) ? styles.breachLocationWarning : styles.breachLocationFailed,
                      ]}
                    >
                      Line {breach.lineNumber}
                    </Text>
                    <View style={styles.breachMetaRow}>
                      {!!breach.severity && (
                        <Text
                          style={[
                            styles.breachMeta,
                            isMediumSeverity(breach.severity) ? styles.breachMetaWarning : styles.breachMetaFailed,
                          ]}
                        >
                          Severity: {formatLabel(breach.severity)}
                        </Text>
                      )}
                      {!!breach.confidenceLabel && <Text style={styles.breachMeta}>Confidence: {breach.confidenceLabel}</Text>}
                    </View>
                    <Text style={styles.breachExcerpt}>{breach.excerpt}</Text>
                    {!!breach.triggerText && (
                      <View style={styles.triggerBlock}>
                        <Text style={styles.triggerLabel}>Triggered sentence</Text>
                        <Text style={styles.triggerText}>{breach.triggerText}</Text>
                      </View>
                    )}
                    <Text style={styles.breachReason}>{breach.reason}</Text>
                    {!!breach.recommendation && <Text style={styles.breachRecommendation}>{breach.recommendation}</Text>}
                    {!!breach.evidence?.length && (
                      <View style={styles.evidenceList}>
                        {breach.evidence.map((evidence, index) => (
                          <Text key={`${breach.id}-evidence-${index}`} style={styles.evidenceText}>
                            {evidence.label}: {evidence.value}
                          </Text>
                        ))}
                      </View>
                    )}
                    {!!breach.source?.url && <Text style={styles.breachSource}>{breach.source.url}</Text>}
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

function SeverityBreakdown({ counts, compact = false }) {
  const items = [
    { key: "high", label: compact ? "High" : "High", count: counts.high, style: styles.severityBadgeHigh },
    { key: "medium", label: compact ? "Med" : "Medium", count: counts.medium, style: styles.severityBadgeMedium },
    { key: "low", label: "Low", count: counts.low, style: styles.severityBadgeLow },
  ].filter((item) => item.count > 0);

  if (!items.length) {
    return null;
  }

  return (
    <View style={[styles.severityBreakdown, compact && styles.severityBreakdownCompact]}>
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
    paddingHorizontal: 22,
    paddingVertical: 34,
  },
  appHeader: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d9e5e2",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
    padding: 12,
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
    marginBottom: 28,
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
    padding: 18,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  label: {
    color: "#202020",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  dropzone: {
    alignItems: "center",
    backgroundColor: "#f7faf9",
    borderColor: "#9bb8b0",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1.5,
    minHeight: 132,
    justifyContent: "center",
    padding: 18,
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
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ab1ac",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  status: {
    color: "#35423f",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
    textAlign: "center",
  },
  resultsPanel: {
    borderColor: "#d9ddd8",
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 16,
  },
  resultsHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  resultsTitle: {
    color: "#15201d",
    fontSize: 18,
    fontWeight: "800",
  },
  resultsBadge: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    gap: 6,
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
    paddingHorizontal: 8,
    paddingVertical: 5,
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
  ethicRow: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    overflow: "hidden",
  },
  ethicRowPassed: {
    backgroundColor: "#f4fbf7",
    borderColor: "#badfcc",
  },
  ethicRowFailed: {
    backgroundColor: "#fff7f4",
    borderColor: "#f0c8b9",
  },
  ethicRowWarning: {
    backgroundColor: "#fffaf0",
    borderColor: "#efd481",
  },
  ethicRowSkipped: {
    backgroundColor: "#f7f8f8",
    borderColor: "#d9dddc",
  },
  ethicSummary: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 12,
  },
  ethicSummaryText: {
    flex: 1,
  },
  ethicTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  ethicTitlePassed: {
    color: "#17623c",
  },
  ethicTitleFailed: {
    color: "#9b3215",
  },
  ethicTitleWarning: {
    color: "#7a4f00",
  },
  ethicTitleSkipped: {
    color: "#53605c",
  },
  ethicRule: {
    color: "#58635f",
    fontSize: 13,
    lineHeight: 19,
  },
  ethicStatusBlock: {
    alignItems: "flex-end",
    minWidth: 92,
  },
  ethicStatus: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    color: "#5d6864",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },
  emptyResult: {
    color: "#5d6864",
    fontSize: 14,
    lineHeight: 20,
  },
  breachList: {
    borderColor: "#f0c8b9",
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  ethicNote: {
    color: "#4f5b57",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  breachItem: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  breachItemFailed: {
    borderColor: "#f3d8ce",
  },
  breachItemWarning: {
    borderColor: "#efd481",
  },
  breachLocation: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  breachLocationFailed: {
    color: "#9b3215",
  },
  breachLocationWarning: {
    color: "#7a4f00",
  },
  breachMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  breachMeta: {
    backgroundColor: "#f0f3f2",
    borderRadius: 8,
    color: "#4f5b57",
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    marginBottom: 8,
  },
  triggerBlock: {
    backgroundColor: "#fff2ee",
    borderColor: "#f0b39e",
    borderLeftWidth: 3,
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    color: "#68736f",
    fontSize: 12,
    lineHeight: 18,
  },
  breachRecommendation: {
    color: "#35423f",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 8,
  },
  evidenceList: {
    borderColor: "#edf0ef",
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
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
