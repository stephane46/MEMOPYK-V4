// server/utils/dateRangeFromQuery.ts
import { resolveDates } from './resolveDates';

type Preset = "7d" | "30d" | "90d";

interface QueryParams {
  preset?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}

interface DateRangeResult {
  startDate: string;
  endDate: string;
  isPreset: boolean;
  resolvedFrom: 'preset' | 'explicit' | 'default';
}

/**
 * Centralizes parsing and validation of date range query parameters.
 * Provides helpful error messages and consistent behavior across endpoints.
 */
export function dateRangeFromQuery(query: QueryParams): DateRangeResult {
  const { preset, startDate, endDate } = query;

  // Validate preset if provided
  if (preset && !['7d', '30d', '90d'].includes(preset)) {
    throw new Error(`Invalid preset "${preset}". Must be one of: 7d, 30d, 90d`);
  }

  // Validate date format if provided
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (startDate && !dateRegex.test(startDate)) {
    throw new Error(`Invalid startDate "${startDate}". Must be YYYY-MM-DD format`);
  }
  
  if (endDate && !dateRegex.test(endDate)) {
    throw new Error(`Invalid endDate "${endDate}". Must be YYYY-MM-DD format`);
  }

  // Validate date range logic
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      throw new Error(`Invalid date range: startDate "${startDate}" is after endDate "${endDate}"`);
    }
    
    // Check for reasonable range (not more than 1 year)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      throw new Error(`Date range too large: ${daysDiff} days. Maximum allowed is 365 days`);
    }
  }

  // Resolve dates using the helper
  const resolved = resolveDates(preset as Preset, startDate, endDate);

  // Determine how the date range was resolved
  let resolvedFrom: 'preset' | 'explicit' | 'default';
  if (preset) {
    resolvedFrom = 'preset';
  } else if (startDate && endDate) {
    resolvedFrom = 'explicit';
  } else {
    resolvedFrom = 'default';
  }

  return {
    ...resolved,
    isPreset: !!preset,
    resolvedFrom
  };
}