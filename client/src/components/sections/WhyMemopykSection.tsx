import { useLanguage } from '../../contexts/LanguageContext';
import { Clock, Zap, Users, Settings } from 'lucide-react';

export function WhyMemopykSection() {
  const { language } = useLanguage();

  const benefits = [
    {
      icon: Zap,
      titleFr: "Simplicité",
      titleEn: "Simplicity", 
      descriptionFr: "Tous formats acceptés, détails techniques gérés professionnellement. Pas de tri ou d'organisation de fichiers source requis.",
      descriptionEn: "All formats accepted. All technical details handled professionally. No source files organization nor sorting required.",
      gradient: "from-memopyk-orange/20 to-memopyk-cream/30"
    },
    {
      icon: Clock,
      titleFr: "Gain de Temps",
      titleEn: "Time Saving",
      descriptionFr: "Équipe dédiée, processus clair, délais prévisibles. Nous gérons tout pour votre tranquillité.",
      descriptionEn: "Dedicated team, clear process, predictable turnaround. We handle all the details for your peace of mind.",
      gradient: "from-memopyk-sky-blue/20 to-memopyk-blue-gray/10"
    },
    {
      icon: Users,
      titleFr: "Expertise",
      titleEn: "Expertise",
      descriptionFr: "Ayant une grande expérience dans le domaine de l'image, nous sommes animés par l'efficacité de notre flux de travail, afin de vous offrir les meilleurs conseils et recommandations. Vous bénéficiez ainsi d'un résultat de grande qualité, et d'un rapport qualité-prix intéressant.",
      descriptionEn: "Experienced in working with visual materials, we are driven by the efficiency of our workflow, to bring you the best advice and guidance. What you receive is high quality result with clear value added.",
      gradient: "from-memopyk-dark-blue/20 to-memopyk-navy/10"
    },
    {
      icon: Settings,
      titleFr: "Personnalisation",
      titleEn: "Customization",
      descriptionFr: "Chaque film souvenir est unique. Avec un esprit de collaboration, nous sommes à l'écoute, et respectons tous vos souhaits et vos consignes spécifiques, pour vous offrir le film souvenir qui raconte le mieux VOTRE histoire.",
      descriptionEn: "Each souvenir film is unique. With the spirit of collaboration in mind, we listen and respect all your wishes and specific instructions, to bring you the souvenir film that best tells YOUR story.",
      gradient: "from-memopyk-cream/40 to-memopyk-sky-blue/20"
    }
  ];

  return (
    <section className="py-10 bg-gradient-to-br from-memopyk-cream/30 to-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-poppins font-bold text-memopyk-navy mb-6">
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