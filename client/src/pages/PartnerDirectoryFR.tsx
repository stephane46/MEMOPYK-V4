import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Phone, Mail, Globe, Filter, Search, Package, X, Navigation, ChevronDown, ChevronUp, Camera, Film as FilmIcon, Video } from 'lucide-react';
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

  // Helper function to get icon for service type
  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'Photo':
        return Camera;
      case 'Film':
        return FilmIcon;
      case 'Video':
        return Video;
      default:
        return Package;
    }
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
          <h1 className="text-4xl font-bold mb-2">Annuaire des Services de Numérisation</h1>
          <p className="text-xl text-gray-300">
            Trouvez un professionnel près de chez vous
          </p>
        </div>
      </div>

      {/* Search & Filters - Sticky below header */}
      <div className="sticky top-0 z-50 bg-white shadow-lg">
        <div className="container mx-auto px-4">
          <Card id="filters-section" className="border-0 shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
                {/* Text Search - Half Width */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Rechercher par nom ou ville..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="pl-10 pr-10"
                      data-testid="input-search-partners"
                    />
                    {searchText && (
                      <button
                        onClick={() => setSearchText('')}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        data-testid="button-clear-search"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Service Filters - Half Width */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 whitespace-nowrap">
                      <Filter className="h-4 w-4" />
                      Services:
                    </h3>
                    <div className="flex gap-2">
                      {serviceCounts.map(({ id, name, count }) => {
                        const Icon = getServiceIcon(id);
                        return (
                          <Badge
                            key={id}
                            variant={selectedServices.includes(id) ? "default" : "outline"}
                            className={`cursor-pointer transition-colors flex items-center justify-center gap-1.5 w-[130px] px-3 py-1.5 ${
                              selectedServices.includes(id)
                                ? 'bg-[#D67C4A] text-white hover:bg-[#c5703e]'
                                : 'hover:bg-gray-100'
                            }`}
                            onClick={() => toggleService(id)}
                            data-testid={`filter-service-${id.toLowerCase()}`}
                          >
                            <Icon className="h-4 w-4" />
                            {name} ({count})
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Results Count */}
                <div className="text-sm text-gray-600 whitespace-nowrap">
                  {filteredPartners.length} partenaire{filteredPartners.length !== 1 ? 's' : ''} trouvé{filteredPartners.length !== 1 ? 's' : ''} • {visiblePartners.length} visible{visiblePartners.length !== 1 ? 's' : ''} sur la carte
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4">

        {/* Map & List Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Map */}
          <div>
            {/* Map */}
            <div className="h-[588px] rounded-lg overflow-hidden shadow-lg">
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
            </div>
          </div>

          {/* Partner List - Aligned with Map Top */}
          <div className="flex flex-col gap-3 h-[588px] overflow-y-auto snap-y snap-mandatory partner-list-scrollbar p-0">
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
                    id={`card-${partner.slug}`}
                    className={`${isExpanded ? 'h-[588px]' : 'h-[282px]'} flex-shrink-0 snap-start transition-all overflow-hidden cursor-pointer w-full m-0 ${
                      selectedPartner === partner.slug
                        ? 'ring-2 ring-[#D67C4A] shadow-xl'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      if (!isExpanded) {
                        setExpandedCard(partner.slug);
                        // Scroll to filters section after a brief delay for animation
                        setTimeout(() => {
                          document.getElementById('filters-section')?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                          });
                        }, 100);
                      } else {
                        setExpandedCard(null);
                        setTimeout(() => {
                          document.getElementById('filters-section')?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                          });
                        }, 100);
                      }
                    }}
                    data-testid={`partner-card-${partner.slug}`}
                  >
                    <CardContent className="p-0">
                      {/* Header Section with colored background */}
                      <div className="bg-gradient-to-r from-[#2A4759] to-[#1f3646] px-4 py-2 sticky top-0 z-10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-1">
                              {partner.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[#F2EBDC]">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{partner.city}, {partner.country}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className={isExpanded ? "p-3 space-y-2" : "p-4 space-y-3"}>
                        {/* Description with expand indicator */}
                        {partner.public_description && (
                          <div>
                            <p className={`text-sm text-gray-700 leading-snug ${!isExpanded ? 'line-clamp-2' : ''}`}>
                              {partner.public_description}
                            </p>
                            {!isExpanded && partner.public_description.length > 100 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCard(partner.slug);
                                  setTimeout(() => {
                                    document.getElementById('filters-section')?.scrollIntoView({ 
                                      behavior: 'smooth', 
                                      block: 'start' 
                                    });
                                  }, 100);
                                }}
                                className="text-[#D67C4A] hover:text-[#c5703e] text-sm font-medium mt-1 flex items-center gap-1"
                              >
                                Lire plus <ChevronDown className="h-4 w-4" />
                              </button>
                            )}
                            {isExpanded && partner.public_description.length > 100 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCard(null);
                                  setTimeout(() => {
                                    document.getElementById('filters-section')?.scrollIntoView({ 
                                      behavior: 'smooth', 
                                      block: 'start' 
                                    });
                                  }, 100);
                                }}
                                className="text-[#D67C4A] hover:text-[#c5703e] text-sm font-medium mt-1 flex items-center gap-1"
                              >
                                Lire moins <ChevronUp className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Delivery Methods (Expanded Only) */}
                        {isExpanded && partner.delivery.length > 0 && (
                          <div className="border-t pt-2">
                            <h4 className="font-semibold text-gray-900 text-xs mb-1">Modes de livraison</h4>
                            <div className="flex flex-wrap gap-1">
                              {partner.delivery.map(deliveryId => (
                                <span
                                  key={deliveryId}
                                  className="inline-block text-xs bg-[#89BAD9] text-white px-2 py-0.5 rounded"
                                >
                                  {getDeliveryLabel(deliveryId)}
                                </span>
                              ))}
                              {partner.other_delivery && (
                                <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                  Autre: {partner.other_delivery}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Services and Formats - Always show all 3 services */}
                        <div className={`space-y-1.5 ${isExpanded ? 'border-t pt-2' : ''}`}>
                          {isExpanded && <h4 className="font-semibold text-gray-900 text-xs mb-1">Services</h4>}
                          {['Photo', 'Film', 'Video'].map(service => {
                            const hasService = partner.services.includes(service);
                            const formats = service === 'Photo' ? partner.formats.photo :
                                          service === 'Film' ? partner.formats.film :
                                          partner.formats.video;
                            const otherField = service === 'Photo' ? partner.other_photo :
                                             service === 'Film' ? partner.other_film :
                                             partner.other_video;
                            
                            const Icon = getServiceIcon(service);
                            return (
                              <div key={service} className={isExpanded ? 'mb-1.5' : 'flex items-center gap-3'}>
                                <Badge className={`${hasService ? 'bg-[#D67C4A] text-white hover:bg-[#c5703e]' : 'bg-gray-300 text-gray-500 opacity-50'} px-2 py-0.5 shrink-0 w-[90px] text-xs flex items-center justify-center gap-1`}>
                                  <Icon className="h-3 w-3" />
                                  {service === 'Video' ? 'Vidéo' : service}
                                </Badge>
                                <div className={`flex flex-wrap gap-1 ${isExpanded ? 'mt-1' : 'flex-1'}`}>
                                  {hasService ? (
                                    <>
                                      {formats.map(formatId => (
                                        <span
                                          key={formatId}
                                          className="inline-block text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded"
                                        >
                                          {getFormatLabel(formatId)}
                                        </span>
                                      ))}
                                      {isExpanded && otherField && (
                                        <span className="inline-block text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                          Autre: {otherField}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">Non disponible</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Contact Section - more compact */}
                        <div className={`border-t flex flex-wrap items-center gap-x-4 gap-y-1 ${isExpanded ? 'pt-2' : 'pt-2'}`}>
                          {partner.website && (
                            <a
                              href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[#D67C4A] hover:text-[#c5703e] transition-colors group"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-medium">Site web</span>
                            </a>
                          )}
                          {partner.phone && partner.phone_public && (
                            <a
                              href={`tel:${partner.phone}`}
                              className="flex items-center gap-1.5 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <span className="text-xs">{partner.phone}</span>
                            </a>
                          )}
                          {partner.email && partner.email_public && (
                            <a
                              href={`mailto:${partner.email}`}
                              className="flex items-center gap-1.5 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="h-3.5 w-3.5" />
                              <span className="text-xs">Email</span>
                            </a>
                          )}
                          {(partner.address || partner.postal_code) && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="text-xs">
                                {partner.address && `${partner.address}, `}
                                {partner.postal_code} {partner.city}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Collapse Button (Expanded Only) - more compact */}
                        {isExpanded && (
                          <button
                            onClick={() => setExpandedCard(null)}
                            className="w-full text-[#D67C4A] hover:text-[#c5703e] text-xs font-medium py-1.5 flex items-center justify-center gap-1 border-t mt-2 pt-2"
                          >
                            Réduire <ChevronUp className="h-3.5 w-3.5" />
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

                      const Icon = getServiceIcon(service);
                      return (
                        <div key={service}>
                          <Badge className="bg-[#D67C4A] text-white mb-2 px-3 py-1 w-[90px] flex items-center justify-center gap-1 inline-flex">
                            <Icon className="h-3.5 w-3.5" />
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
