// client/src/components/admin/TopVideosSection.tsx
import { useDashboardFilters } from "@/analytics/FiltersContext";
import { TopVideosTable } from "./TopVideosTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AsyncState } from "./AsyncState";

interface TopVideosSectionProps {
  data?: any[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function TopVideosSection({ 
  data, 
  isLoading = false, 
  error = null, 
  onRefresh 
}: TopVideosSectionProps) {
  const { startDate, endDate, locale } = useDashboardFilters();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">A. Top Videos Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <AsyncState
          loading={isLoading}
          error={error}
          hasData={!!data && data.length > 0}
          emptyText="No videos found for this date range."
          loadingText="Loading top videos…"
          onRetry={onRefresh}
        >
          <TopVideosTable 
            data={data} 
          />
        </AsyncState>
      </CardContent>
    </Card>
  );
}