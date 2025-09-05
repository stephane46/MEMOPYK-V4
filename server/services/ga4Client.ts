// server/services/ga4Client.ts
// A single entry point to GA4's RunReport with mock fallback.

// Force mock mode for development/testing
const GA4_MOCK = true; // Set to false when GA4 credentials are available

// GA4_MOCK is forced to true for development
// Change to false when real GA4 credentials are available

// ---- Types (minimal) ----
type RunReportRequest = {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter?: any; // GA4 expression
  metricFilter?: any;
  orderBys?: any[];
  limit?: number | string;
};

type RunReportResponse = {
  rows?: Array<{
    dimensionValues: Array<{ value: string }>;
    metricValues: Array<{ value: string }>;
  }>;
};

// ---- PUBLIC API ----
export async function runGa4Report(payload: RunReportRequest): Promise<RunReportResponse> {
  if (GA4_MOCK) return runGa4ReportMock(payload);
  return runGa4ReportReal(payload);
}

// =========================
// MOCK IMPLEMENTATION
// =========================

function pickMetricValue(metricName: string, base = 100): string {
  // naive generator for stable-ish numbers
  const hash = [...metricName].reduce((a, c) => a + c.charCodeAt(0), 0);
  return String(base + (hash % 37));
}

function* dateRangeDays(startISO: string, endISO: string) {
  const start = new Date(startISO + "T00:00:00Z");
  const end = new Date(endISO + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    yield `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}`;
  }
}

function mockRowsForDates(metrics: string[], startISO: string, endISO: string) {
  const rows: RunReportResponse["rows"] = [];
  for (const day of dateRangeDays(startISO, endISO)) {
    rows!.push({
      dimensionValues: [{ value: day }],
      metricValues: metrics.map((m) => ({ value: pickMetricValue(m, m === "sessions" ? 120 : 90) })),
    });
  }
  return rows!;
}

function mockRowsForTopVideos(metrics: string[]) {
  // Three videos, with fake counts
  const vids = [
    { id: "vid001", title: "Birthday Highlights" },
    { id: "vid002", title: "Wedding Film" },
    { id: "vid003", title: "Travel Memories" },
  ];
  return vids.map((v, i) => ({
    dimensionValues: [{ value: v.id }, { value: v.title }],
    metricValues: metrics.map(() => ({ value: String(300 - i * 60) })), // 300,240,180
  }));
}

function mockRowsForFunnel() {
  const buckets = ["10", "25", "50", "75", "90"];
  const counts = [280, 220, 160, 120, 170]; // note: not strictly monotonic to reflect real data noise
  return buckets.map((b, i) => ({
    dimensionValues: [{ value: b }],
    metricValues: [{ value: String(counts[i]) }],
  }));
}

async function runGa4ReportMock(payload: RunReportRequest): Promise<RunReportResponse> {
  const { dateRanges, dimensions = [], metrics } = payload;
  const [range] = dateRanges;
  const dimNames = dimensions.map((d) => d.name);

  // Very small router based on requested dimensions
  if (dimNames.length === 1 && dimNames[0] === "date") {
    return { rows: mockRowsForDates(metrics.map((m) => m.name), range.startDate, range.endDate) };
  }

  if (
    dimNames.length === 2 &&
    dimNames[0] === "customEvent:video_id" &&
    dimNames[1] === "customEvent:video_title"
  ) {
    return { rows: mockRowsForTopVideos(metrics.map((m) => m.name)) };
  }

  if (dimNames.length === 1 && dimNames[0] === "customEvent:progress_bucket") {
    return { rows: mockRowsForFunnel() };
  }

  // Fallback: empty
  return { rows: [] };
}

// =========================
// REAL IMPLEMENTATION
// =========================

async function runGa4ReportReal(payload: RunReportRequest): Promise<RunReportResponse> {
  /**
   * Replace this with your actual GA4 Data API client code.
   * Example using @google-analytics/data:
   *
   * import { BetaAnalyticsDataClient } from "@google-analytics/data";
   * const client = new BetaAnalyticsDataClient({ credentials: { ...credentials } });
   * const [resp] = await client.runReport({
   *   property: `properties/${process.env.GA4_PROPERTY_ID}`,
   *   ...payload
   * });
   * return resp as any;
   */
  throw new Error("runGa4ReportReal not implemented yet (set GA4_MOCK=true to use mock)");
}