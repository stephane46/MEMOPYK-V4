import React from 'react';
import { Calendar, ChevronDown, Filter, X, Clock } from 'lucide-react';
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
import { useAnalyticsNewFilters, DATE_PRESETS } from './analyticsNewFilters.store';
import './analyticsNew.tokens.css';

interface AnalyticsNewGlobalFiltersProps {
  className?: string;
}

export const AnalyticsNewGlobalFilters: React.FC<AnalyticsNewGlobalFiltersProps> = ({ 
  className = '' 
}) => {
  const {
    datePreset,
    customDateStart,
    customDateEnd,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId,
    setDatePreset,
    setCustomDateRange,
    setSinceDate,
    setSinceDateEnabled,
    setLanguage,
    setCountry,
    setVideoId,
    getActiveFilters,
    reset,
  } = useAnalyticsNewFilters();

  const activeFilters = getActiveFilters();
  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className={`analytics-new-container ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Date Presets */}
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

          {/* Custom Date Range - Show when custom is selected */}
          {datePreset === 'custom' && (
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateRange(e.target.value, customDateEnd)}
                className="w-32"
                data-testid="filter-custom-start"
              />
              <span className="text-sm text-gray-500">to</span>
              <Input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateRange(customDateStart, e.target.value)}
                className="w-32"
                data-testid="filter-custom-end"
              />
            </div>
          )}

          {/* Temporal Filtering Section */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-orange-800 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Temporal Filtering
              </h3>
              <p className="text-xs text-orange-600 mt-1">
                Filter analytics data from a specific start date onwards
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="since-date-toggle"
                  checked={sinceDateEnabled}
                  onCheckedChange={setSinceDateEnabled}
                  data-testid="since-date-toggle"
                />
                <Label htmlFor="since-date-toggle" className="text-sm font-medium text-orange-700">
                  Enable Start Date Filter
                </Label>
              </div>
              {sinceDateEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-700">From:</span>
                  <Input
                    type="date"
                    value={sinceDate}
                    onChange={(e) => setSinceDate(e.target.value)}
                    className="w-32 border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                    placeholder="Select start date"
                    data-testid="since-date-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Additional Filters */}
          <div className="flex gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="seo-language-btn-inactive"
                  data-testid="filter-more-trigger"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  More Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="font-medium text-sm">Additional Filters</div>
                  
                  {/* Language Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Language
                    </label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger data-testid="filter-language">
                        <SelectValue placeholder="All languages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All languages</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Country Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Country
                    </label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger data-testid="filter-country">
                        <SelectValue placeholder="All countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All countries</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Video Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Video
                    </label>
                    <Select value={videoId} onValueChange={setVideoId}>
                      <SelectTrigger data-testid="filter-video">
                        <SelectValue placeholder="All videos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All videos</SelectItem>
                        <SelectItem value="hero1">Hero Video 1</SelectItem>
                        <SelectItem value="hero2">Hero Video 2</SelectItem>
                        <SelectItem value="hero3">Hero Video 3</SelectItem>
                        <SelectItem value="gallery1">Gallery Video 1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reset Button */}
                  {activeFilterCount > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={reset}
                      className="w-full analytics-new-button-secondary"
                      data-testid="filter-reset"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reset All Filters
                    </Button>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-medium text-gray-600">Active filters:</span>
              {language !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  Language: {language}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setLanguage('all')}
                  />
                </Badge>
              )}
              {country !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  Country: {country}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setCountry('all')}
                  />
                </Badge>
              )}
              {videoId !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  Video: {videoId}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setVideoId('all')}
                  />
                </Badge>
              )}
              {sinceDateEnabled && sinceDate && (
                <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Since: {sinceDate}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setSinceDateEnabled(false)}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};