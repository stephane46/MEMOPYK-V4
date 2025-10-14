import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, UserCheck, Mail, Globe, CheckCircle } from 'lucide-react';
import { DateTime } from 'luxon';

interface PartnerSubmission {
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
  const { data: summary, isLoading } = useQuery<PartnerSummaryData>({
    queryKey: ['/api/partners/summary'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleDownload = () => {
    window.open('/api/partners/download', '_blank');
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
        <Button 
          onClick={handleDownload}
          className="bg-[#D67C4A] hover:bg-[#B85A2A] text-white"
          data-testid="button-download-partners"
        >
          <Download className="h-4 w-4 mr-2" />
          Télécharger Excel
        </Button>
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
          <p>• Les dates sont affichées au format français (Europe/Paris)</p>
          <p>• Une notification email est envoyée automatiquement à ngoc@memopyk.com</p>
        </CardContent>
      </Card>
    </div>
  );
}
