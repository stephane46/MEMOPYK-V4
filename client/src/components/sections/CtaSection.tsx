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
    <section className="py-16 bg-memopyk-dark-blue">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {getText(
              'Connectez-vous avec nous ou demandez un devis personnalisé.',
              'Connect with us or request a personalized quote.'
            )}
          </h2>
          <p className="text-memopyk-cream/90 text-lg mb-8">
            {getText(
              'Nous sommes là pour répondre à vos questions et vous aider à commencer.',
              'We\'re here to answer your questions and help you get started.'
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            {/* Filter and display only active CTA buttons */}
            {ctaSettings
              .filter((cta: CtaSettings) => cta.isActive)
              .map((cta: CtaSettings) => (
                <div key={cta.id} className="text-center">
                  {/* Individual CTA Title from database */}
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {language === 'fr-FR' ? cta.titleFr : cta.titleEn}
                  </h3>
                  
                  {/* CTA Button */}
                  <a
                    href={cta.buttonUrl}
                    className="inline-flex items-center gap-3 bg-memopyk-orange hover:bg-memopyk-orange/90 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    {cta.id === 'book_call' ? <Phone className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                    {language === 'fr-FR' ? cta.buttonTextFr : cta.buttonTextEn}
                  </a>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </section>
  );
}