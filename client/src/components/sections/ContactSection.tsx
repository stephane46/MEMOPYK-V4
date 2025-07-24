import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ContactForm } from '@/components/forms/ContactForm';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const { language } = useLanguage();

  const getText = (fr: string, en: string) => language === 'fr-FR' ? fr : en;

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {getText('Contactez-nous', 'Contact Us')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {getText(
              'Prêt à transformer vos souvenirs en films mémorables? Contactez-nous pour discuter de votre projet.',
              'Ready to transform your memories into memorable films? Contact us to discuss your project.'
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
                      <p>{getText('Lundi - Vendredi: 9h00 - 18h00', 'Monday - Friday: 9:00 AM - 6:00 PM')}</p>
                      <p>{getText('Samedi: 10h00 - 16h00', 'Saturday: 10:00 AM - 4:00 PM')}</p>
                      <p>{getText('Dimanche: Fermé', 'Sunday: Closed')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {getText('Pourquoi nous choisir?', 'Why Choose Us?')}
              </h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">✓</span>
                  {getText('Plus de 10 ans d\'expérience dans la création de films de mariage', 'Over 10 years of experience in wedding film creation')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">✓</span>
                  {getText('Équipement professionnel de haute qualité', 'High-quality professional equipment')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">✓</span>
                  {getText('Approche personnalisée pour chaque couple', 'Personalized approach for every couple')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">✓</span>
                  {getText('Livraison rapide sous 2-3 semaines', 'Fast delivery within 2-3 weeks')}
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {getText('Envoyez-nous un message', 'Send us a message')}
            </h3>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
};