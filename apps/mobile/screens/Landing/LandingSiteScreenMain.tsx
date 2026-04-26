import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import ScrollContainer from '../../components/ScrollContainer';
import { logger } from '../../utils/loggerService';
import { EnhancedStatsService } from '../../utils/statsService';
import { apiService } from '../../utils/apiService';
import { USE_BACKEND } from '../../utils/dbConfig';
import { useWebMode } from '../../stores/webModeStore';
import { useUser } from '../../stores/userStore';
import {
  FloatingMenu,
  HeroSection,
  LazySection,
} from './components';
import { navigateToAppModeFromLanding } from './navigateToAppModeFromLanding';
import { getSectionElement } from './utils';
import type { LandingStats } from './types';
import { IS_WEB } from './constants';
import { landingSiteScreenStyles as styles } from './landingSiteScreenStyles';
import { DonationModal } from './modals/DonationModal';
import { VisionSection } from './sections/VisionSection';
import { StatsSection } from './sections/StatsSection';
import { ProblemsSection } from './sections/ProblemsSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { WhoIsItForSection } from './sections/WhoIsItForSection';
import { ValuesSection } from './sections/ValuesSection';
import { CoreMottosSection } from './sections/CoreMottosSection';
import { AdminHierarchySection } from './sections/AdminHierarchySection';
import { RoadmapSection } from './sections/RoadmapSection';
import { AboutSection } from './sections/AboutSection';
import { GallerySection } from './sections/GallerySection';
import { PartnersSection } from './sections/PartnersSection';
import { InstagramSection } from './sections/InstagramSection';
import { FAQSection } from './sections/FAQSection';
import { ContactSection } from './sections/ContactSection';

const VISIT_TRACKED_KEY = 'kc_site_visit_tracked';

function getWebSessionStorage(): Storage | null {
  if (!IS_WEB || typeof globalThis.window === 'undefined') {
    return null;
  }
  return globalThis.sessionStorage;
}

function isLandingVisitAlreadyTrackedInSession(): boolean {
  const s = getWebSessionStorage();
  return s ? s.getItem(VISIT_TRACKED_KEY) === 'true' : false;
}

function markLandingVisitTrackedInSession(): void {
  const s = getWebSessionStorage();
  if (s) {
    s.setItem(VISIT_TRACKED_KEY, 'true');
  }
}

function clearLandingVisitTrackedInSession(): void {
  const s = getWebSessionStorage();
  if (s) {
    s.removeItem(VISIT_TRACKED_KEY);
  }
}

/** Visit tracking + initial stats; split out to keep the effect callback simple for static analysis. */
async function runLandingVisitTrackingAndStats(
  loadStats: (forceRefresh: boolean) => Promise<void>,
): Promise<void> {
  if (isLandingVisitAlreadyTrackedInSession()) {
    logger.info('LandingSite', 'Visit already tracked in this session, skipping');
    await loadStats(false);
    return;
  }
  if (!IS_WEB || !USE_BACKEND) {
    logger.info('LandingSite', 'Skipping site visit tracking', { IS_WEB, USE_BACKEND });
    await loadStats(false);
    return;
  }
  try {
    markLandingVisitTrackedInSession();
    logger.info('LandingSite', 'Tracking site visit...');
    const response = await apiService.trackSiteVisit();
    if (response.success) {
      logger.info('LandingSite', 'Site visit tracked successfully');
      await loadStats(true);
      return;
    }
    logger.warn('LandingSite', 'Site visit tracking failed', { error: response.error });
    clearLandingVisitTrackedInSession();
    await loadStats(false);
  } catch (error) {
    logger.error('LandingSite', 'Failed to track site visit', { error });
    clearLandingVisitTrackedInSession();
    await loadStats(false);
  }
}

