import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Shield, Eye, EyeOff, Globe, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAnalyticsNewFilters } from '@/admin/analyticsNew/analyticsNewFilters.store';

interface IpExclusion {
  id: string;
  ip_cidr: string;
  label: string;
  user_agent?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface IpExclusionsManagerProps {
  className?: string;
}

export const IpExclusionsManager: React.FC<IpExclusionsManagerProps> = ({ 
  className = '' 
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExclusion, setSelectedExclusion] = useState<IpExclusion | null>(null);
  const [currentIpVisible, setCurrentIpVisible] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get analytics filters (moved from global filters)
  const {
    sinceDate,
    sinceDateEnabled,
    setSinceDate,
    setSinceDateEnabled,
  } = useAnalyticsNewFilters();

  // Form state
  const [formData, setFormData] = useState({
    ip_cidr: '',
    label: '',
    user_agent: '',
    active: true,
  });

  // Get current IP
  const { data: currentIp } = useQuery<string>({
    queryKey: ['/api/analytics/current-ip'],
  });

  // Get IP exclusions
  const { data: exclusions = [], isLoading, error } = useQuery<IpExclusion[]>({
    queryKey: ['/api/admin/analytics/exclusions'],
  });

  // Create exclusion mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<IpExclusion, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch('/api/admin/analytics/exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create exclusion');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/exclusions'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'IP exclusion created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    },
  });

  // Update exclusion mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IpExclusion> }) => {
      const response = await fetch(`/api/admin/analytics/exclusions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update exclusion');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/exclusions'] });
      setIsEditDialogOpen(false);
      setSelectedExclusion(null);
      resetForm();
      toast({ title: 'Success', description: 'IP exclusion updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    },
  });

  // Delete exclusion mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/analytics/exclusions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete exclusion');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/exclusions'] });
      toast({ title: 'Success', description: 'IP exclusion deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    },
  });

  // Toggle active status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await fetch(`/api/admin/analytics/exclusions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error('Failed to toggle exclusion');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/exclusions'] });
    },
  });

  const resetForm = () => {
    setFormData({
      ip_cidr: '',
      label: '',
      user_agent: '',
      active: true,
    });
  };

  const handleAdd = () => {
    setIsAddDialogOpen(true);
    resetForm();
  };

  const handleEdit = (exclusion: IpExclusion) => {
    setSelectedExclusion(exclusion);
    setFormData({
      ip_cidr: exclusion.ip_cidr,
      label: exclusion.label,
      user_agent: exclusion.user_agent || '',
      active: exclusion.active,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitAdd = () => {
    if (!formData.ip_cidr.trim() || !formData.label.trim()) {
      toast({ title: 'Error', description: 'IP/CIDR and label are required', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    if (!selectedExclusion || !formData.ip_cidr.trim() || !formData.label.trim()) {
      toast({ title: 'Error', description: 'IP/CIDR and label are required', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({ id: selectedExclusion.id, data: formData });
  };

  const handleQuickAddCurrentIp = () => {
    if (currentIp) {
      setFormData({
        ip_cidr: currentIp,
        label: `Admin IP - ${new Date().toLocaleDateString()}`,
        user_agent: '',
        active: true,
      });
      setIsAddDialogOpen(true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMaskedIp = (ip: string) => {
    // Mask middle octets for privacy
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.***.***.${parts[3]}`;
    }
    return ip.slice(0, 4) + '****' + ip.slice(-4);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Start Date Filter Section */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-orange-800 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Start Date Filter
          </h3>
          <p className="text-xs text-orange-600 mt-1">
            Standard reports only; Live View shows last ~30 min.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="since-date-toggle"
              checked={sinceDateEnabled}
              onCheckedChange={setSinceDateEnabled}
              data-testid="since-date-toggle"
              className="switch-orange"
            />
            <Label htmlFor="since-date-toggle" className="text-sm font-medium text-orange-700">
              Enable Start Date Filter
            </Label>
          </div>
          {sinceDateEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-orange-700">From:</span>
              <Input
                type="date"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
                className="w-32 border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                placeholder="Select start date"
                data-testid="since-date-input"
              />
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">IP Exclusions</h2>
          <p className="text-gray-600 mt-1">
            Manage IP addresses and user agents excluded from analytics tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentIp && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Your IP: {currentIpVisible ? currentIp : getMaskedIp(currentIp)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentIpVisible(!currentIpVisible)}
                data-testid="toggle-ip-visibility"
              >
                {currentIpVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickAddCurrentIp}
                data-testid="quick-add-current-ip"
              >
                <Shield className="h-4 w-4 mr-1" />
                Exclude My IP
              </Button>
            </div>
          )}
          <Button onClick={handleAdd} data-testid="add-exclusion">
            <Plus className="h-4 w-4 mr-1" />
            Add Exclusion
          </Button>
        </div>
      </div>

      {/* Exclusions Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">Loading exclusions...</div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-500">Failed to load exclusions</div>
          </div>
        ) : exclusions.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 mb-2">No IP exclusions configured</div>
            <div className="text-sm text-gray-400">Add IP addresses to exclude from analytics tracking</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label + IP/CIDR</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exclusions.map((exclusion) => (
                <TableRow key={exclusion.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">{exclusion.label}</div>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {exclusion.ip_cidr}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    {exclusion.user_agent ? (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {exclusion.user_agent}
                      </code>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={exclusion.active}
                        onCheckedChange={(active) => 
                          toggleMutation.mutate({ id: exclusion.id, active })
                        }
                        disabled={toggleMutation.isPending}
                        data-testid={`toggle-exclusion-${exclusion.id}`}
                      />
                      <Badge variant={exclusion.active ? "default" : "secondary"}>
                        {exclusion.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(exclusion.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(exclusion)}
                        title="Edit label"
                        data-testid={`edit-exclusion-${exclusion.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => 
                          toggleMutation.mutate({ id: exclusion.id, active: !exclusion.active })
                        }
                        disabled={toggleMutation.isPending}
                        title="Toggle active"
                        data-testid={`toggle-action-${exclusion.id}`}
                      >
                        {exclusion.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(exclusion.id)}
                        disabled={deleteMutation.isPending}
                        title="Delete"
                        data-testid={`delete-exclusion-${exclusion.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="add-exclusion-dialog">
          <DialogHeader>
            <DialogTitle>Add IP Exclusion</DialogTitle>
            <DialogDescription>
              Add an IP address or CIDR range to exclude from analytics tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ip_cidr">IP Address or CIDR Range</Label>
              <Input
                id="ip_cidr"
                value={formData.ip_cidr}
                onChange={(e) => setFormData({ ...formData, ip_cidr: e.target.value })}
                placeholder="192.168.1.1 or 192.168.1.0/24"
                data-testid="exclusion-ip-input"
              />
            </div>
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Admin IP, Office Network"
                data-testid="exclusion-label-input"
              />
            </div>
            <div>
              <Label htmlFor="user_agent">User Agent (Optional)</Label>
              <Input
                id="user_agent"
                value={formData.user_agent}
                onChange={(e) => setFormData({ ...formData, user_agent: e.target.value })}
                placeholder="e.g., Chrome/120.0, bot, crawler"
                data-testid="exclusion-useragent-input"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(active) => setFormData({ ...formData, active })}
                data-testid="exclusion-active-toggle"
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              data-testid="cancel-add-exclusion"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={createMutation.isPending}
              data-testid="confirm-add-exclusion"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Exclusion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="edit-exclusion-dialog">
          <DialogHeader>
            <DialogTitle>Edit IP Exclusion</DialogTitle>
            <DialogDescription>
              Update the IP exclusion settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_ip_cidr">IP Address or CIDR Range</Label>
              <Input
                id="edit_ip_cidr"
                value={formData.ip_cidr}
                onChange={(e) => setFormData({ ...formData, ip_cidr: e.target.value })}
                placeholder="192.168.1.1 or 192.168.1.0/24"
                data-testid="edit-exclusion-ip-input"
              />
            </div>
            <div>
              <Label htmlFor="edit_label">Label</Label>
              <Input
                id="edit_label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Admin IP, Office Network"
                data-testid="edit-exclusion-label-input"
              />
            </div>
            <div>
              <Label htmlFor="edit_user_agent">User Agent (Optional)</Label>
              <Input
                id="edit_user_agent"
                value={formData.user_agent}
                onChange={(e) => setFormData({ ...formData, user_agent: e.target.value })}
                placeholder="e.g., Chrome/120.0, bot, crawler"
                data-testid="edit-exclusion-useragent-input"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_active"
                checked={formData.active}
                onCheckedChange={(active) => setFormData({ ...formData, active })}
                data-testid="edit-exclusion-active-toggle"
              />
              <Label htmlFor="edit_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="cancel-edit-exclusion"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={updateMutation.isPending}
              data-testid="confirm-edit-exclusion"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Exclusion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};