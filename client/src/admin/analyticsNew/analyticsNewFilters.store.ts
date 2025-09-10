import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DateTime } from 'luxon';

export interface DatePreset {
  key: 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';
  label: string;
  days?: number;
}

export interface AnalyticsNewFilters {
  // Date filters
  datePreset: DatePreset['key'];
  customDateStart: string;
  customDateEnd: string;
  sinceDate: string;
  sinceDateEnabled: boolean;
  
  // Segmentation filters
  language: string;
  country: string;
  videoId: string;
  
  // UI state
  isLoading: boolean;
  error: string | null;
}

interface AnalyticsNewFiltersStore extends AnalyticsNewFilters {
  // Actions
  setDatePreset: (preset: DatePreset['key']) => void;
  setCustomDateRange: (start: string, end: string) => void;
  setSinceDate: (date: string) => void;
  setSinceDateEnabled: (enabled: boolean) => void;
  setLanguage: (language: string) => void;
  setCountry: (country: string) => void;
  setVideoId: (videoId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Computed
  getDateRange: () => { start: string; end: string };
  getActiveFilters: () => Partial<AnalyticsNewFilters>;
}

// Get yesterday's date in YYYY-MM-DD format in Paris timezone
const getYesterdayDate = () => {
  const ZONE = 'Europe/Paris';
  return DateTime.now().setZone(ZONE).minus({ days: 1 }).toFormat('yyyy-LL-dd');
};

// Removed unused getTodayDate function - using Paris timezone consistently

const defaultState: AnalyticsNewFilters = {
  datePreset: '7d',
  customDateStart: '',
  customDateEnd: '',
  sinceDate: getYesterdayDate(), // Default to yesterday in Paris timezone
  sinceDateEnabled: false, // Disable start date filter by default to use preset
  language: 'all',
  country: 'all', 
  videoId: 'all',
  isLoading: false,
  error: null,
};

export const useAnalyticsNewFilters = create<AnalyticsNewFiltersStore>()(
  // Add persistence with localStorage
  persist(
    (set, get) => ({
      ...defaultState,

      setDatePreset: (preset) => {
        set({ datePreset: preset });
        if (preset !== 'custom') {
          set({ customDateStart: '', customDateEnd: '' });
        }
      },

      setCustomDateRange: (start, end) => {
        set({ 
          customDateStart: start, 
          customDateEnd: end,
          datePreset: 'custom'
        });
      },

      setSinceDate: (date) => set({ sinceDate: date }),
      setSinceDateEnabled: (enabled) => set({ sinceDateEnabled: enabled }),

      setLanguage: (language) => set({ language }),
      setCountry: (country) => set({ country }),
      setVideoId: (videoId) => set({ videoId }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      reset: () => set(defaultState),

  getDateRange: () => {
    const state = get();
    const ZONE = 'Europe/Paris';
    const todayParis = DateTime.now().setZone(ZONE).startOf('day');
    
    let dateRange: { start: string; end: string };
    
    if (state.datePreset === 'custom') {
      // If custom dates are empty, fallback to today
      if (!state.customDateStart || !state.customDateEnd) {
        const todayStr = todayParis.toFormat('yyyy-LL-dd');
        dateRange = {
          start: todayStr,
          end: todayStr
        };
      } else {
        dateRange = {
          start: state.customDateStart,
          end: state.customDateEnd
        };
      }
    } else if (state.datePreset === 'today') {
      const todayStr = todayParis.toFormat('yyyy-LL-dd');
      dateRange = {
        start: todayStr,
        end: todayStr
      };
    } else if (state.datePreset === 'yesterday') {
      const yesterdayStr = todayParis.minus({ days: 1 }).toFormat('yyyy-LL-dd');
      dateRange = {
        start: yesterdayStr,
        end: yesterdayStr
      };
    } else {
      // Handle existing day-based presets
      const days = state.datePreset === '7d' ? 7 : state.datePreset === '30d' ? 30 : 90;
      const startDate = todayParis.minus({ days });
      
      dateRange = {
        start: startDate.toFormat('yyyy-LL-dd'),
        end: todayParis.toFormat('yyyy-LL-dd')
      };
    }
    
    // 🔧 FIX: Apply Start Date Filter when enabled
    if (state.sinceDateEnabled && state.sinceDate) {
      // Override start date with Since Date Filter, keep calculated end date
      dateRange.start = state.sinceDate;
    }
    
    return dateRange;
  },

  getActiveFilters: () => {
    const state = get();
    const filters: Partial<AnalyticsNewFilters> = {};
    
    if (state.language !== 'all') filters.language = state.language;
    if (state.country !== 'all') filters.country = state.country;
    if (state.videoId !== 'all') filters.videoId = state.videoId;
    if (state.sinceDateEnabled && state.sinceDate) filters.sinceDate = state.sinceDate;
    
    return filters;
  },
    }),
    {
      name: 'analytics-new-filters', // localStorage key
      partialize: (state) => ({
        sinceDate: state.sinceDate,
        sinceDateEnabled: state.sinceDateEnabled,
        datePreset: state.datePreset,
        customDateStart: state.customDateStart,
        customDateEnd: state.customDateEnd,
        language: state.language,
        country: state.country,
        videoId: state.videoId,
      }),
    }
  )
);

// Helper function to format dates for active window display
export const formatParisDateWindow = (start: string, end: string): string => {
  const ZONE = 'Europe/Paris';
  
  try {
    // Handle empty or undefined inputs
    if (!start || !end) {
      console.warn('formatParisDateWindow: Missing dates', { start, end });
      return 'Missing date';
    }
    
    // Handle various input formats: YYYY-MM-DD, ISO strings, etc.
    const parseDate = (dateStr: string) => {
      // If it's already a valid ISO string, use it
      if (dateStr.includes('T')) {
        return DateTime.fromISO(dateStr).setZone(ZONE);
      }
      // Otherwise assume YYYY-MM-DD format and convert to proper DateTime
      const dt = DateTime.fromFormat(dateStr, 'yyyy-LL-dd', { zone: ZONE });
      return dt.isValid ? dt : DateTime.fromISO(dateStr).setZone(ZONE);
    };
    
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    
    // Check if parsing was successful
    if (!startDate.isValid || !endDate.isValid) {
      console.error('formatParisDateWindow: Invalid date format:', { 
        start, 
        end, 
        startValid: startDate.isValid, 
        endValid: endDate.isValid,
        startError: startDate.invalidExplanation,
        endError: endDate.invalidExplanation 
      });
      return `Invalid dates: ${start} - ${end}`;
    }
    
    // English formatting: DD MMMM YYYY
    const formatEnglish = (date: DateTime) => date.setLocale('en').toFormat('dd LLLL yyyy');
    
    if (start === end) {
      // Single day
      return formatEnglish(startDate);
    } else {
      // Date range
      return `${formatEnglish(startDate)} – ${formatEnglish(endDate)}`;
    }
  } catch (error) {
    console.error('formatParisDateWindow: Exception:', error, { start, end });
    return 'Formatting error';
  }
};

export const DATE_PRESETS: DatePreset[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'custom', label: 'Custom range' },
];