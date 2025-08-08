import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { htmlSanitizer } from '../lib/sanitize-html';
import type { LegalDocument } from '@shared/schema';

const documentTypeMap: Record<string, string> = {
  'privacy-policy': 'politique-confidentialite',
  'terms-of-service': 'cgu', 
  'cookie-policy': 'politique-cookies',
  'terms-of-sale': 'cgv',
  'legal-notice': 'mentions-legales'
};

export function LegalDocumentPage() {
  const { language } = useLanguage();
  const [, params] = useRoute('/:lang/legal/:docType');
  
  const documentType = params?.docType ? documentTypeMap[params.docType] : null;
  
  const { data: documents, isLoading } = useQuery<LegalDocument[]>({
    queryKey: ['/api/legal'],
  });

  // Scroll to top when document loads or changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [documentType, documents]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{language === 'fr-FR' ? 'Chargement...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!documentType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600">
            {language === 'fr-FR' ? 'Document non trouvé' : 'Document not found'}
          </p>
        </div>
      </div>
    );
  }

  const document = documents?.find(doc => 
    doc.type === documentType && (doc.isActive || (doc as any).is_active)
  );
  
  // Test: Try finding document without isActive check
  const documentAnyStatus = documents?.find(doc => 
    doc.type === documentType
  );

  // Legal document page ready

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {language === 'fr-FR' ? 'Document non disponible' : 'Document not available'}
          </h1>
          <p className="text-gray-600">
            {language === 'fr-FR' 
              ? 'Ce document légal n\'est pas encore disponible.' 
              : 'This legal document is not yet available.'
            }
          </p>
        </div>
      </div>
    );
  }

  const title = language === 'fr-FR' ? (document.titleFr || (document as any).title_fr) : (document.titleEn || (document as any).title_en);
  const content = language === 'fr-FR' ? (document.contentFr || (document as any).content_fr) : (document.contentEn || (document as any).content_en);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">{title}</h1>
            
            <div className="prose prose-sm max-w-none [&>*]:mb-2 [&>p]:mb-2 [&>h1]:mb-3 [&>h2]:mb-3 [&>h3]:mb-3 [&>h4]:mb-3 [&>h5]:mb-3 [&>h6]:mb-3 [&>ul]:mb-2 [&>ol]:mb-2 [&>blockquote]:mb-2">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: htmlSanitizer.sanitize(content || '') 
                }}
              />
            </div>
            
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {language === 'fr-FR' 
                  ? `Dernière mise à jour: ${document.updatedAt ? new Date(document.updatedAt).toLocaleDateString('fr-FR') : 'Date inconnue'}`
                  : `Last updated: ${document.updatedAt ? new Date(document.updatedAt).toLocaleDateString('en-US') : 'Unknown date'}`
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}