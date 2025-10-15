import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Phone, Mail, Globe, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  
  console.log('🗺️ Filtered partners:', filteredPartners);
  console.log('🗺️ Mappable partners (with coordinates):', mappablePartners);
  console.log('🗺️ Mappable count:', mappablePartners.length);

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

  // Popular format chips with counts (French labels)
  const popularFormats = [
    { id: 'Prints', label: 'Tirages' },
    { id: 'Slides 35mm', label: 'Diapos 35mm' },
    { id: 'VHS', label: 'VHS' },
    { id: 'Super 8', label: 'Super 8' }
  ];
  const formatCounts = popularFormats.map(format => ({
    id: format.id,
    name: format.label,
    count: partners.filter(p => 
      p.formats.photo.includes(format.id) ||
      p.formats.film.includes(format.id) ||
      p.formats.video.includes(format.id)
    ).length
  }));

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
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Services
              </h3>
              <div className="flex flex-wrap gap-2">
                {serviceCounts.map(({ name, count }) => (
                  <Badge
                    key={name}
                    variant={selectedServices.includes(name) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      selectedServices.includes(name)
                        ? 'bg-[#D67C4A] text-white'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => toggleService(name)}
                    data-testid={`filter-service-${name.toLowerCase()}`}
                  >
                    {name} ({count})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Format Filters */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Formats populaires</h3>
              <div className="flex flex-wrap gap-2">
                {formatCounts.map(({ name, count }) => (
                  <Badge
                    key={name}
                    variant={selectedFormats.includes(name) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      selectedFormats.includes(name)
                        ? 'bg-[#2A4759] text-white'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => toggleFormat(name)}
                    data-testid={`filter-format-${name.toLowerCase().replace(/\s+/g, '-')}`}
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
            ) : filteredPartners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-semibold">Aucun résultat</p>
                <p className="mt-2">Essayez d'élargir la zone ou de retirer des filtres.</p>
              </div>
            ) : (
              filteredPartners.map((partner, index) => (
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
