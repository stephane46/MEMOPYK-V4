/**
 * Location Service using ipapi.co API
 * Free tier: 30,000 requests per month
 * Provides city, region, country information from IP addresses
 */

interface LocationData {
  ip: string;
  city: string;
  region: string;
  region_code: string;
  country: string;
  country_name: string;
  country_code: string;
  continent_code: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  asn: string;
  org: string;
}

interface EnrichedLocationData {
  ip: string;
  city: string;
  region: string;
  country: string;
  country_name: string;
  country_code: string;
  timezone: string;
  organization: string;
  latitude?: number;
  longitude?: number;
}

class LocationService {
  private cache = new Map<string, EnrichedLocationData>();
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;

  /**
   * Get location data for an IP address
   * Uses caching to avoid repeated API calls
   */
  async getLocationData(ip: string): Promise<EnrichedLocationData | null> {
    // Return cached result if available
    if (this.cache.has(ip)) {
      console.log(`🌍 Location Service: Using cached data for ${ip}`);
      return this.cache.get(ip)!;
    }

    // Skip invalid or local IPs
    if (this.isLocalIP(ip) || ip === '0.0.0.0' || !ip) {
      return null;
    }

    try {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.rateLimitDelay) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
      }

      console.log(`🌍 Location Service: Fetching data for IP ${ip}...`);
      
      const response = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: {
          'User-Agent': 'MEMOPYK-Analytics/1.0'
        }
      });

      this.lastRequestTime = Date.now();

      if (!response.ok) {
        console.warn(`⚠️ Location Service: API error ${response.status} for IP ${ip}`);
        return null;
      }

      const data: LocationData = await response.json();
      
      // Check for API errors
      if ((data as any).error || !data.country) {
        console.warn(`⚠️ Location Service: Invalid response for IP ${ip}:`, data);
        return null;
      }

      const enrichedData: EnrichedLocationData = {
        ip: data.ip,
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        country: data.country || 'Unknown',
        country_name: data.country_name || 'Unknown',
        country_code: data.country_code || 'Unknown',
        timezone: data.timezone || 'Unknown',
        organization: data.org || 'Unknown',
        latitude: data.latitude,
        longitude: data.longitude
      };

      // Cache the result
      this.cache.set(ip, enrichedData);
      
      console.log(`✅ Location Service: Enriched data for ${ip}: ${enrichedData.city}, ${enrichedData.region}, ${enrichedData.country_name}`);
      return enrichedData;

    } catch (error) {
      console.error(`❌ Location Service: Error fetching data for IP ${ip}:`, error);
      return null;
    }
  }

  /**
   * Batch enrich multiple IPs (with rate limiting)
   */
  async enrichMultipleIPs(ips: string[]): Promise<Map<string, EnrichedLocationData>> {
    const results = new Map<string, EnrichedLocationData>();
    const uniqueIPs = Array.from(new Set(ips)).filter(ip => ip && !this.isLocalIP(ip));

    console.log(`🌍 Location Service: Enriching ${uniqueIPs.length} unique IPs...`);

    for (const ip of uniqueIPs) {
      const locationData = await this.getLocationData(ip);
      if (locationData) {
        results.set(ip, locationData);
      }
      
      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  /**
   * Check if IP is local/private
   */
  private isLocalIP(ip: string): boolean {
    return (
      ip.startsWith('127.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') ||
      ip.startsWith('172.17.') ||
      ip.startsWith('172.18.') ||
      ip.startsWith('172.19.') ||
      ip.startsWith('172.2') ||
      ip.startsWith('172.30.') ||
      ip.startsWith('172.31.') ||
      ip === '::1' ||
      ip === 'localhost'
    );
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cached_ips: this.cache.size,
      cache_keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Location Service: Cache cleared');
  }
}

// Export singleton instance
export const locationService = new LocationService();