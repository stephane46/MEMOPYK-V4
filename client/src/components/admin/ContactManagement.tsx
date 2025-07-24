import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest } from '@/lib/queryClient';
import { 
  Mail, 
  Phone, 
  User, 
  MessageSquare, 
  Calendar, 
  Trash2,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'responded' | 'closed';
  created_at: string;
  updated_at?: string;
}

export const ContactManagement: React.FC = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const getText = (fr: string, en: string) => language === 'fr-FR' ? fr : en;

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    queryFn: () => apiRequest('/api/contacts')
  });

  // Update contact status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ contactId, status }: { contactId: string; status: string }) =>
      apiRequest(`/api/contacts/${contactId}`, 'PATCH', { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: getText('Statut mis à jour', 'Status updated'),
        description: getText('Le statut du contact a été mis à jour.', 'Contact status has been updated.')
      });
    },
    onError: () => {
      toast({
        title: getText('Erreur', 'Error'),
        description: getText('Erreur lors de la mise à jour du statut.', 'Error updating status.'),
        variant: 'destructive'
      });
    }
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) => apiRequest(`/api/contacts/${contactId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      toast({
        title: getText('Contact supprimé', 'Contact deleted'),
        description: getText('Le contact a été supprimé avec succès.', 'Contact has been deleted successfully.')
      });
    },
    onError: () => {
      toast({
        title: getText('Erreur', 'Error'),
        description: getText('Erreur lors de la suppression.', 'Error deleting contact.'),
        variant: 'destructive'
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', text: string, icon: React.ReactNode }> = {
      'new': { 
        variant: 'destructive', 
        text: getText('Nouveau', 'New'),
        icon: <Clock className="w-3 h-3" />
      },
      'responded': { 
        variant: 'default', 
        text: getText('Répondu', 'Responded'),
        icon: <CheckCircle className="w-3 h-3" />
      },
      'closed': { 
        variant: 'secondary', 
        text: getText('Fermé', 'Closed'),
        icon: <XCircle className="w-3 h-3" />
      }
    };

    const config = variants[status] || variants['new'];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'fr-FR' ? 'fr-FR' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const contactStats = {
    total: contacts.length,
    new: contacts.filter((c: Contact) => c.status === 'new').length,
    responded: contacts.filter((c: Contact) => c.status === 'responded').length,
    closed: contacts.filter((c: Contact) => c.status === 'closed').length
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{getText('Chargement des contacts...', 'Loading contacts...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {getText('Gestion des Contacts', 'Contact Management')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {getText('Gérez les messages et demandes de contact des clients', 'Manage customer messages and contact requests')}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{getText('Total', 'Total')}</p>
                <p className="text-2xl font-bold text-gray-900">{contactStats.total}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{getText('Nouveaux', 'New')}</p>
                <p className="text-2xl font-bold text-red-600">{contactStats.new}</p>
              </div>
              <Clock className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{getText('Répondus', 'Responded')}</p>
                <p className="text-2xl font-bold text-green-600">{contactStats.responded}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{getText('Fermés', 'Closed')}</p>
                <p className="text-2xl font-bold text-gray-600">{contactStats.closed}</p>
              </div>
              <XCircle className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {contacts.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {getText('Aucun contact', 'No contacts')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {getText('Les messages de contact apparaîtront ici.', 'Contact messages will appear here.')}
            </p>
          </div>
        ) : (
          contacts.map((contact: Contact) => (
            <Card key={contact.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-4 h-4 text-orange-500" />
                      {contact.name}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {contact.email}
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(contact.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    {contact.subject}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                    {contact.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(contact.created_at)}
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <Select
                    value={contact.status}
                    onValueChange={(status) => updateStatusMutation.mutate({ 
                      contactId: contact.id, 
                      status 
                    })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{getText('Nouveau', 'New')}</SelectItem>
                      <SelectItem value="responded">{getText('Répondu', 'Responded')}</SelectItem>
                      <SelectItem value="closed">{getText('Fermé', 'Closed')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(contact)}
                    disabled={deleteContactMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {getText('Supprimer le contact', 'Delete Contact')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getText(
                `Êtes-vous sûr de vouloir supprimer le contact de ${contactToDelete?.name}? Cette action ne peut pas être annulée.`,
                `Are you sure you want to delete the contact from ${contactToDelete?.name}? This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {getText('Annuler', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contactToDelete && deleteContactMutation.mutate(contactToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {getText('Supprimer', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};