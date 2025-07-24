import { HeroVideoSection } from '../components/sections/HeroVideoSection';
import { KeyVisualSection } from '../components/sections/KeyVisualSection';
import GallerySection from '../components/sections/GallerySection';
import FAQSection from '../components/sections/FAQSection';
import { ContactSection } from '../components/sections/ContactSection';
import DirectUpload from '../components/admin/DirectUpload';
import { Upload } from 'lucide-react';

export function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Video Carousel Section */}
      <HeroVideoSection />
      
      {/* Key Visual Problem/Solution Section */}
      <KeyVisualSection />

      {/* Gallery Section */}
      <GallerySection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Contact Section */}
      <ContactSection />

      {/* TEMPORARY: Direct Upload Test Section for Production Testing */}
      <section className="py-16 bg-purple-50 dark:bg-purple-900/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="bg-purple-500 rounded-full p-2">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  Test de Téléchargement Direct
                </h2>
              </div>
              <p className="text-purple-800 dark:text-purple-200 mb-6">
                Section temporaire pour tester les fichiers volumineux (jusqu'à 5GB) sans authentification admin.
                Contourne les limites de Replit en uploadant directement vers Supabase.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-purple-200 dark:border-purple-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-4">
                    Test Vidéo (jusqu'à 5GB)
                  </h3>
                  <DirectUpload
                    bucket="memopyk-gallery"
                    acceptedTypes="video/*"
                    maxSizeMB={5000}
                    onUploadComplete={(result: any) => {
                      console.log('Direct video upload test completed:', result);
                      alert(`✅ Succès! Vidéo uploadée: ${result.filename}\nURL: ${result.url}`);
                    }}
                    onUploadError={(error: any) => {
                      console.error('Direct video upload test failed:', error);
                      alert(`❌ Erreur: ${error}`);
                    }}
                  />
                </div>
                
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-4">
                    Test Image (jusqu'à 5GB)
                  </h3>
                  <DirectUpload
                    bucket="memopyk-gallery"
                    acceptedTypes="image/*"
                    maxSizeMB={5000}
                    onUploadComplete={(result: any) => {
                      console.log('Direct image upload test completed:', result);
                      alert(`✅ Succès! Image uploadée: ${result.filename}\nURL: ${result.url}`);
                    }}
                    onUploadError={(error: any) => {
                      console.error('Direct image upload test failed:', error);
                      alert(`❌ Erreur: ${error}`);
                    }}
                  />
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                <p className="text-sm text-green-800 dark:text-green-200 text-center">
                  ✅ Ce système contourne complètement les limites Replit de 47MB et permet des fichiers jusqu'à 5GB
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* More sections will be added in upcoming phases */}
    </div>
  );
}