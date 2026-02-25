/**
 * @file Landing Page Type Definitions
 * @description TypeScript interfaces and types for the Karma Community landing page
 * @module Landing/Types
 */

/**
 * Statistics data displayed on the landing page
 * @interface LandingStats
 */
export interface LandingStats {
  /** Total number of visits to the site */
  siteVisits: number;

  /** Total amount of money donated through the platform */
  totalMoneyDonated: number;

  /** Total number of registered users */
  totalUsers: number;

  /** Number of physical items donated */
  itemDonations: number;

  /** Number of completed ride-sharing trips */
  completedRides: number;

  /** Total amount from recurring donation subscriptions */
  recurringDonationsAmount: number;

  /** Number of unique donors who contributed */
  uniqueDonors: number;

  /** Number of completed volunteer tasks */
  completedTasks: number;
}

/**
 * Navigation menu item configuration
 * @interface MenuItem
 */
export interface MenuItem {
  /** Unique identifier for the menu item (used as translation key) */
  id: string;

  /** Ionicons icon name */
  icon: string;
}

/**
 * Props for section components
 * @interface SectionProps
 */
export interface SectionProps {
  /** Optional unique section identifier for navigation */
  id?: string;

  /** Section heading title */
  title: string;

  /** Optional subtitle text */
  subtitle?: string;

  /** Child components to render within the section */
  children?: React.ReactNode;

  /** Additional style overrides */
  style?: any;
}

/**
 * Props for feature card component
 * @interface FeatureProps
 */
export interface FeatureProps {
  /** Emoji icon for visual representation */
  emoji: string;

  /** Feature title */
  title: string;

  /** Feature description text */
  text: string;

  /** Apply green accent styling */
  greenAccent?: boolean;
}

/**
 * Props for floating navigation menu
 * @interface FloatingMenuProps
 */
export interface FloatingMenuProps {
  /** Callback when navigating to a section */
  onNavigate: (section: string) => void;

  /** Currently active section ID */
  activeSection: string | null;
}

/**
 * Props for lazy-loaded section wrapper
 * @interface LazySectionProps
 */
export interface LazySectionProps {
  /** Section component to render */
  section: React.ComponentType<any>;

  /** Additional props to pass to the section component */
  [key: string]: any;
}

/**
 * Props for hero section
 * @interface HeroSectionProps
 */
export interface HeroSectionProps {
  /** Callback when donate button is clicked */
  onDonate: () => void;
}

/**
 * Props for stats section
 * @interface StatsSectionProps
 */
export interface StatsSectionProps {
  /** Statistics data to display */
  stats: LandingStats;

  /** Loading state indicator */
  isLoadingStats: boolean;

  /** Callback to navigate to app */
  onGoToApp: () => void;
}

/**
 * Props for donation modal
 * @interface DonationModalProps
 */
export interface DonationModalProps {
  /** Modal visibility state */
  visible: boolean;

  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * Props for stats detail modal
 * @interface StatsDetailModalProps
 */
export interface StatsDetailModalProps {
  /** Modal visibility state */
  visible: boolean;

  /** Callback to close the modal */
  onClose: () => void;

  /** Statistics data to display */
  stats: LandingStats;
}

/**
 * Props for FAQ item component
 * @interface FAQItemProps
 */
export interface FAQItemProps {
  /** Question text */
  question: string;

  /** Answer text */
  answer: string;

  /** Optional icon name */
  icon?: string;
}

/**
 * Props for "Who Is It For" section
 * @interface WhoIsItForSectionProps
 */
export interface WhoIsItForSectionProps {
  /** Callback when donate button is clicked */
  onDonate: () => void;
}

/**
 * Props for Vision section
 * @interface VisionSectionProps
 */
export interface VisionSectionProps {
  /** Callback to navigate to app */
  onGoToApp: () => void;
}

/**
 * Responsive menu size configuration
 * @interface MenuSizes
 */
export interface MenuSizes {
  /** Font size for menu items */
  fontSize: number;

  /** Icon size for menu items */
  iconSize: number;

  /** Title font size */
  titleSize: number;

  /** Padding for menu items */
  padding: number;
}
