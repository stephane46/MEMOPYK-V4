import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQ {
  id: string;
  question_en: string;
  question_fr: string;
  answer_en: string;
  answer_fr: string;
  order_index: number;
  is_active: boolean;
  section_id?: string;
}

interface FAQSection {
  id: string;
  title_en: string;
  title_fr: string;
  order_index: number;
}

export default function FAQSection() {
  const { language } = useLanguage();
  const [openSection, setOpenSection] = useState<string | number | null>(null);
  const sectionRefs = useRef<Record<string | number, HTMLDivElement | null>>({});

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
    const sectionId = faq.section_id || 'general'; // 'general' for FAQs without section
    if (!groups[sectionId]) {
      groups[sectionId] = [];
    }
    groups[sectionId].push(faq);
    return groups;
  }, {} as Record<string, FAQ[]>);

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);
  
  // Sections are now displaying properly - debug confirmed all 5 sections load!

  const toggleSection = (sectionId: string | number) => {
    const newOpenSection = openSection === sectionId ? null : sectionId;
    setOpenSection(newOpenSection);
    
    // Scroll to section title if opening
    if (newOpenSection !== null) {
      setTimeout(() => {
        const element = sectionRefs.current[sectionId];
        if (element) {
          // Scroll to show the section title with some padding above
          const rect = element.getBoundingClientRect();
          const offset = window.pageYOffset + rect.top - 80; // 80px padding above title
          
          window.scrollTo({
            top: offset,
            behavior: 'smooth'
          });
        }
      }, 100); // Small delay to allow the DOM to update
    }
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
          {faqsBySection['general'] && (
            <div className="space-y-4">
              {/* General Section Header */}
              <div 
                ref={(el) => { sectionRefs.current['general'] = el; }}
                className="border-l-4 border-orange-500 pl-4 mb-6"
              >
                <button
                  onClick={() => toggleSection('general')}
                  className="w-full text-left flex items-center justify-between hover:bg-gray-50 transition-colors p-2 rounded"
                >
                  <h3 className="text-2xl font-bold text-gray-900">
                    {language === 'fr-FR' ? 'Questions Générales' : 'General Questions'}
                  </h3>
                  {openSection === 'general' ? (
                    <ChevronUp className="h-6 w-6 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-gray-500 flex-shrink-0" />
                  )}
                </button>
              </div>

              {/* General Section Content */}
              {openSection === 'general' && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  {faqsBySection['general'].map((faq) => (
                    <div
                      key={faq.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                    >
                      <div className="px-6 py-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">
                          {language === 'fr-FR' ? faq.question_fr : faq.question_en}
                        </h4>
                        <div 
                          className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: language === 'fr-FR' ? faq.answer_fr : faq.answer_en
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sectioned FAQs - Accordion Style */}
          {sortedSections.map((section) => {
            const sectionFAQs = faqsBySection[section.id] || [];
            const sectionKey = section.id;

            return (
              <div key={section.id} className="space-y-4">
                {/* Section Header - Clickable Accordion */}
                <div 
                  ref={(el) => { sectionRefs.current[sectionKey] = el; }}
                  className="border-l-4 border-orange-500 pl-4 mb-6"
                >
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full text-left flex items-center justify-between hover:bg-gray-50 transition-colors p-2 rounded"
                  >
                    <h3 className="text-2xl font-bold text-gray-900">
                      {language === 'fr-FR' ? section.title_fr : section.title_en}
                    </h3>
                    {openSection === sectionKey ? (
                      <ChevronUp className="h-6 w-6 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-6 w-6 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                </div>

                {/* Section Content - Only show when open */}
                {openSection === sectionKey && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {sectionFAQs.length === 0 ? (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
                        {language === 'fr-FR' 
                          ? 'Aucune question dans cette section pour le moment.' 
                          : 'No questions in this section yet.'}
                      </div>
                    ) : (
                      sectionFAQs.map((faq) => (
                        <div
                          key={faq.id}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                        >
                          <div className="px-6 py-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                              {language === 'fr-FR' ? faq.question_fr : faq.question_en}
                            </h4>
                            <div 
                              className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: language === 'fr-FR' ? faq.answer_fr : faq.answer_en
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}