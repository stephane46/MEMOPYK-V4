import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { Phone, Edit } from 'lucide-react';
import type { CtaSettings } from '@shared/schema';

export function CtaSection() {
  const { language } = useLanguage();

  // Fetch CTA settings from the API
  const { data: ctaSettings = [] } = useQuery<CtaSettings[]>({
    queryKey: ['/api/cta']
  });

  const getText = (fr: string, en: string) => language === 'fr-FR' ? fr : en;

  return (
    <section id="cta" className="py-6 bg-memopyk-dark-blue">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {getText(
              'Dites-nous vos idées, ou demandez un devis personnalisé.',
              'Let\'s create your film souvenir together.'
            )}
          </h2>
          <p className="text-memopyk-cream/90 text-lg mb-8">
            {getText(
              'Discutons de vos idées, ou demandez un devis personnalisé.',
              'Discuss with us what you have in mind, or request a personalized quote.'
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Filter and display only active CTA buttons */}
            {ctaSettings
              .filter((cta: CtaSettings) => cta.isActive)
              .map((cta: CtaSettings) => {
                const url = language === 'fr-FR' ? cta.buttonUrlFr : cta.buttonUrlEn;
                return (
                  <a
                    key={cta.id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-memopyk-orange hover:bg-memopyk-orange/90 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer no-underline"
                  >
                    {cta.id === 'book_call' ? <Phone className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                    {language === 'fr-FR' ? cta.buttonTextFr : cta.buttonTextEn}
                  </a>
                );
              })
            }
          </div>
        </div>
      </div>
    </section>
  );
}