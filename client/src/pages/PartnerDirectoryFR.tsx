import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Phone, Mail, Globe, Filter, Search, Package, X, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import { PHOTO_FORMATS, FILM_FORMATS, VIDEO_CASSETTES, DELIVERY } from '@shared/partnerFormats';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to track map bounds changes
function MapBoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds());
    },
    load: () => {
      onBoundsChange(map.getBounds());
    }
  });
  return null;
}

// Component to handle zooming to a specific location
function MapZoomController({ zoomTo }: { zoomTo: { lat: number; lng: number; zoom: number } | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (zoomTo) {
      map.flyTo([zoomTo.lat, zoomTo.lng], zoomTo.zoom, {
        duration: 1.5
      });
    }
  }, [zoomTo, map]);
  
  return null;
}

interface Partner {
  name: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  services: string[];
  formats: {
    photo: string[];
    film: string[];
    video: string[];
  };
  website: string;
  phone: string;
  phone_public: boolean;
  email: string;
  email_public: boolean;
  public_description: string;
  slug: string;
  address: string;
  address_line2: string;
  postal_code: string;
  delivery: string[];
  other_photo: string;
  other_film: string;
  other_video: string;
  other_delivery: string;
}

export default function PartnerDirectoryFR() {
  const [searchText, setSearchText] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [zoomTo, setZoomTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [modalPartner, setModalPartner] = useState<Partner | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const { data: partners = [], isLoading, refetch } = useQuery<Partner[]>({
    queryKey: ['/partners.json'],
    queryFn: async () => {
      console.log('🚀 QUERY FUNCTION EXECUTING...');
      try {
        const response = await fetch('/partners.json', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        console.log('📡 Response status:', response.status);
        if (!response.ok) {
          console.error('❌ Failed to fetch partners.json:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('🗺️ Partners loaded from JSON:', data);
        return data;
      } catch (error) {
        console.error('💥 Fetch error:', error);
        return [];
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  
  console.log('📊 Query state - isLoading:', isLoading, 'data:', partners);

  // Filter partners
  const filteredPartners = partners.filter(partner => {
    // Text search (name or city)
    const matchesSearch = !searchText || 
      partner.name.toLowerCase().includes(searchText.toLowerCase()) ||
      partner.city.toLowerCase().includes(searchText.toLowerCase());

    // Service filter
    const matchesService = selectedServices.length === 0 ||
      selectedServices.some(s => partner.services.includes(s));

    return matchesSearch && matchesService;
  });

  // Partners with coordinates for map
  const mappablePartners = filteredPartners.filter(p => p.lat && p.lng);
  
  // Partners visible in the current map viewport
  const visiblePartners = useMemo(() => {
    if (!mapBounds) {
      return mappablePartners;
    }
    return mappablePartners.filter(partner => 
      mapBounds.contains([partner.lat!, partner.lng!])
    );
  }, [mappablePartners, mapBounds]);
  
  console.log('🗺️ Filtered partners:', filteredPartners);
  console.log('🗺️ Mappable partners (with coordinates):', mappablePartners);
  console.log('🗺️ Mappable count:', mappablePartners.length);
  console.log('🗺️ Visible in viewport:', visiblePartners.length);

  // Service chips with counts (French labels) - ORDERED: Photo, Film, Video
  const allServices = [
    { id: 'Photo', label: 'Photo' },
    { id: 'Film', label: 'Film' },
    { id: 'Video', label: 'Vidéo' }
  ];
  const serviceCounts = allServices.map(service => ({
    id: service.id,
    name: service.label,
    count: partners.filter(p => p.services.includes(service.id)).length
  }));

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(s => s !== serviceId) : [...prev, serviceId]
    );
  };

  // Helper function to get French format labels
  const getFormatLabel = (formatId: string): string => {
    const photoFormat = PHOTO_FORMATS.find(f => f.v === formatId);
    if (photoFormat) return photoFormat.fr;
    
    const filmFormat = FILM_FORMATS.find(f => f.v === formatId);
    if (filmFormat) return filmFormat.fr;
    
    const videoFormat = VIDEO_CASSETTES.find(f => f.v === formatId);
    if (videoFormat) return videoFormat.fr;
    
    return formatId;
  };

  // Helper function to get French delivery labels
  const getDeliveryLabel = (deliveryId: string): string => {
    const delivery = DELIVERY.find(d => d.v === deliveryId);
    return delivery ? delivery.fr : deliveryId;
  };

  // Function to zoom to a partner location
  const zoomToPartner = (partner: Partner) => {
    if (partner.lat && partner.lng) {
      setSelectedPartner(partner.slug);
      setExpandedCard(partner.slug);
      setZoomTo({ lat: partner.lat, lng: partner.lng, zoom: 13 });
    }
  };

  // Default map center (France)
  const mapCenter: [number, number] = [46.603354, 1.888334];

  return (
    <div className="min-h-screen bg-[#F2EBDC]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2A4759] to-[#011526] text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Annuaire des Partenaires</h1>
          <p className="text-xl text-gray-300">
            Trouvez un professionnel de la numérisation près de chez vous
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Text Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom ou ville..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-partners"
                />
              </div>
            </div>

            {/* Service Filters */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Services
              </h3>
              <div className="flex flex-wrap gap-2">
                {serviceCounts.map(({ id, name, count }) => (
                  <Badge
                    key={id}
                    variant={selectedServices.includes(id) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      selectedServices.includes(id)
                        ? 'bg-[#D67C4A] text-white hover:bg-[#c5703e]'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => toggleService(id)}
                    data-testid={`filter-service-${id.toLowerCase()}`}
                  >
                    {name} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map & List Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="h-[600px] rounded-lg overflow-hidden shadow-lg">
            {mappablePartners.length > 0 ? (
              <MapContainer
                center={mapCenter}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                data-testid="partner-map"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapBoundsTracker onBoundsChange={setMapBounds} />
                <MapZoomController zoomTo={zoomTo} />
                {mappablePartners.map((partner, index) => (
                  partner.lat && partner.lng && (
                    <Marker
                      key={index}
                      position={[partner.lat, partner.lng]}
                      eventHandlers={{
                        click: () => {
                          setSelectedPartner(partner.slug);
                          setExpandedCard(partner.slug);
                          setZoomTo({ lat: partner.lat!, lng: partner.lng!, zoom: 13 });
                        }
                      }}
                    />
                  )
                ))}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100 text-gray-500">
                Aucun partenaire à afficher sur la carte
              </div>
            )}
          </div>

          {/* Partner List */}
          <div className="space-y-4 h-[600px] overflow-y-auto snap-y snap-mandatory">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : visiblePartners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-semibold">Aucun résultat</p>
                <p className="mt-2">Essayez d'élargir la zone ou de retirer des filtres.</p>
              </div>
            ) : (
              <>
                {visiblePartners.map((partner, index) => {
                  const isExpanded = expandedCard === partner.slug;
                  
                  return (
                    <Card
                    key={index}
                    className={`${isExpanded ? 'h-[600px]' : 'h-[292px]'} snap-start transition-all overflow-y-auto cursor-pointer ${
                      selectedPartner === partner.slug
                        ? 'ring-2 ring-[#D67C4A] shadow-xl'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setExpandedCard(isExpanded ? null : partner.slug)}
                    data-testid={`partner-card-${partner.slug}`}
                  >
                    <CardContent className="p-0">
                      {/* Header Section with colored background */}
                      <div className="bg-gradient-to-r from-[#2A4759] to-[#1f3646] p-5 sticky top-0 z-10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">
                              {partner.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[#F2EBDC]">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{partner.city}, {partner.country}</span>
                            </div>
                          </div>
                          {partner.lat && partner.lng && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-white hover:bg-white/20 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPartner(partner.slug);
                                setExpandedCard(partner.slug);
                                setZoomTo({ lat: partner.lat!, lng: partner.lng!, zoom: 13 });
                              }}
                              data-testid={`button-zoom-${partner.slug}`}
                            >
                              <Navigation className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-5 space-y-4">
                        {/* Description with expand indicator */}
                        {partner.public_description && (
                          <div>
                            <p className={`text-sm text-gray-700 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                              {partner.public_description}
                            </p>
                            {!isExpanded && partner.public_description.length > 100 && (
                              <button
                                onClick={() => setExpandedCard(partner.slug)}
                                className="text-[#D67C4A] hover:text-[#c5703e] text-sm font-medium mt-1 flex items-center gap-1"
                              >
                                Lire plus <ChevronDown className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Expanded Address Section */}
                        {isExpanded && (partner.address || partner.postal_code) && (
                          <div className="border-t pt-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Adresse</h4>
                            <div className="text-sm text-gray-700 space-y-1">
                              {partner.address && <p>{partner.address}</p>}
                              {partner.address_line2 && <p>{partner.address_line2}</p>}
                              <p>{partner.postal_code} {partner.city}</p>
                              <p>{partner.country}</p>
                            </div>
                          </div>
                        )}

                        {/* Services and Formats */}
                        <div className={`space-y-2 ${isExpanded ? 'border-t pt-4' : ''}`}>
                          {isExpanded && <h4 className="font-semibold text-gray-900 mb-2">Services et formats</h4>}
                          {partner.services.sort((a, b) => {
                            const order = ['Photo', 'Film', 'Video'];
                            return order.indexOf(a) - order.indexOf(b);
                          }).map(service => {
                            const formats = service === 'Photo' ? partner.formats.photo :
                                          service === 'Film' ? partner.formats.film :
                                          partner.formats.video;
                            const otherField = service === 'Photo' ? partner.other_photo :
                                             service === 'Film' ? partner.other_film :
                                             partner.other_video;
                            
                            if (formats.length === 0 && !otherField) return null;

                            return (
                              <div key={service} className={isExpanded ? 'mb-3' : 'flex items-center gap-3'}>
                                <Badge className="bg-[#D67C4A] text-white hover:bg-[#c5703e] px-3 py-1 shrink-0 min-w-[70px]">
                                  {service === 'Video' ? 'Vidéo' : service}
                                </Badge>
                                <div className={`flex flex-wrap gap-1.5 ${isExpanded ? 'mt-2' : 'flex-1'}`}>
                                  {formats.map(formatId => (
                                    <span
                                      key={formatId}
                                      className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
                                    >
                                      {getFormatLabel(formatId)}
                                    </span>
                                  ))}
                                  {isExpanded && otherField && (
                                    <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                                      Autre: {otherField}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Delivery Methods (Expanded Only) */}
                        {isExpanded && partner.delivery.length > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Modes de livraison</h4>
                            <div className="flex flex-wrap gap-2">
                              {partner.delivery.map(deliveryId => (
                                <span
                                  key={deliveryId}
                                  className="inline-block text-sm bg-[#89BAD9] text-white px-3 py-1 rounded-md"
                                >
                                  {getDeliveryLabel(deliveryId)}
                                </span>
                              ))}
                              {partner.other_delivery && (
                                <span className="inline-block text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-md">
                                  Autre: {partner.other_delivery}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Contact Section */}
                        <div className={`pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2 ${isExpanded ? 'border-t pt-4' : ''}`}>
                          {partner.website && (
                            <a
                              href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-[#D67C4A] hover:text-[#c5703e] transition-colors group"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              <span className="text-sm font-medium">Site web</span>
                            </a>
                          )}
                          {partner.phone && partner.phone_public && (
                            <a
                              href={`tel:${partner.phone}`}
                              className="flex items-center gap-2 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-4 w-4" />
                              <span className="text-sm">{partner.phone}</span>
                            </a>
                          )}
                          {partner.email && partner.email_public && (
                            <a
                              href={`mailto:${partner.email}`}
                              className="flex items-center gap-2 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="h-4 w-4" />
                              <span className="text-sm">Email</span>
                            </a>
                          )}
                        </div>

                        {/* Collapse Button (Expanded Only) */}
                        {isExpanded && (
                          <button
                            onClick={() => setExpandedCard(null)}
                            className="w-full text-[#D67C4A] hover:text-[#c5703e] text-sm font-medium py-2 flex items-center justify-center gap-1 border-t mt-4 pt-4"
                          >
                            Réduire <ChevronUp className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-6 text-center text-gray-600">
          {filteredPartners.length} partenaire{filteredPartners.length !== 1 ? 's' : ''} trouvé{filteredPartners.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Partner Detail Modal */}
      <Dialog open={!!modalPartner} onOpenChange={(open) => !open && setModalPartner(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {modalPartner && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#2A4759] pr-8">
                  {modalPartner.name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-gray-600 mt-2">
                  <MapPin className="h-4 w-4" />
                  <span>{modalPartner.city}, {modalPartner.country}</span>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Description */}
                {modalPartner.public_description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {modalPartner.public_description}
                    </p>
                  </div>
                )}

                {/* Services and Formats */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Services proposés</h3>
                  <div className="space-y-3">
                    {modalPartner.services.sort((a, b) => {
                      const order = ['Photo', 'Film', 'Video'];
                      return order.indexOf(a) - order.indexOf(b);
                    }).map(service => {
                      const formats = service === 'Photo' ? modalPartner.formats.photo :
                                    service === 'Film' ? modalPartner.formats.film :
                                    modalPartner.formats.video;
                      
                      if (formats.length === 0) return null;

                      return (
                        <div key={service}>
                          <Badge className="bg-[#D67C4A] text-white mb-2 px-3 py-1">
                            {service === 'Video' ? 'Vidéo' : service}
                          </Badge>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formats.map(formatId => (
                              <span
                                key={formatId}
                                className="inline-block text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md"
                              >
                                {getFormatLabel(formatId)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
                  <div className="space-y-3">
                    {modalPartner.website && (
                      <a
                        href={modalPartner.website.startsWith('http') ? modalPartner.website : `https://${modalPartner.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-[#D67C4A] hover:text-[#c5703e] transition-colors group"
                      >
                        <Globe className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Visiter le site web</span>
                      </a>
                    )}
                    {modalPartner.phone && (
                      <a
                        href={`tel:${modalPartner.phone}`}
                        className="flex items-center gap-3 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                      >
                        <Phone className="h-5 w-5" />
                        <span>{modalPartner.phone}</span>
                      </a>
                    )}
                    {modalPartner.email && (
                      <a
                        href={`mailto:${modalPartner.email}`}
                        className="flex items-center gap-3 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                      >
                        <Mail className="h-5 w-5" />
                        <span>{modalPartner.email}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Locate on Map Button */}
                {modalPartner.lat && modalPartner.lng && (
                  <Button
                    onClick={() => {
                      zoomToPartner(modalPartner);
                      setModalPartner(null);
                    }}
                    className="w-full bg-[#2A4759] hover:bg-[#1f3646] text-white"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Localiser sur la carte
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
