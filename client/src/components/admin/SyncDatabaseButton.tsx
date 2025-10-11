import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SyncDatabaseButtonProps {
  endpoint: string;
  dataType: string;
  queryKeys?: string[];
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function SyncDatabaseButton({ 
  endpoint, 
  dataType, 
  queryKeys = [], 
  className = '',
  size = 'default'
}: SyncDatabaseButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      console.log(`🔄 SYNC: Requesting ${dataType} database → JSON export...`);
      return apiRequest(endpoint, 'POST');
    },
    onSuccess: (response: any) => {
      console.log(`✅ SYNC: ${dataType} success -`, response);
      toast({ 
        title: "✅ Synchronisation réussie", 
        description: `${response.itemsExported} éléments exportés vers JSON`,
        className: "bg-emerald-50 border-emerald-200 text-emerald-900"
      });
      // Invalidate specified query keys
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
    onError: (error: any) => {
      console.error(`❌ SYNC: ${dataType} error -`, error);
      toast({ 
        title: "❌ Erreur de synchronisation", 
        description: error?.message || "Échec de l'export",
        variant: "destructive"
      });
    }
  });

  const handleSync = () => {
    if (confirm(`Synchroniser ${dataType} vers JSON?\n\nCela va exporter toutes les modifications de la base de données Supabase vers les fichiers JSON locaux.`)) {
      syncMutation.mutate();
    }
  };

  return (
    <Button
      onClick={handleSync}
      size={size}
      variant="outline"
      disabled={syncMutation.isPending}
      className={`border-none shadow-lg font-bold ${className}`}
      style={{ 
        backgroundColor: '#f97316',
        color: '#ffffff',
        borderColor: 'transparent'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
    >
      <RefreshCw 
        className={`${syncMutation.isPending ? 'animate-spin' : ''} ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} mr-2`}
        style={{ color: '#ffffff' }}
      />
      <span style={{ color: '#ffffff' }}>
        {syncMutation.isPending ? 'Synchronisation...' : 'SYNC DATABASE → JSON'}
      </span>
    </Button>
  );
}