export const LandingSiteScreen: React.FC = () => {
  logger.debug('LandingSite', 'Component rendered', undefined, { periodic: true });

  const { setMode } = useWebMode();
  const navigation = useNavigation<any>();
  const { isAuthenticated, isGuestMode, isAdmin } = useUser();

  const [stats, setStats] = useState<LandingStats>({
    siteVisits: 0,
    totalMoneyDonated: 0,
    totalUsers: 0,
    itemDonations: 0,
    completedRides: 0,
    recurringDonationsAmount: 0,
    uniqueDonors: 0,
    completedTasks: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const statsVersionRef = useRef<string>(''); // Use ref instead of state to prevent unnecessary re-renders
  const [showDonationModal, setShowDonationModal] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollSpyObserverRef = useRef<IntersectionObserver | null>(null);
  const observedElementsRef = useRef<Set<HTMLElement>>(new Set());

  // Ensure top bar and bottom bar are visible when this screen is focused
  // This fixes the issue where bars disappear when navigating from TopBar's AboutButton
  useFocusEffect(
    useCallback(() => {
      logger.debug('LandingSiteScreen', 'Screen focused, ensuring bars are visible');
      navigation.setParams({
        hideTopBar: false,
        hideBottomBar: false,
      });
    }, [navigation])
  );

  const handleGoToApp = async () => {
    await navigateToAppModeFromLanding(
      setMode,
      { isAuthenticated, isGuestMode, isAdmin },
      'LandingSiteScreen'
    );
  };

  // Handle navigation from floating menu
  const handleNavigate = (sectionId: string) => {
    logger.info('LandingSiteScreen', `Navigate to section: ${sectionId}`, {
      IS_WEB,
      hasScrollRef: !!scrollViewRef.current,
      platform: Platform.OS,
    });

    // For web, use DOM scrolling with container targeting to prevent window scroll
    if (IS_WEB) {
      const scrollToSection = (retryCount = 0) => {
        try {
          if (sectionId === 'top') {
            // Find the specific scroll container specifically to avoid window scrolling
            const scrollContainer = document.querySelector('[data-scroll-container="true"]');
            if (scrollContainer) {
              scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
              setActiveSection(sectionId);
              logger.info('LandingSiteScreen', 'Scrolled to top via container');
            } else {
              // Fallback if container not found
              globalThis.window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
          }

          const element = getSectionElement(sectionId);
          logger.info('LandingSiteScreen', `Found element for ${sectionId}:`, {
            found: !!element,
            elementId: element?.id || element?.getAttribute?.('data-nativeid') || null,
            retryCount,
          });

          if (element) {
            // Find the nearest scrollable parent explicitly
            let parent = element.parentElement;
            let scrollContainer: HTMLElement | null = null;

            while (parent) {
              const style = globalThis.window.getComputedStyle(parent);
              // Check for our specific scroll container or general overflow
              if (
                parent.getAttribute('data-scroll-container') === 'true' ||
                style.overflowY === 'auto' ||
                style.overflowY === 'scroll'
              ) {
                scrollContainer = parent;
                break;
              }
              parent = parent.parentElement;
            }

            if (scrollContainer) {
              // Calculate position relative to the container
              // We need to account for the element's position inside the container
              const containerRect = scrollContainer.getBoundingClientRect();
              const elementRect = element.getBoundingClientRect();

              // Current scroll position + difference in tops
              const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top);

              // Add a small offset for breathing room (e.g., 20px)
              const offset = 20;

              scrollContainer.scrollTo({
                top: scrollTop - offset,
                behavior: 'smooth',
              });

              setActiveSection(sectionId);
              logger.info('LandingSiteScreen', `Scrolled to section via container: ${sectionId}`);
            } else {
              // Fallback to scrollIntoView only if no container found (unlikely in our app structure)
              // Use block: 'center' to avoid aggressive top alignment that might pull the window
              element.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
              setActiveSection(sectionId);
              logger.warn('LandingSiteScreen', 'Scroll container not found, using scrollIntoView fallback');
            }
          } else if (retryCount < 10) {
            // Retry if element not found yet (DOM might still be rendering)
            setTimeout(() => scrollToSection(retryCount + 1), 100);
            logger.info('LandingSiteScreen', `Retrying to find section: ${sectionId}, attempt ${retryCount + 1}`);
          } else {
            logger.warn('LandingSiteScreen', `Section not found after ${retryCount} retries: ${sectionId}`);
          }
        } catch (error) {
          logger.error('LandingSiteScreen', 'Error scrolling to section', { error, sectionId });
        }
      };

      scrollToSection();
    } else {
      // For native, use ScrollView ref
      if (sectionId === 'top' && scrollViewRef.current) {
        scrollViewRef.current.scrollTo?.({ y: 0, animated: true });
        logger.info('LandingSiteScreen', 'Scrolled to top via ScrollView ref');
      } else {
        // Should implemented map of refs for sections if needed for native
        // But currently this feature is mostly for web landing page
        logger.warn('LandingSiteScreen', 'Native scrolling not implemented for specific sections');
      }
    }
  };

  // Shared loadStats function - used by both initial load and auto-refresh
  // פונקציה משותפת לטעינת סטטיסטיקות - משמשת גם לטעינה ראשונית וגם לרענון אוטומטי
  const loadStats = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingStats(true);
      logger.info('LandingSite', 'Loading stats', { forceRefresh });
      const communityStats = await EnhancedStatsService.getCommunityStats({}, forceRefresh);

      // Extract values - handle both direct values and nested value objects
      // תמיכה בשני פורמטים: מספר ישיר או אובייקט עם שדה value
      // Support for two formats: direct number or object with value field
      const getValue = (stat: any): number => {
        if (typeof stat === 'number') return stat;
        if (stat && typeof stat === 'object' && 'value' in stat) return stat.value || 0;
        return 0;
      };

      const statsData = {
        siteVisits: getValue(communityStats.siteVisits) || 0,
        totalMoneyDonated: getValue(communityStats.totalMoneyDonated) || 0,
        totalUsers: getValue(communityStats.totalUsers) || 0,
        itemDonations: getValue(communityStats.itemDonations) || 0,
        completedRides: getValue(communityStats.completedRides) || 0,
        recurringDonationsAmount: getValue(communityStats.recurringDonationsAmount) || 0,
        uniqueDonors: getValue(communityStats.uniqueDonors) || 0,
        completedTasks: getValue(communityStats.completed_tasks) || 0,
      };

      logger.info('LandingSite', 'Stats loaded', statsData, { periodic: true });
      setStats(statsData);
    } catch (error) {
      logger.error('LandingSite', 'Failed to load stats', { error });
      // Keep default values (0) on error
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Smart polling - only refresh when stats actually change
  // בדיקה חכמה - רק מרענן כשיש שינוי אמיתי בסטטיסטיקות
  useEffect(() => {
    if (!USE_BACKEND) {
      logger.info('LandingSite', 'Backend not available, skipping smart polling');
      return;
    }

    logger.info('LandingSite', 'Setting up smart polling (checks every 30 seconds)');

    const checkForUpdates = async () => {
      try {
        // Lightweight check - only gets version hash
        const response = await apiService.getCommunityStatsVersion();
        if (response.success && response.version) {
          const newVersion = response.version;
          const currentVersion = statsVersionRef.current;

          // Only reload if version actually changed
          if (currentVersion && newVersion !== currentVersion) {
            logger.info('LandingSite', 'Stats version changed, reloading...', {
              oldVersion: currentVersion,
              newVersion: newVersion
            });
            await loadStats(true); // Force refresh to get latest data
            // Update version ref only after successful reload
            statsVersionRef.current = newVersion;
          } else if (!currentVersion) {
            // First time - set initial version without reloading (stats already loaded on mount)
            statsVersionRef.current = newVersion;
            logger.info('LandingSite', 'Initial stats version set', { version: newVersion });
          }
          // If version didn't change, do nothing - no re-render needed
        }
      } catch (error) {
        logger.error('LandingSite', 'Failed to check stats version', { error });
      }
    };

    // Check immediately on mount (but don't reload if stats already loaded)
    checkForUpdates();

    // Set up interval to check for updates every 30 seconds (reduced from 5 seconds to prevent excessive checks)
    // Only reloads if version actually changed in database
    const pollInterval = setInterval(checkForUpdates, 30000);

    // Cleanup interval on unmount
    return () => {
      logger.info('LandingSite', 'Clearing smart polling interval');
      clearInterval(pollInterval);
    };
  }, [loadStats]); // Removed statsVersion from dependencies to prevent re-renders

  useEffect(() => {
    logger.info('LandingSite', 'useEffect triggered - Landing page mounted', { IS_WEB, USE_BACKEND });
    runLandingVisitTrackingAndStats(loadStats).catch((err: unknown) => {
      logger.error('LandingSite', 'runLandingVisitTrackingAndStats failed', { error: err });
    });
    return () => {
      logger.info('LandingSite', 'Landing page unmounted');
    };
  }, [loadStats]);


  // Scroll Spy - Track which section is currently in view
  useEffect(() => {
    if (!IS_WEB) return; // Works on all web screens including mobile

    const sectionIds = ['stats', 'vision', 'problems', 'features', 'about', 'how', 'who', 'values', 'core-mottos', 'hierarchy', 'roadmap', 'contact', 'faq'];

    // Create Intersection Observer
    const observerOptions = {
      root: null, // viewport
      rootMargin: '-20% 0px -70% 0px', // Trigger when section is in middle third of viewport
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const targetElement = entry.target as HTMLElement;
          const identifier = targetElement.id || targetElement.getAttribute('data-nativeid') || '';
          const sectionId = identifier.replace('section-', '');
          if (!sectionId) {
            return;
          }
          logger.info('ScrollSpy', `Section ${sectionId} is now in view`);
          setActiveSection(sectionId);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const observedElements = observedElementsRef.current;
    observedElements.clear();
    scrollSpyObserverRef.current = observer;

    const observeSection = (id: string, retryCount = 0) => {
      const element = getSectionElement(id);
      if (element) {
        if (!observedElements.has(element)) {
          observer.observe(element);
          observedElements.add(element);
          logger.info('ScrollSpy', `Observing section: ${id}`);
        }
        return true;
      }

      // Retry if element not found yet (DOM might still be rendering)
      // ניסיון חוזר אם האלמנט עדיין לא נמצא (DOM עדיין יכול להיות בתהליך רינדור)
      if (retryCount < 20) {
        setTimeout(() => observeSection(id, retryCount + 1), 100);
        if (retryCount === 0) {
          logger.info('ScrollSpy', `Section not found yet: ${id}, will retry`);
        }
      } else {
        logger.warn('ScrollSpy', `Section not found after ${retryCount} retries: ${id}`);
      }
      return false;
    };

    // Observe all sections initially
    sectionIds.forEach((id) => {
      observeSection(id);
    });

    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        sectionIds.forEach(id => observeSection(id));
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Cleanup
    return () => {
      logger.info('ScrollSpy', 'Cleaning up observers');
      observer.disconnect();
      observedElements.clear();
      scrollSpyObserverRef.current = null;
      mutationObserver?.disconnect();
    };
  }, []);

  return (
    <ScreenWrapper style={styles.container}>
      {/* Floating Navigation Menu */}
      {/* Floating Navigation Menu - Shown only for authenticated users (who don't see the top bar) */}
      {isAuthenticated && !isGuestMode && <FloatingMenu onNavigate={handleNavigate} activeSection={activeSection} />}

      {/* Donation Modal */}
      <DonationModal
        visible={showDonationModal}
        onClose={() => setShowDonationModal(false)}
      />

      <ScrollContainer
        scrollRef={scrollViewRef}
        style={styles.scrollContainer}
        contentStyle={styles.content}
        onContentSizeChange={(w, h) => logger.info('LandingSite', 'Content size changed', { width: w, height: h })}
      >
        <HeroSection
          onDonate={() => setShowDonationModal(true)}
          onJoinLogin={handleGoToApp}
        />
        <StatsSection stats={stats} isLoadingStats={isLoadingStats} />
        <LazySection section={VisionSection} />
        <LazySection section={ProblemsSection} />
        <LazySection section={FeaturesSection} />
        <LazySection section={AboutSection} />
        <LazySection section={GallerySection} />
        <LazySection section={PartnersSection} />
        <LazySection section={InstagramSection} />
        <LazySection section={HowItWorksSection} />
        <LazySection section={WhoIsItForSection} onDonate={() => setShowDonationModal(true)} />
        <LazySection section={ValuesSection} />
        <LazySection section={CoreMottosSection} />
        <LazySection section={AdminHierarchySection} />
        <LazySection section={RoadmapSection} />
        <LazySection section={ContactSection} />
        <LazySection section={FAQSection} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} Karma Community — נבנה באהבה ובתמיכת הקהילה.</Text>
        </View>
      </ScrollContainer>
    </ScreenWrapper>
  );
};

