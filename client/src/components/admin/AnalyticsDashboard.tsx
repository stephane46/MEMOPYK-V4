// client/src/components/admin/AnalyticsDashboard.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { downloadPDF, formatDateForFilename } from "@/lib/export-utils";
import AnalyticsDailyOverviewCard from "./AnalyticsDailyOverviewCard";
import { AnalyticsVideoPerformanceCard } from "./AnalyticsVideoPerformanceCard";
import AnalyticsCtaPerformanceCard from "./AnalyticsCtaPerformanceCard";
import AnalyticsGeoDistributionCard from "./AnalyticsGeoDistributionCard";

export function AnalyticsDashboard() {
  const [exportingPDF, setExportingPDF] = React.useState(false);

  const handleExportPDF = React.useCallback(async () => {
    setExportingPDF(true);
    try {
      const filename = `analytics_comprehensive_report_${formatDateForFilename()}.pdf`;
      await downloadPDF(filename);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExportingPDF(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
        <Button 
          variant="default" 
          onClick={handleExportPDF} 
          disabled={exportingPDF}
          className="gap-2 bg-[#D67C4A] hover:bg-[#D67C4A]/90"
        >
          <FileText className={`h-4 w-4 ${exportingPDF ? "animate-pulse" : ""}`} />
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