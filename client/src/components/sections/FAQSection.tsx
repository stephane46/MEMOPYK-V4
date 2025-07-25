import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQ {
  id: number;
  question_en: string;
  question_fr: string;
  answer_en: string;
  answer_fr: string;
  order_index: number;
  is_active: boolean;
  section_id?: number;
}

interface FAQSection {
  id: number;
  title_en: string;
  title_fr: string;
  order_index: number;
}

export default function FAQSection() {
  const { language } = useLanguage();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // Fetch FAQs
  const { data: faqs = [], isLoading: faqsLoading } = useQuery<FAQ[]>({
    queryKey: ['/api/faqs']
  });

  // Fetch FAQ Sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery<FAQSection[]>({
    queryKey: ['/api/faq-sections']
  });

  const isLoading = faqsLoading || sectionsLoading;

  // Filter active FAQs and sort by order
  const activeFAQs = faqs
    .filter(faq => faq.is_active)
    .sort((a, b) => a.order_index - b.order_index);

  // Group FAQs by section
  const faqsBySection = activeFAQs.reduce((groups, faq) => {
    const sectionId = faq.section_id || 0; // 0 for general FAQs without section
    if (!groups[sectionId]) {
      groups[sectionId] = [];
    }
    groups[sectionId].push(faq);
    return groups;
  }, {} as Record<number, FAQ[]>);

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);
  
  // Debug logging to see what's happening
  React.useEffect(() => {
    console.log('🔍 FAQ Public Display Debug:');
    console.log('- Sections:', sections.length);
    console.log('- Active FAQs:', activeFAQs.length);
    console.log('- FAQs by section:', faqsBySection);
    console.log('- Sorted sections:', sortedSections);
  }, [sections, activeFAQs]);

  const toggleFAQ = (faqId: number) => {
    setOpenFAQ(openFAQ === faqId ? null : faqId);
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-96 mx-auto mb-8"></div>
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-300 rounded mb-4"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Don't render if no active FAQs
  if (activeFAQs.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {language === 'fr-FR' ? 'Questions Fréquemment Posées' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {language === 'fr-FR' 
              ? 'Trouvez les réponses aux questions les plus courantes sur nos services de films de mariage et de famille.'
              : 'Find answers to the most common questions about our wedding and family film services.'
            }
          </p>
        </div>

        {/* FAQ Content */}
        <div className="space-y-8">
          {/* General FAQs (without section) */}
          {faqsBySection[0] && (
            <div className="space-y-4">
              {faqsBySection[0].map((faq) => (
                <div
                  key={faq.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 pr-4">
                      {language === 'fr-FR' ? faq.question_fr : faq.question_en}
                    </h3>
                    {openFAQ === faq.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  
                  {openFAQ === faq.id && (
                    <div className="px-6 pb-4">
                      <div 
                        className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: language === 'fr-FR' ? faq.answer_fr : faq.answer_en
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sectioned FAQs */}
          {sortedSections.map((section) => {
            const sectionFAQs = faqsBySection[section.id];
            if (!sectionFAQs || sectionFAQs.length === 0) return null;

            return (
              <div key={section.id} className="space-y-4">
                {/* Section Title */}
                <div className="border-l-4 border-orange-500 pl-4 mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {language === 'fr-FR' ? section.title_fr : section.title_en}
                  </h3>
                </div>

                {/* Section FAQs */}
                {sectionFAQs.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <h4 className="text-lg font-semibold text-gray-900 pr-4">
                        {language === 'fr-FR' ? faq.question_fr : faq.question_en}
                      </h4>
                      {openFAQ === faq.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      )}
                    </button>
                    
                    {openFAQ === faq.id && (
                      <div className="px-6 pb-4">
                        <div 
                          className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: language === 'fr-FR' ? faq.answer_fr : faq.answer_en
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}