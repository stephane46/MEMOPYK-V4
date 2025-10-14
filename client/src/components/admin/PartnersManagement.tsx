import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, UserCheck, Mail, Globe, CheckCircle, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PartnerSubmission {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  submitted: string;
}

interface PartnerSummaryData {
  partners: PartnerSubmission[];
  count: number;
}

export default function PartnersManagement() {
  const { toast } = useToast();
  const { data: summary, isLoading } = useQuery<PartnerSummaryData>({
    queryKey: ['/api/partners/summary'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const deleteMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partners/summary'] });
      toast({
        title: "Partenaire supprimé",
        description: "Le partenaire a été supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le partenaire",
        variant: "destructive",
      });
    }
  });

  const handleDownload = () => {
    window.open('/api/partners/download', '_blank');
  };

  const handleDelete = (partnerId: number, partnerName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${partnerName} ?`)) {
      deleteMutation.mutate(partnerId);
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const dt = DateTime.fromISO(dateStr, { zone: 'Europe/Paris' });
      if (!dt.isValid) return dateStr;
      return dt.toFormat('dd/MM/yyyy HH:mm', { locale: 'fr' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Partenaires</h2>
          <p className="text-gray-600 dark:text-gray-700">Gestion des demandes de partenariat</p>
        </div>
        <button 
          onClick={handleDownload}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 24px',
            backgroundColor: '#D67C4A',
            color: '#ffffff',
            border: '2px solid #D67C4A',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
          data-testid="button-download-partners"
        >
          <Download className="h-4 w-4 mr-2" style={{ color: '#ffffff' }} />
          Télécharger Excel
        </button>
      </div>

      {/* Summary Card */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#D67C4A]" />
            Résumé des Demandes
          </CardTitle>
          <CardDescription>
            Total de {summary?.count || 0} demande{(summary?.count || 0) > 1 ? 's' : ''} reçue{(summary?.count || 0) > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : !summary || summary.partners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune demande de partenariat pour le moment
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Partenaire</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Téléphone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Ville</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Pays</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Date de soumission</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.partners.map((partner, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      data-testid={`partner-row-${idx}`}
                    >
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {partner.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {partner.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                        {partner.phone || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                        {partner.city || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          {partner.country}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(partner.submitted)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <button
                          onClick={() => handleDelete(partner.id, partner.name)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-lg cursor-pointer transition-all hover:scale-105 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: '#dc2626 !important',
                            color: '#ffffff !important',
                            border: '1px solid #dc2626 !important'
                          }}
                          data-testid={`button-delete-partner-${partner.id}`}
                        >
                          <Trash2 className="h-4 w-4" style={{ color: '#ffffff !important' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>• Les demandes sont sauvegardées automatiquement dans un fichier Excel</p>
          <p>• Cliquez sur "Télécharger Excel" pour obtenir le fichier complet avec tous les détails</p>
          <p>• Le tableau affiche les 10 dernières demandes reçues</p>
          <p>• Une notification email est envoyée automatiquement à ngoc@memopyk.com</p>
        </CardContent>
      </Card>
    </div>
  );
}
