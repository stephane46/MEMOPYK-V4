// client/src/components/admin/AnalyticsDashboard.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { downloadFile } from "@/utils/downloadFile";
import AnalyticsDailyOverviewCard from "./AnalyticsDailyOverviewCard";
import { AnalyticsVideoPerformanceCard } from "./AnalyticsVideoPerformanceCard";
import AnalyticsCtaPerformanceCard from "./AnalyticsCtaPerformanceCard";
import AnalyticsGeoDistributionCard from "./AnalyticsGeoDistributionCard";

export function AnalyticsDashboard() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          onClick={() => downloadFile(`/api/analytics/export/pdf`, "analytics_full_report.pdf")}
        >
          <FileDown className="h-4 w-4" />
          Export Full Report (PDF)
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Row 1 */}
        <div className="md:col-span-2 xl:col-span-2">
          <AnalyticsDailyOverviewCard />
        </div>
        <div>
          <AnalyticsCtaPerformanceCard />
        </div>

        {/* Row 2 */}
        <div className="md:col-span-2 xl:col-span-2">
          <AnalyticsVideoPerformanceCard dateRange="30" />
        </div>
        <div>
          <AnalyticsGeoDistributionCard />
        </div>
      </div>
    </div>
  );
}