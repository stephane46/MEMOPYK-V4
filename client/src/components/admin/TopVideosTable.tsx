// client/src/components/admin/TopVideosTable.tsx
import { useState, useMemo } from "react";
import { useTopVideos } from "@/hooks/useTopVideos";
import { topVideosColumns } from "./TopVideosColumns";
import { ExportTopVideosCSV } from "./ExportTopVideosCSV";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TopVideosTable({ startDate, endDate, locale }: { startDate: string; endDate: string; locale: "all"|"fr-FR"|"en-US" }) {
  const { data, loading, error } = useTopVideos({ startDate, endDate, locale });
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedData = useMemo(() => {
    if (!sortColumn || !data.length) return data;
    
    const column = topVideosColumns.find(col => col.key === sortColumn);
    if (!column?.sortFn) return data;
    
    const sorted = [...data].sort(column.sortFn);
    return sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortColumn, sortDirection]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('desc');
    }
  };

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading top videos…</div>;
  if (error)   return <div className="p-4 text-sm text-red-600">Error: {error}</div>;
  if (!data.length) return <div className="p-4 text-sm text-gray-500">No data for this range.</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportTopVideosCSV rows={sortedData} />
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {topVideosColumns.map((column) => (
                <TableHead key={column.key}>
                  {column.header({
                    sortDirection: sortColumn === column.key ? sortDirection : null,
                    onSort: () => handleSort(column.key)
                  })}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, index) => (
              <TableRow key={row.video_id || index}>
                {topVideosColumns.map((column) => (
                  <TableCell key={column.key}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}