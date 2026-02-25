/**
 * @file Landing Page Constants
 * @description Configuration constants and static data for the landing page
 * @module Landing/Constants
 */

import { Platform, Dimensions } from 'react-native';
import type { MenuItem } from '../types';

/** Screen width dimension */
export const SCREEN_WIDTH = Dimensions.get('window').width;

/** Platform detection - Web platform */
export const IS_WEB = Platform.OS === 'web';

/** Device type - Tablet detection (screen width > 768px) */
export const IS_TABLET = SCREEN_WIDTH > 768;

/** Device type - Mobile web detection */
export const IS_MOBILE_WEB = IS_WEB && SCREEN_WIDTH <= 768;

/**
 * Navigation menu items configuration
 * Ordered list of sections in the floating navigation menu
 * Labels are now in the translation files (landing.menu.{id})
 */
export const MENU_ITEMS: MenuItem[] = [
  { id: 'stats', icon: 'stats-chart-outline' },
  { id: 'vision', icon: 'bulb-outline' },
  { id: 'problems', icon: 'alert-circle-outline' },
  { id: 'features', icon: 'apps-outline' },
  { id: 'about', icon: 'information-circle-outline' },
  { id: 'how', icon: 'help-circle-outline' },
  { id: 'who', icon: 'people-outline' },
  { id: 'values', icon: 'heart-outline' },
  { id: 'hierarchy', icon: 'git-network-outline' },
  { id: 'roadmap', icon: 'map-outline' },
  { id: 'contact', icon: 'mail-outline' },
  { id: 'faq', icon: 'chatbubble-ellipses-outline' },
];

/**
 * WhatsApp contact number for direct messaging
 */
export const WHATSAPP_CONTACT = '972528616878';

/**
 * WhatsApp contact URL
 */
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_CONTACT}`;

/**
 * Instagram profile URL
 */
export const INSTAGRAM_URL = 'https://www.instagram.com/karmacommunity.il';

/**
 * Default statistics fallback values
 */
export const DEFAULT_STATS = {
  siteVisits: 0,
  totalMoneyDonated: 0,
  totalUsers: 0,
  itemDonations: 0,
  completedRides: 0,
  recurringDonationsAmount: 0,
  uniqueDonors: 0,
  completedTasks: 0,
};

/**
 * Animation duration constants (in milliseconds)
 */
export const ANIMATION_DURATION = {
  HERO: 800,
  HERO_DELAY: 200,
  FADE: 300,
  SLIDE: 400,
};

/**
 * Scroll offset for navigation (in pixels)
 */
export const SCROLL_OFFSET = -100;

/**
 * Lazy loading configuration
 */
export const LAZY_LOADING = {
  /** Root margin for intersection observer */
  ROOT_MARGIN: '0px 0px 100px 0px',
  
  /** Minimum section height for lazy loading */
  MIN_HEIGHT: 200,
};
