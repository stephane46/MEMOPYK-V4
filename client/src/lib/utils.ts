import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Gallery Video Range Request Fix - July 27, 2025
export const DEPLOYMENT_VERSION = "1.0.1-range-fix";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
