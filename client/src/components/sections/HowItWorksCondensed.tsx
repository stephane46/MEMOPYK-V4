import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export function HowItWorksCondensed() {
  const { language } = useLanguage();
  
  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: "Téléversement",
      titleEn: "You Upload",
      image: "/images/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Sélection & Montage", 
      titleEn: "We Create",
      image: "/images/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "C'est prêt !",
      titleEn: "You Enjoy & Share", 
      image: "/images/How_we_work_Step3.png"
    }
  ];

  const howItWorksUrl = language === 'fr-FR' ? '/fr-FR/comment-ca-marche' : '/en-US/how-it-works';

  return (
    <section className="py-20 bg-gradient-to-b from-memopyk-cream to-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-memopyk-dark-blue mb-4">
            {language === 'fr-FR' ? 'Comment ça marche' : 'How It Works'}
          </h2>
          <p className="text-xl text-memopyk-dark-blue/70 max-w-3xl mx-auto">
            {language === 'fr-FR' 
              ? 'Découvrez notre processus simple en 3 étapes pour transformer vos souvenirs en films exceptionnels'
              : 'Discover our simple 3-step process to transform your memories into exceptional films'
            }
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="text-center group">
                {/* Step Image with Number Overlay */}
                <div className="relative mb-6 overflow-hidden rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300 aspect-square">
                  <img 
                    src={step.image} 
                    alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                    className="w-full h-full object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Orange Number Circle - Top Left */}
                  <div className="absolute top-2 left-2 w-10 h-10 bg-memopyk-orange rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-lg font-bold text-white">{step.number}</span>
                  </div>
                </div>

                {/* Step Title with Blue Icon */}
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-memopyk-dark-blue rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-memopyk-dark-blue group-hover:text-memopyk-orange transition-colors duration-300">
                    {language === 'fr-FR' ? step.titleFr : step.titleEn}
                  </h3>
                </div>

                {/* Spacer matching the design requirement - same space as between thumbnail and card edge */}
                <div className="h-6"></div>
              </div>
            );
          })}
        </div>

        {/* Call to Action - "Want to know more" */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-memopyk-dark-blue to-memopyk-navy p-8 rounded-2xl shadow-xl">
            <h3 className="text-2xl font-semibold text-white mb-4">
              {language === 'fr-FR' 
                ? 'Vous voulez en savoir plus sur notre processus ?'
                : 'Want to know more about how it works?'
              }
            </h3>
            <p className="text-memopyk-cream/80 mb-6 text-lg">
              {language === 'fr-FR'
                ? 'Découvrez tous les détails de notre méthode unique pour créer votre film de souvenirs'
                : 'Discover all the details of our unique method to create your souvenir film'
              }
            </p>
            <Link href={howItWorksUrl}>
              <Button 
                size="lg"
                className="bg-memopyk-orange hover:bg-memopyk-orange/90 text-white px-8 py-4 text-lg transition-all duration-300 shadow-lg hover:scale-105"
              >
                {language === 'fr-FR' ? 'En savoir plus' : 'Learn More'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}