import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { MapPin, Phone, Mail, Globe, Filter, Search, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['popular']);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

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

    // Format filter
    const matchesFormat = selectedFormats.length === 0 ||
      selectedFormats.some(f => 
        partner.formats.photo.includes(f) ||
        partner.formats.film.includes(f) ||
        partner.formats.video.includes(f)
      );

    return matchesSearch && matchesService && matchesFormat;
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

  // Service chips with counts (French labels)
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

  // Popular formats (most searched)
  const popularFormats = [
    ...PHOTO_FORMATS.filter(f => ['Prints', 'Slides 35mm'].includes(f.v)),
    ...FILM_FORMATS.filter(f => f.v === 'Super 8'),
    ...VIDEO_CASSETTES.filter(f => f.v === 'VHS')
  ].map(format => ({
    id: format.v,
    name: format.fr,
    count: partners.filter(p => 
      p.formats.photo.includes(format.v) ||
      p.formats.film.includes(format.v) ||
      p.formats.video.includes(format.v)
    ).length
  }));

  // Photo formats with counts
  const photoFormats = PHOTO_FORMATS.map(format => ({
    id: format.v,
    name: format.fr,
    count: partners.filter(p => p.formats.photo.includes(format.v)).length
  }));

  // Film formats with counts
  const filmFormats = FILM_FORMATS.map(format => ({
    id: format.v,
    name: format.fr,
    count: partners.filter(p => p.formats.film.includes(format.v)).length
  }));

  // Video cassette formats with counts
  const videoFormats = VIDEO_CASSETTES.map(format => ({
    id: format.v,
    name: format.fr,
    count: partners.filter(p => p.formats.video.includes(format.v)).length
  }));

  // Determine which format sections to show based on selected services
  const showPhotoFormats = selectedServices.length === 0 || selectedServices.includes('Photo');
  const showFilmFormats = selectedServices.length === 0 || selectedServices.includes('Film');
  const showVideoFormats = selectedServices.length === 0 || selectedServices.includes('Video');

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(s => s !== serviceId) : [...prev, serviceId]
    );
  };

  const toggleFormat = (formatId: string) => {
    setSelectedFormats(prev =>
      prev.includes(formatId) ? prev.filter(f => f !== formatId) : [...prev, formatId]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // Default map center (France)
  const mapCenter: [number, number] = [46.603354, 1.888334];

  return (
    <div className="min-h-screen bg-[#F2EBDC]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2A4759] to-[#011526] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Annuaire des Partenaires</h1>
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

            {/* Format Filters */}
            <div className="space-y-3">
              {/* Popular Formats */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('popular')}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    ⭐ Formats populaires
                  </span>
                  {expandedSections.includes('popular') ? 
                    <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  }
                </button>
                {expandedSections.includes('popular') && (
                  <div className="p-4 flex flex-wrap gap-2">
                    {popularFormats.filter(f => f.count > 0).map(({ id, name, count }) => (
                      <Badge
                        key={id}
                        variant={selectedFormats.includes(id) ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${
                          selectedFormats.includes(id)
                            ? 'bg-[#2A4759] text-white hover:bg-[#1f3646]'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => toggleFormat(id)}
                        data-testid={`filter-format-${id.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {name} ({count})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Photo Formats */}
              {showPhotoFormats && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('photo')}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      📷 Formats Photo
                    </span>
                    {expandedSections.includes('photo') ? 
                      <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    }
                  </button>
                  {expandedSections.includes('photo') && (
                    <div className="p-4 flex flex-wrap gap-2">
                      {photoFormats.filter(f => f.count > 0).map(({ id, name, count }) => (
                        <Badge
                          key={id}
                          variant={selectedFormats.includes(id) ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            selectedFormats.includes(id)
                              ? 'bg-[#2A4759] text-white hover:bg-[#1f3646]'
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => toggleFormat(id)}
                          data-testid={`filter-format-photo-${id.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {name} ({count})
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Film Formats */}
              {showFilmFormats && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('film')}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      🎞️ Formats Film
                    </span>
                    {expandedSections.includes('film') ? 
                      <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    }
                  </button>
                  {expandedSections.includes('film') && (
                    <div className="p-4 flex flex-wrap gap-2">
                      {filmFormats.filter(f => f.count > 0).map(({ id, name, count }) => (
                        <Badge
                          key={id}
                          variant={selectedFormats.includes(id) ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            selectedFormats.includes(id)
                              ? 'bg-[#2A4759] text-white hover:bg-[#1f3646]'
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => toggleFormat(id)}
                          data-testid={`filter-format-film-${id.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {name} ({count})
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Video Formats */}
              {showVideoFormats && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('video')}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      📹 Formats Vidéo
                    </span>
                    {expandedSections.includes('video') ? 
                      <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    }
                  </button>
                  {expandedSections.includes('video') && (
                    <div className="p-4 flex flex-wrap gap-2">
                      {videoFormats.filter(f => f.count > 0).map(({ id, name, count }) => (
                        <Badge
                          key={id}
                          variant={selectedFormats.includes(id) ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            selectedFormats.includes(id)
                              ? 'bg-[#2A4759] text-white hover:bg-[#1f3646]'
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => toggleFormat(id)}
                          data-testid={`filter-format-video-${id.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {name} ({count})
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                {mappablePartners.map((partner, index) => (
                  partner.lat && partner.lng && (
                    <Marker
                      key={index}
                      position={[partner.lat, partner.lng]}
                      eventHandlers={{
                        click: () => setSelectedPartner(partner.slug)
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-bold text-[#2A4759]">{partner.name}</h4>
                          <p className="text-sm text-gray-600">{partner.city}</p>
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
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
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
                  className={`transition-all ${
                    selectedPartner === partner.slug
                      ? 'ring-2 ring-[#D67C4A] shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  data-testid={`partner-card-${partner.slug}`}
                >
                  <CardContent className="p-4">
                    <h3 className="text-lg font-bold text-[#2A4759] mb-2">{partner.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <MapPin className="h-4 w-4" />
                      <span>{partner.city}</span>
                    </div>
                    
                    {/* Services Badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {partner.services.map(service => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>

                    {/* Description */}
                    {partner.public_description && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {partner.public_description}
                      </p>
                    )}

                    {/* Contact */}
                    <div className="flex flex-wrap gap-3 text-sm">
                      {partner.website && (
                        <a
                          href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#D67C4A] hover:underline"
                        >
                          <Globe className="h-4 w-4" />
                          Site web
                        </a>
                      )}
                      {partner.phone && (
                        <a
                          href={`tel:${partner.phone}`}
                          className="flex items-center gap-1 text-[#2A4759] hover:underline"
                        >
                          <Phone className="h-4 w-4" />
                          {partner.phone}
                        </a>
                      )}
                      {partner.email && (
                        <a
                          href={`mailto:${partner.email}`}
                          className="flex items-center gap-1 text-[#2A4759] hover:underline"
                        >
                          <Mail className="h-4 w-4" />
                          Contact
                        </a>
                      )}
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
