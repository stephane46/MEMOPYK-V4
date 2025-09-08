export type TrendPoint = { date: string; value: number };

export type KpisResponse = {
  kpis: {
    sessions: { value: number; trend: TrendPoint[] };
    plays: { value: number; trend: TrendPoint[] };
    completions: { value: number; trend: TrendPoint[] };
    avgWatch: { value: number; trend: TrendPoint[] };
  };
  timestamp?: string;
  cached?: boolean;
};

export type TopVideoRow = {
  videoId: string;
  title: string;
  plays: number;
  completions: number;
  completionRate: number; // 0-100 as integer percentage
  avgEngagement?: number;
};

export type TopVideosResponse = { 
  topVideos: TopVideoRow[];
  timestamp?: string;
  cached?: boolean;
};

export type ProgressBucket = 10 | 25 | 50 | 75 | 90;

export type VideoFunnelResponse = {
  funnel: Array<{ bucket: ProgressBucket; count: number }>;
  timestamp?: string;
  cached?: boolean;
};

export type ReportParams = {
  report: "kpis" | "topVideos" | "videoFunnel";
  videoId?: string;
  preset?: "today" | "yesterday" | "7d" | "30d" | "90d";
  startDate?: string; // ISO
  endDate?: string;   // ISO
  lang?: string;      // locale
  country?: string;   // ISO2
};