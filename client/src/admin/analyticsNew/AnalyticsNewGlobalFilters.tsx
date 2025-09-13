import React, { useState } from 'react';
import { Calendar, ChevronDown, Filter, X, Clock, CalendarIcon, Info, Globe, Languages } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnalyticsNewFilters, DATE_PRESETS, formatParisDateWindow } from './analyticsNewFilters.store';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import './analyticsNew.tokens.css';

interface AnalyticsNewGlobalFiltersProps {
  className?: string;
}

// Simple English date formatter for Start Override badge
const formatEnglishDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const AnalyticsNewGlobalFilters: React.FC<AnalyticsNewGlobalFiltersProps> = ({ 
  className = '' 
}) => {
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [sinceCalendarOpen, setSinceCalendarOpen] = useState(false);
  const {
    datePreset,
    customDateStart,
    customDateEnd,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    setDatePreset,
    setCustomDateRange,
    setSinceDate,
    setSinceDateEnabled,
    setLanguage,
    setCountry,
    setVideoId,
    getActiveFilters,
    getDateRange,
    reset,
  } = useAnalyticsNewFilters();

  const activeFilters = getActiveFilters();
  const activeFilterCount = Object.keys(activeFilters).length;

  
  // Display logic: Show what the user actually selected (ignoring exclusions)
  const getDisplayDateRange = () => {
    const ZONE = 'Europe/Paris';
    const todayParis = DateTime.now().setZone(ZONE).startOf('day');
    
    if (datePreset === 'custom') {
      if (!customDateStart || !customDateEnd) {
        const todayStr = todayParis.toFormat('yyyy-LL-dd');
        return { start: todayStr, end: todayStr };
      }
      return { start: customDateStart, end: customDateEnd };
    }
    
    if (datePreset === 'today') {
      const todayStr = todayParis.toFormat('yyyy-LL-dd');
      return { start: todayStr, end: todayStr };
    }
    
    if (datePreset === 'yesterday') {
      const yesterdayStr = todayParis.minus({ days: 1 }).toFormat('yyyy-LL-dd');
      return { start: yesterdayStr, end: yesterdayStr };
    }
    
    // Handle day-based presets without exclusions
    const days = datePreset === '7d' ? 7 : datePreset === '30d' ? 30 : 90;
    const startDate = todayParis.minus({ days });
    
    return {
      start: startDate.toFormat('yyyy-LL-dd'),
      end: todayParis.toFormat('yyyy-LL-dd')
    };
  };
  
  const displayRange = getDisplayDateRange();
  const windowDisplay = formatParisDateWindow(displayRange.start, displayRange.end);

  return (
    <div className={`analytics-new-container ${className} sticky top-0 z-10 bg-white border-b border-gray-200 pb-2 mb-1`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Date Presets */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Active Window Display */}
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="bg-blue-50 border-blue-300 text-blue-800 text-sm font-medium"
                data-testid="active-window-badge"
              >
                <div className="flex flex-col">
                  <span>{windowDisplay}</span>
                  {sinceDateEnabled && sinceDate && (
                    <span className="text-orange-700 text-xs mt-1">
                      ⚠️ Excluding data before: {formatEnglishDate(sinceDate)}
                    </span>
                  )}
                </div>
              </Badge>
              
              {/* Badge System Info */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="text-sm space-y-1">
                      <div className="font-medium">Data Source Legend:</div>
                      <div>🟠 IP Filtered = Data that respects your IP exclusions (Supabase analytics)</div>
                      <div>No badge = Raw GA4 data that cannot be filtered by IP</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Date Preset Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 flex items-center mr-2">
                <Calendar className="h-4 w-4 mr-1" />
                Date Range:
              </span>
              {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                variant={datePreset === preset.key ? "default" : "outline"}
                size="sm"
                onClick={() => setDatePreset(preset.key)}
                className={datePreset === preset.key ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
                data-testid={`filter-preset-${preset.key}`}
              >
                {preset.label}
              </Button>
            ))}
            </div>
          </div>

          {/* Custom Date Range - Show when custom is selected */}
          {datePreset === 'custom' && (
            <div className="flex gap-2 items-center">
              {/* Start Date with Calendar */}
              <div className="relative">
                <Input
                  type="text"
                  value={(() => {
                    if (!customDateStart) return '';
                    // If it's already in DD/MM/YYYY format, return as-is
                    if (customDateStart.includes('/')) return customDateStart;
                    // Otherwise convert from YYYY-MM-DD to DD/MM/YYYY
                    const date = new Date(customDateStart);
                    if (isNaN(date.getTime())) return customDateStart;
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                  })()}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow typing - store the display value temporarily
                    if (value.length <= 10) {
                      // If complete DD/MM/YYYY format, convert to YYYY-MM-DD for backend
                      const parts = value.split('/');
                      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                        const [day, month, year] = parts;
                        if (!isNaN(Number(day)) && !isNaN(Number(month)) && !isNaN(Number(year))) {
                          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                          setCustomDateRange(isoDate, customDateEnd);
                          return;
                        }
                      }
                      // Otherwise store as display format for partial input
                      setCustomDateRange(value, customDateEnd);
                    }
                  }}
                  className="w-44 pr-8"
                  data-testid="filter-custom-start"
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                />
                <Dialog open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                      data-testid="start-date-calendar-trigger"
                    >
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-auto">
                    <CalendarComponent
                      mode="single"
                      selected={customDateStart ? new Date(customDateStart.includes('/') ? 
                        customDateStart.split('/').reverse().join('-') : customDateStart) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Fix timezone issue - use local date formatting
                          const year = date.getFullYear();
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const day = date.getDate().toString().padStart(2, '0');
                          const isoDate = `${year}-${month}-${day}`;
                          setCustomDateRange(isoDate, customDateEnd);
                        }
                        setStartCalendarOpen(false);
                      }}
                      weekStartsOn={1}
                      initialFocus
                    />
                  </DialogContent>
                </Dialog>
              </div>
              
              <span className="text-sm text-gray-500">to</span>
              
              {/* End Date with Calendar */}
              <div className="relative">
                <Input
                  type="text"
                  value={(() => {
                    if (!customDateEnd) return '';
                    // If it's already in DD/MM/YYYY format, return as-is
                    if (customDateEnd.includes('/')) return customDateEnd;
                    // Otherwise convert from YYYY-MM-DD to DD/MM/YYYY
                    const date = new Date(customDateEnd);
                    if (isNaN(date.getTime())) return customDateEnd;
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                  })()}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow typing - store the display value temporarily
                    if (value.length <= 10) {
                      // If complete DD/MM/YYYY format, convert to YYYY-MM-DD for backend
                      const parts = value.split('/');
                      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                        const [day, month, year] = parts;
                        if (!isNaN(Number(day)) && !isNaN(Number(month)) && !isNaN(Number(year))) {
                          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                          setCustomDateRange(customDateStart, isoDate);
                          return;
                        }
                      }
                      // Otherwise store as display format for partial input
                      setCustomDateRange(customDateStart, value);
                    }
                  }}
                  className="w-44 pr-8"
                  data-testid="filter-custom-end"
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                />
                <Dialog open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                      data-testid="end-date-calendar-trigger"
                    >
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-auto">
                    <CalendarComponent
                      mode="single"
                      selected={customDateEnd ? new Date(customDateEnd.includes('/') ? 
                        customDateEnd.split('/').reverse().join('-') : customDateEnd) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Fix timezone issue - use local date formatting
                          const year = date.getFullYear();
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const day = date.getDate().toString().padStart(2, '0');
                          const isoDate = `${year}-${month}-${day}`;
                          setCustomDateRange(customDateStart, isoDate);
                        }
                        setEndCalendarOpen(false);
                      }}
                      weekStartsOn={1}
                      initialFocus
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}


          {/* Additional Filters - Inline with Date Filters */}
          <div className="flex flex-wrap gap-3 items-center ml-6 pl-6 border-l border-gray-200">
            <span className="text-sm font-medium text-gray-700 flex items-center mr-2">
              <Filter className="h-4 w-4 mr-1" />
              Filters:
            </span>
            
            {/* Language Filter */}
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-gray-500" />
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-32" data-testid="filter-language">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Country Filter */}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-32" data-testid="filter-country">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="Spain">Spain</SelectItem>
                  <SelectItem value="Italy">Italy</SelectItem>
                  <SelectItem value="Brazil">Brazil</SelectItem>
                  <SelectItem value="Japan">Japan</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Reset Button - Only show if filters are active */}
            {activeFilterCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={reset}
                className="ml-2 h-8 px-2"
                data-testid="filter-reset"
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};