import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Phone, Mail, Globe, Filter, Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import L from 'leaflet';
import { PHOTO_FORMATS, FILM_FORMATS, VIDEO_CASSETTES } from '@shared/partnerFormats';

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
  email: string;
  public_description: string;
  slug: string;
}

export default function PartnerDirectoryFR() {
  const [searchText, setSearchText] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [zoomTo, setZoomTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

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

  // Function to zoom to a partner location
  const zoomToPartner = (partner: Partner) => {
    if (partner.lat && partner.lng) {
      setSelectedPartner(partner.slug);
      // Use zoom level 11 for better visibility and keep info panel in view
      setZoomTo({ lat: partner.lat, lng: partner.lng, zoom: 11 });
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
                        click: () => setSelectedPartner(partner.slug)
                      }}
                    >
                      <Popup maxWidth={300}>
                        <div className="p-2">
                          <h4 className="font-bold text-[#2A4759] mb-2">{partner.name}</h4>
                          <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                            <MapPin className="h-3 w-3" />
                            <span>{partner.city}, {partner.country}</span>
                          </div>
                          
                          {/* Services in popup */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {partner.services.sort((a, b) => {
                              const order = ['Photo', 'Film', 'Video'];
                              return order.indexOf(a) - order.indexOf(b);
                            }).map(service => (
                              <span key={service} className="inline-block text-xs bg-[#D67C4A] text-white px-2 py-0.5 rounded">
                                {service === 'Video' ? 'Vidéo' : service}
                              </span>
                            ))}
                          </div>

                          {/* Contact links in popup */}
                          <div className="space-y-1 text-xs">
                            {partner.website && (
                              <a
                                href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[#D67C4A] hover:underline"
                              >
                                <Globe className="h-3 w-3" />
                                <span>Visiter le site</span>
                              </a>
                            )}
                            {partner.phone && (
                              <a
                                href={`tel:${partner.phone}`}
                                className="flex items-center gap-1 text-[#2A4759] hover:underline"
                              >
                                <Phone className="h-3 w-3" />
                                <span>{partner.phone}</span>
                              </a>
                            )}
                            {partner.email && (
                              <a
                                href={`mailto:${partner.email}`}
                                className="flex items-center gap-1 text-[#2A4759] hover:underline"
                              >
                                <Mail className="h-3 w-3" />
                                <span>Email</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
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
              visiblePartners.map((partner, index) => (
                <Card
                  key={index}
                  className={`h-[292px] snap-start transition-all overflow-hidden cursor-pointer ${
                    selectedPartner === partner.slug
                      ? 'ring-2 ring-[#D67C4A] shadow-xl'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => zoomToPartner(partner)}
                  data-testid={`partner-card-${partner.slug}`}
                >
                  <CardContent className="p-0">
                    {/* Header Section with colored background */}
                    <div className="bg-gradient-to-r from-[#2A4759] to-[#1f3646] p-5">
                      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        {partner.name}
                        <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded">Cliquez pour localiser</span>
                      </h3>
                      <div className="flex items-center gap-2 text-[#F2EBDC]">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{partner.city}, {partner.country}</span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 space-y-4">
                      {/* Description */}
                      {partner.public_description && (
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                          {partner.public_description}
                        </p>
                      )}

                      {/* Services and Formats - Horizontal Layout */}
                      <div className="space-y-2">
                        {partner.services.sort((a, b) => {
                          const order = ['Photo', 'Film', 'Video'];
                          return order.indexOf(a) - order.indexOf(b);
                        }).map(service => {
                          const formats = service === 'Photo' ? partner.formats.photo :
                                        service === 'Film' ? partner.formats.film :
                                        partner.formats.video;
                          
                          if (formats.length === 0) return null;

                          return (
                            <div key={service} className="flex items-start gap-3">
                              <Badge className="bg-[#D67C4A] text-white hover:bg-[#c5703e] px-3 py-1 shrink-0 w-[70px] justify-center">
                                {service === 'Video' ? 'Vidéo' : service}
                              </Badge>
                              <div className="flex flex-wrap gap-1.5">
                                {formats.map(formatId => (
                                  <span
                                    key={formatId}
                                    className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
                                  >
                                    {getFormatLabel(formatId)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Contact Section - Horizontal Layout */}
                      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2">
                        {partner.website && (
                          <a
                            href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[#D67C4A] hover:text-[#c5703e] transition-colors group"
                          >
                            <Globe className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Site web</span>
                          </a>
                        )}
                        {partner.phone && (
                          <a
                            href={`tel:${partner.phone}`}
                            className="flex items-center gap-2 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                            <span className="text-sm">{partner.phone}</span>
                          </a>
                        )}
                        {partner.email && (
                          <a
                            href={`mailto:${partner.email}`}
                            className="flex items-center gap-2 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                          >
                            <Mail className="h-4 w-4" />
                            <span className="text-sm">Email</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-6 text-center text-gray-600">
          {filteredPartners.length} partenaire{filteredPartners.length !== 1 ? 's' : ''} trouvé{filteredPartners.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
