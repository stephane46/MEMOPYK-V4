import { useLanguage } from '../../contexts/LanguageContext';
import { Clock, Zap, Users, Settings, Shield, Star, Heart, CheckCircle, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import filmstripImage from "@assets/souvenir_film_1755960575328.png";

export function WhyMemopykSection() {
  const { language } = useLanguage();

  // Icon mapping
  const ICON_MAP = {
    Zap, Clock, Users, Settings, Shield, Star, Heart, CheckCircle, Target
  };

  // Fetch benefits from API
  const { data: benefits = [], isLoading } = useQuery({
    queryKey: ['/api/why-memopyk-cards'],
    queryFn: async () => {
      const response = await fetch('/api/why-memopyk-cards');
      if (!response.ok) throw new Error('Failed to fetch benefits');
      const data = await response.json();
      return data.filter((card: any) => card.isActive).sort((a: any, b: any) => a.orderIndex - b.orderIndex);
    }
  });

  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP] || Star;
    return IconComponent;
  };

  if (isLoading) {
    return (
      <section id="why-memopyk" className="py-12 scroll-mt-20 bg-gradient-to-br from-memopyk-cream/30 to-white overflow-x-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="text-gray-500">Loading benefits...</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="why-memopyk" className="py-12 scroll-mt-20 bg-gradient-to-br from-memopyk-cream/30 to-white overflow-x-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-poppins font-bold text-memopyk-navy mb-6">
            {language === 'fr-FR' 
              ? "Pourquoi choisir MEMOPYK"
              : "Why choose MEMOPYK"
            }
          </h2>
        </div>

        {/* Benefits Grid - 2 rows of 3 cards */}
        <div className="space-y-8">
          
          {/* First Row: Simplicité + Image + Gain de Temps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Card 1 - Dynamic from API */}
            {benefits[0] && (() => {
              const benefit = benefits[0];
              const Icon = getIcon(benefit.iconName);
              return (
                <div className="group relative h-full order-2 md:order-1">
                  <div className={`relative bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg md:hover:shadow-2xl transition-[transform,shadow] duration-300 md:transform md:hover:-translate-y-2 border border-white/20 h-full flex flex-col`}>
                    
                    {/* Icon at Top */}
                    <div className="flex justify-center mb-4 sm:mb-6 flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg md:group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-memopyk-dark-blue" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4 sm:mb-6 flex-shrink-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-memopyk-navy text-center">
                        {language === 'fr-FR' ? benefit.titleFr : benefit.titleEn}
                      </h3>
                    </div>

                    {/* Description */}
                    <div 
                      className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow text-center [&_ul]:list-disc [&_ul]:list-inside [&_ul]:text-left [&_ul]:space-y-1 [&_ul]:mt-3 [&_li]:leading-relaxed [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{ 
                        __html: language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn 
                      }}
                    />
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })()}

            {/* Image Card - Desktop order 2, Mobile order 1 */}
            <div className="group relative h-full order-1 md:order-2">
              <div className="relative bg-gradient-to-br from-memopyk-cream/20 to-memopyk-sky-blue/10 backdrop-blur-sm rounded-2xl shadow-lg md:hover:shadow-2xl transition-[transform,shadow] duration-300 md:transform md:hover:-translate-y-2 border border-white/20 h-full overflow-hidden">
                <img 
                  src={filmstripImage}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Background Pattern */}
              <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
              </div>
            </div>

            {/* Card 3 - Dynamic from API */}
            {benefits[1] && (() => {
              const benefit = benefits[1];
              const Icon = getIcon(benefit.iconName);
              return (
                <div className="group relative h-full order-3 md:order-3">
                  <div className={`relative bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg md:hover:shadow-2xl transition-[transform,shadow] duration-300 md:transform md:hover:-translate-y-2 border border-white/20 h-full flex flex-col`}>
                    
                    {/* Icon at Top */}
                    <div className="flex justify-center mb-4 sm:mb-6 flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg md:group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-memopyk-dark-blue" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4 sm:mb-6 flex-shrink-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-memopyk-navy text-center">
                        {language === 'fr-FR' ? benefit.titleFr : benefit.titleEn}
                      </h3>
                    </div>

                    {/* Description */}
                    <div 
                      className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow text-center [&_ul]:list-disc [&_ul]:list-inside [&_ul]:text-left [&_ul]:space-y-1 [&_ul]:mt-3 [&_li]:leading-relaxed [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{ 
                        __html: language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn 
                      }}
                    />
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Second Row: Personnalisation + Expertise + Sécurité Totale */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Card 4 - Dynamic from API */}
            {benefits[2] && (() => {
              const benefit = benefits[2];
              const Icon = getIcon(benefit.iconName);
              return (
                <div className="group relative h-full">
                  <div className={`relative bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg md:hover:shadow-2xl transition-[transform,shadow] duration-300 md:transform md:hover:-translate-y-2 border border-white/20 h-full flex flex-col`}>
                    
                    {/* Icon at Top */}
                    <div className="flex justify-center mb-4 sm:mb-6 flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg md:group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-memopyk-dark-blue" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4 sm:mb-6 flex-shrink-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-memopyk-navy text-center">
                        {language === 'fr-FR' ? benefit.titleFr : benefit.titleEn}
                      </h3>
                    </div>

                    {/* Description */}
                    <div 
                      className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow text-center [&_ul]:list-disc [&_ul]:list-inside [&_ul]:text-left [&_ul]:space-y-1 [&_ul]:mt-3 [&_li]:leading-relaxed [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{ 
                        __html: language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn 
                      }}
                    />
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })()}

            {/* Card 5 - Dynamic from API */}
            {benefits[3] && (() => {
              const benefit = benefits[3];
              const Icon = getIcon(benefit.iconName);
              return (
                <div className="group relative h-full">
                  <div className={`relative bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg md:hover:shadow-2xl transition-[transform,shadow] duration-300 md:transform md:hover:-translate-y-2 border border-white/20 h-full flex flex-col`}>
                    
                    {/* Icon at Top */}
                    <div className="flex justify-center mb-4 sm:mb-6 flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg md:group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-memopyk-dark-blue" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4 sm:mb-6 flex-shrink-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-memopyk-navy text-center">
                        {language === 'fr-FR' ? benefit.titleFr : benefit.titleEn}
                      </h3>
                    </div>

                    {/* Description */}
                    <div 
                      className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow text-center [&_ul]:list-disc [&_ul]:list-inside [&_ul]:text-left [&_ul]:space-y-1 [&_ul]:mt-3 [&_li]:leading-relaxed [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{ 
                        __html: language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn 
                      }}
                    />
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })()}

            {benefits[4] && (() => {
              const benefit = benefits[4];
              const Icon = getIcon(benefit.iconName);
              return (
                <div className="group relative h-full">
                  <div className={`relative bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg md:hover:shadow-2xl transition-[transform,shadow] duration-300 md:transform md:hover:-translate-y-2 border border-white/20 h-full flex flex-col`}>
                    
                    {/* Icon at Top */}
                    <div className="flex justify-center mb-4 sm:mb-6 flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg md:group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-memopyk-dark-blue" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4 sm:mb-6 flex-shrink-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-memopyk-navy text-center">
                        {language === 'fr-FR' ? benefit.titleFr : benefit.titleEn}
                      </h3>
                    </div>

                    {/* Description */}
                    <div 
                      className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow text-center [&_ul]:list-disc [&_ul]:list-inside [&_ul]:text-left [&_ul]:space-y-1 [&_ul]:mt-3 [&_li]:leading-relaxed [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{ 
                        __html: language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn 
                      }}
                    />
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>


      </div>
    </section>
  );
}