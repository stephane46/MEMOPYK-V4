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

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => new Date().toISOString().split('T')[0];

const defaultState: AnalyticsNewFilters = {
  datePreset: 'today',
  customDateStart: '',
  customDateEnd: '',
  sinceDate: getTodayDate(), // Default to today
  sinceDateEnabled: true, // Enabled by default
  language: 'all',
  country: 'all', 
  videoId: 'all',
  isLoading: false,
  error: null,
};

export const useAnalyticsNewFilters = create<AnalyticsNewFiltersStore>()((set, get) => ({
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
    
    if (state.datePreset === 'custom') {
      return {
        start: state.customDateStart,
        end: state.customDateEnd
      };
    }
    
    if (state.datePreset === 'today') {
      const todayStr = todayParis.toFormat('yyyy-LL-dd');
      return {
        start: todayStr,
        end: todayStr
      };
    }
    
    if (state.datePreset === 'yesterday') {
      const yesterdayStr = todayParis.minus({ days: 1 }).toFormat('yyyy-LL-dd');
      return {
        start: yesterdayStr,
        end: yesterdayStr
      };
    }
    
    // Handle existing day-based presets
    const days = state.datePreset === '7d' ? 7 : state.datePreset === '30d' ? 30 : 90;
    const startDate = todayParis.minus({ days });
    
    return {
      start: startDate.toFormat('yyyy-LL-dd'),
      end: todayParis.toFormat('yyyy-LL-dd')
    };
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
}));

// Helper function to format dates for active window display
export const formatParisDateWindow = (start: string, end: string): string => {
  const ZONE = 'Europe/Paris';
  const startDate = DateTime.fromISO(start).setZone(ZONE);
  const endDate = DateTime.fromISO(end).setZone(ZONE);
  
  // French formatting: DD MMMM YYYY
  const formatFrench = (date: DateTime) => date.setLocale('fr').toFormat('dd LLLL yyyy');
  
  if (start === end) {
    // Single day
    return formatFrench(startDate);
  } else {
    // Date range
    return `${formatFrench(startDate)} – ${formatFrench(endDate)}`;
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