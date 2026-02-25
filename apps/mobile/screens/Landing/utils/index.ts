/**
 * @file Landing Page Utilities
 * @description Helper functions for the landing page
 * @module Landing/Utils
 */

import { IS_WEB, IS_MOBILE_WEB, SCREEN_WIDTH } from '../constants';
import type { MenuSizes } from '../types';

/**
 * Get the DOM element for a section by ID
 * Web-only utility for section navigation
 * 
 * @param sectionId - The section identifier
 * @returns The DOM element or null if not found/not web
 * 
 * @example
 * ```typescript
 * const element = getSectionElement('hero');
 * if (element) {
 *   element.scrollIntoView({ behavior: 'smooth' });
 * }
 * ```
 */
export const getSectionElement = (sectionId: string): HTMLElement | null => {
  if (!IS_WEB || typeof document === 'undefined') {
    return null;
  }

  const domId = sectionId.startsWith('section-')
    ? sectionId
    : `section-${sectionId}`;

  return (
    document.getElementById(domId) ??
    (document.querySelector(`[data-nativeid="${domId}"]`) as HTMLElement | null)
  );
};

/**
 * Calculate responsive sizes for floating menu based on screen width
 * Adapts menu dimensions for mobile, tablet, and desktop viewports
 * 
 * @returns Object containing responsive size values
 * 
 * @example
 * ```typescript
 * const sizes = getMenuSizes();
 * // { fontSize: 10, iconSize: 14, titleSize: 12, padding: 8 }
 * ```
 */
export const getMenuSizes = (): MenuSizes => {
  if (IS_MOBILE_WEB) {
    // Mobile web - smaller menu
    const menuWidth = SCREEN_WIDTH * 0.12; // 12% of screen width for mobile
    return {
      fontSize: Math.max(9, menuWidth * 0.12),
      iconSize: Math.max(12, menuWidth * 0.15),
      titleSize: Math.max(10, menuWidth * 0.13),
      padding: Math.max(6, menuWidth * 0.08),
    };
  }

  // Desktop/Tablet - larger menu
  const menuWidth = SCREEN_WIDTH * 0.1; // 10% of screen width
  return {
    fontSize: Math.max(10, menuWidth * 0.065),
    iconSize: Math.max(14, menuWidth * 0.08),
    titleSize: Math.max(12, menuWidth * 0.075),
    padding: Math.max(8, menuWidth * 0.05),
  };
};

/**
 * Format large numbers with commas for better readability
 * 
 * @param num - The number to format
 * @returns Formatted string with comma separators
 * 
 * @example
 * ```typescript
 * formatNumber(1234567); // "1,234,567"
 * ```
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('he-IL');
};

/**
 * Format currency amount in Israeli Shekels
 * 
 * @param amount - The amount to format
 * @returns Formatted currency string
 * 
 * @example
 * ```typescript
 * formatCurrency(1234.56); // "₪1,234.56"
 * ```
 */
export const formatCurrency = (amount: number): string => {
  return `₪${formatNumber(amount)}`;
};

/**
 * Scroll to a specific section with smooth animation
 * 
 * @param sectionId - The ID of the section to scroll to
 * @param offset - Optional offset in pixels (default: -100)
 * 
 * @example
 * ```typescript
 * scrollToSection('hero', -80);
 * ```
 */
export const scrollToSection = (
  sectionId: string,
  offset: number = -100
): void => {
  const element = getSectionElement(sectionId);

  if (!element) {
    return;
  }

  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition + offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });
};

/**
 * Check if an element is currently in the viewport
 * 
 * @param element - The DOM element to check
 * @param threshold - Percentage of element that must be visible (0-1)
 * @returns True if element is in viewport
 * 
 * @example
 * ```typescript
 * const element = document.getElementById('hero');
 * if (isInViewport(element, 0.5)) {
 *   // At least 50% of element is visible
 * }
 * ```
 */
export const isInViewport = (
  element: HTMLElement | null,
  threshold: number = 0.5
): boolean => {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const vertInView = rect.top <= windowHeight && rect.top + rect.height * threshold >= 0;
  const horInView = rect.left <= windowWidth && rect.left + rect.width >= 0;

  return vertInView && horInView;
};
