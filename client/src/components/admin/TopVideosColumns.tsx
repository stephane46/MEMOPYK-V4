// client/src/components/admin/TopVideosColumns.tsx
import { formatSeconds, formatPercent, formatInt, percentClass } from "@/utils/format";

const HeaderWithTip = ({ label, tip }: { label: string; tip: string }) => (
  <div className="cursor-help" title={tip}>
    <span>{label}</span>
  </div>
);

export const topVideosColumns = [
  {
    key: "title",
    header: <HeaderWithTip label="Video" tip="Video title from GA4 tracking" />,
    cell: (row: any) => row.title || "(Untitled)",
  },
  {
    key: "plays",
    header: <HeaderWithTip label="Plays" tip="Number of times the video was started (video_start events)" />,
    cell: (row: any) => formatInt(row.plays),
  },
  {
    key: "avgWatchSeconds",
    header: <HeaderWithTip label="Avg Watch Time" tip="Average watch time per play (total watch time ÷ plays)" />,
    cell: (row: any) => formatSeconds(row.avgWatchSeconds),
  },
  {
    key: "reach50Pct",
    header: <HeaderWithTip label="50% Reach" tip="Percentage of viewers who reached halfway through the video" />,
    cell: (row: any) => (
      <span className={percentClass(row.reach50Pct)}>
        {formatPercent(row.reach50Pct)}
      </span>
    ),
  },
  {
    key: "completePct",
    header: <HeaderWithTip label="100% Complete" tip="Percentage of viewers who watched the entire video" />,
    cell: (row: any) => (
      <span className={percentClass(row.completePct)}>
        {formatPercent(row.completePct)}
      </span>
    ),
  },
];