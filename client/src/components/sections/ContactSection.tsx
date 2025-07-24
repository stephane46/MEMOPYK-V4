import React from 'react';
import { ContactForm } from '@/components/forms/ContactForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const { language } = useLanguage();

  const getText = (fr: string, en: string) => language === 'fr-FR' ? fr : en;

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900" id="contact">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {getText('Parlons de votre projet', 'Let\'s Talk About Your Project')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {getText(
              'Chaque histoire mérite d\'être racontée de manière unique. Contactez-nous pour discuter de la façon dont nous pouvons capturer vos moments les plus précieux.',
              'Every story deserves to be told uniquely. Contact us to discuss how we can capture your most precious moments.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {getText('Informations de contact', 'Contact Information')}
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {getText('Adresse', 'Address')}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      {getText(
                        '123 Rue de la Mémoire\n75001 Paris, France',
                        '123 Memory Lane\nNew York, NY 10001'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {getText('Téléphone', 'Phone')}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      +33 1 23 45 67 89
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {getText('E-mail', 'Email')}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      contact@memopyk.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {getText('Heures d\'ouverture', 'Business Hours')}
                    </h4>
                    <div className="text-gray-600 dark:text-gray-300 space-y-1">
                      <p>{getText('Lundi - Vendredi:', 'Monday - Friday:')} 9:00 - 18:00</p>
                      <p>{getText('Samedi:', 'Saturday:')} 10:00 - 16:00</p>
                      <p>{getText('Dimanche:', 'Sunday:')} {getText('Fermé', 'Closed')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-lg p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">
                {getText('Consultation gratuite', 'Free Consultation')}
              </h3>
              <p className="mb-6">
                {getText(
                  'Réservez une consultation gratuite de 30 minutes pour discuter de votre projet de film mémoire.',
                  'Book a free 30-minute consultation to discuss your memory film project.'
                )}
              </p>
              <div className="flex items-center gap-2 text-orange-100">
                <Clock className="w-5 h-5" />
                <span className="font-medium">
                  {getText('Réponse sous 24h', 'Response within 24h')}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <ContactForm />
        </div>
      </div>
    </section>
  );
};