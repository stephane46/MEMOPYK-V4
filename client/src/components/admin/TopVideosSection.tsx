// client/src/components/admin/TopVideosSection.tsx
import { useDashboardFilters } from "@/analytics/FiltersContext";
import { TopVideosTable } from "./TopVideosTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TopVideosSection() {
  const { startDate, endDate, locale } = useDashboardFilters();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">A. Top Videos Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <TopVideosTable 
          startDate={startDate} 
          endDate={endDate} 
          locale={locale} 
        />
      </CardContent>
    </Card>
  );
}