/**
 * Date utility functions for MEMOPYK application
 * All dates should be formatted as "dd mmm yyyy" throughout the application
 */

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format date to "dd mmm yyyy" format (e.g., "29 Jul 2025")
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Format date and time to "dd mmm yyyy, HH:mm" format
 * @param date - Date object or ISO string
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const dateStr = formatDate(d);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${dateStr}, ${hours}:${minutes}`;
}

/**
 * Get relative time (e.g., "2 hours ago", "3 days ago")
 * @param date - Date object or ISO string
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;
  
  return formatDate(d);
}