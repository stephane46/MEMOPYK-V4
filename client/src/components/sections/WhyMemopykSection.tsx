import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Clock, Zap, Heart, Shield } from 'lucide-react';

export function WhyMemopykSection() {
  const { language } = useLanguage();

  const benefits = [
    {
      icon: Clock,
      titleFr: "Gain de Temps",
      titleEn: "Time Saving",
      descriptionFr: "Aucune organisation de fichiers requise. Uploads collaboratifs, nous nous occupons de tout le tri et de l'organisation.",
      descriptionEn: "No file organization required. Collaborative uploads, we handle all the sorting and organization.",
      gradient: "from-memopyk-sky-blue/20 to-memopyk-blue-gray/10"
    },
    {
      icon: Zap,
      titleFr: "Simple",
      titleEn: "Simple", 
      descriptionFr: "Tous formats acceptés, détails techniques gérés professionnellement. Vous n'avez qu'à partager vos souvenirs.",
      descriptionEn: "All formats accepted, technical details handled professionally. You just need to share your memories.",
      gradient: "from-memopyk-orange/20 to-memopyk-cream/30"
    },
    {
      icon: Heart,
      titleFr: "Personnalisé",
      titleEn: "Personalized",
      descriptionFr: "Propositions sur-mesure, touche humaine garantie. Pas d'IA ni de robots, que des artistes passionnés.",
      descriptionEn: "Tailor-made proposals, human touch guaranteed. No AI or robots, only passionate artists.",
      gradient: "from-memopyk-dark-blue/20 to-memopyk-navy/10"
    },
    {
      icon: Shield,
      titleFr: "Sans Stress",
      titleEn: "Stress-Free",
      descriptionFr: "Équipe dédiée, processus clair, délais prévisibles. Nous gérons tout de A à Z pour votre tranquillité.",
      descriptionEn: "Dedicated team, clear process, predictable turnaround. We handle everything from A to Z for your peace of mind.",
      gradient: "from-memopyk-cream/40 to-memopyk-sky-blue/20"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-memopyk-cream/30 to-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-poppins font-bold text-memopyk-navy mb-6">
            {language === 'fr-FR' 
              ? "Pourquoi choisir MEMOPYK ?"
              : "Why choose MEMOPYK?"
            }
          </h2>
          <p className="text-xl text-memopyk-dark-blue max-w-3xl mx-auto">
            {language === 'fr-FR' 
              ? "Notre approche unique transforme vos souvenirs avec expertise et passion"
              : "Our unique approach transforms your memories with expertise and passion"
            }
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className="group relative"
              >
                {/* Benefit Card */}
                <div className={`relative bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/20`}>
                  
                  {/* Icon */}
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-8 h-8 text-memopyk-dark-blue" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-memopyk-navy mb-4">
                    {language === 'fr-FR' ? benefit.titleFr : benefit.titleEn}
                  </h3>

                  {/* Description */}
                  <p className="text-memopyk-dark-blue leading-relaxed">
                    {language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn}
                  </p>

                  {/* Decorative Element */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-memopyk-orange/20 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-memopyk-orange rounded-full animate-pulse-elegant"></div>
                  </div>
                </div>

                {/* Background Pattern */}
                <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                  <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                </div>
              </div>
            );
          })}
        </div>


      </div>
    </section>
  );
}