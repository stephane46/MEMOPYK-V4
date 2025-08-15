// client/src/components/admin/TopVideosTable.tsx
import { useTopVideos } from "@/hooks/useTopVideos";
import { topVideosColumns } from "./TopVideosColumns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TopVideosTable({ startDate, endDate, locale }: { startDate: string; endDate: string; locale: "all"|"fr-FR"|"en-US" }) {
  const { data, loading, error } = useTopVideos({ startDate, endDate, locale });

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading top videos…</div>;
  if (error)   return <div className="p-4 text-sm text-red-600">Error: {error}</div>;
  if (!data.length) return <div className="p-4 text-sm text-gray-500">No data for this range.</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {topVideosColumns.map((column) => (
              <TableHead key={column.key}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
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
  );
}