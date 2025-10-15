import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Map, Search, ChevronLeft, ChevronRight, Pencil, Trash2, MapPin } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Partner {
  id: number;
  partner_type: string;
  partner_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  status: string;
  is_active: boolean;
  show_on_map: boolean;
  lat: number | null;
  lng: number | null;
  website: string;
  submitted_at: string;
}

interface PartnersResponse {
  partners: Partner[];
  total: number;
  page: number;
  totalPages: number;
}

export default function PartnersManagementEnhanced() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const limit = 20;

  const buildQueryKey = () => {
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString() 
    });
    if (search) params.append('search', search);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (typeFilter !== 'all') params.append('partner_type', typeFilter);
    return `/api/partners?${params.toString()}`;
  };

  const { data, isLoading } = useQuery<PartnersResponse>({
    queryKey: ['partners', page, search, statusFilter, typeFilter],
    queryFn: async () => {
      const response = await fetch(buildQueryKey());
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/partners/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: "Partner deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error deleting partner", variant: "destructive" });
    }
  });

  const exportMapMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/partners/export-map', { method: 'POST' });
      if (!response.ok) throw new Error('Export failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Map data updated",
        description: `${data.count} partner(s) exported to /partners.json`,
      });
    },
    onError: () => {
      toast({ title: "Export failed", variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'Approved': 'default',
      'Pending': 'secondary',
      'Rejected': 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  return (
    <Card className="border-white/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Partner Management</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={() => window.open('/api/partners/download', '_blank')}
              variant="outline"
              size="sm"
              data-testid="button-download-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel
            </Button>
            <Button
              onClick={() => exportMapMutation.mutate()}
              variant="outline"
              size="sm"
              disabled={exportMapMutation.isPending}
              data-testid="button-export-map"
            >
              <Map className="h-4 w-4 mr-2" />
              Export to Map
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              data-testid="input-search-partners"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="bg-white border-gray-300 text-gray-900" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="bg-white border-gray-300 text-gray-900" data-testid="select-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="digitization">Digitization</SelectItem>
              <SelectItem value="restoration">Restoration</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Partners Table */}
        <div className="rounded-md border border-gray-300 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-gray-50">
                <TableHead className="text-gray-700 font-semibold">Partner</TableHead>
                <TableHead className="text-gray-700 font-semibold">Type</TableHead>
                <TableHead className="text-gray-700 font-semibold">Contact</TableHead>
                <TableHead className="text-gray-700 font-semibold">Location</TableHead>
                <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                <TableHead className="text-gray-700 font-semibold">Map</TableHead>
                <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    Loading partners...
                  </TableCell>
                </TableRow>
              ) : !data?.partners.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No partners found
                  </TableCell>
                </TableRow>
              ) : (
                data.partners.map((partner) => (
                  <TableRow key={partner.id} className="border-gray-200 hover:bg-gray-50">
                    <TableCell className="text-gray-900 font-medium">
                      {partner.partner_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs text-gray-700 border-gray-300">
                        {partner.partner_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700 text-sm">
                      <div>{partner.contact_name}</div>
                      <div className="text-xs text-gray-500">{partner.email}</div>
                    </TableCell>
                    <TableCell className="text-gray-700 text-sm">
                      <div>{partner.city}</div>
                      <div className="text-xs text-gray-500">{partner.country}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(partner.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {partner.show_on_map && partner.lat && partner.lng ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-300">
                            <MapPin className="h-3 w-3 mr-1" />
                            Visible
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          data-testid={`button-edit-${partner.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(partner.id)}
                          disabled={deleteMutation.isPending}
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-${partner.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} partners
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-white border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm text-gray-700 px-3">
                Page {page} of {data.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="bg-white border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
