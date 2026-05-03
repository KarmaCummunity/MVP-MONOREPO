import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import { Platform, Text, View } from 'react-native';
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
import { findNearestScrollableParent, getSectionElement } from './utils';
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
  if (!IS_WEB || globalThis.window === undefined) {
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

function scrollLandingWebToTop(
  sectionId: string,
  setActiveSection: React.Dispatch<React.SetStateAction<string | null>>,
): void {
  const scrollContainer = document.querySelector('[data-scroll-container="true"]');
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveSection(sectionId);
    logger.info('LandingSiteScreen', 'Scrolled to top via container');
  } else {
    globalThis.window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function scrollLandingWebElementIntoSection(
  element: HTMLElement,
  sectionId: string,
  setActiveSection: React.Dispatch<React.SetStateAction<string | null>>,
): void {
  const scrollContainer = findNearestScrollableParent(element);
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top);
    const offset = 20;
    scrollContainer.scrollTo({
      top: scrollTop - offset,
      behavior: 'smooth',
    });
    setActiveSection(sectionId);
    logger.info('LandingSiteScreen', `Scrolled to section via container: ${sectionId}`);
  } else {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    setActiveSection(sectionId);
    logger.warn('LandingSiteScreen', 'Scroll container not found, using scrollIntoView fallback');
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

function extractStatNumber(stat: unknown): number {
  if (typeof stat === 'number') {
    return stat;
  }
  if (stat && typeof stat === 'object' && 'value' in stat) {
    const raw = (stat as { value?: unknown }).value;
    return typeof raw === 'number' ? raw : 0;
  }
  return 0;
}

function mapCommunityStatsToLandingStats(communityStats: Record<string, unknown>): LandingStats {
  return {
    siteVisits: extractStatNumber(communityStats.siteVisits) || 0,
    totalMoneyDonated: extractStatNumber(communityStats.totalMoneyDonated) || 0,
    totalUsers: extractStatNumber(communityStats.totalUsers) || 0,
    itemDonations: extractStatNumber(communityStats.itemDonations) || 0,
    completedRides: extractStatNumber(communityStats.completedRides) || 0,
    recurringDonationsAmount: extractStatNumber(communityStats.recurringDonationsAmount) || 0,
    uniqueDonors: extractStatNumber(communityStats.uniqueDonors) || 0,
    completedTasks:
      extractStatNumber(communityStats.completedTasks) ||
      extractStatNumber(communityStats.completed_tasks) ||
      0,
  };
}

function navigateLandingSectionOnWeb(
  sectionId: string,
  setActiveSection: React.Dispatch<React.SetStateAction<string | null>>,
): void {
  const scrollToSection = (retryCount = 0): void => {
    try {
      if (sectionId === 'top') {
        scrollLandingWebToTop(sectionId, setActiveSection);
        return;
      }

      const element = getSectionElement(sectionId);
      logger.info('LandingSiteScreen', `Found element for ${sectionId}:`, {
        found: !!element,
        elementId: element?.id ?? element?.dataset?.nativeid ?? null,
        retryCount,
      });

      if (element) {
        scrollLandingWebElementIntoSection(element, sectionId, setActiveSection);
      } else if (retryCount < 10) {
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
}

function tryScrollNativeLandingToTop(
  sectionId: string,
  scrollViewRef: React.RefObject<ScrollView | null>,
): boolean {
  if (sectionId !== 'top' || !scrollViewRef.current) {
    return false;
  }
  scrollViewRef.current.scrollTo?.({ y: 0, animated: true });
  logger.info('LandingSiteScreen', 'Scrolled to top via ScrollView ref');
  return true;
}

/** Scroll-spy + DOM observation; module scope keeps `LandingSiteScreen` cognitive complexity in budget. */
function registerLandingScrollSpy(
  setActiveSection: React.Dispatch<React.SetStateAction<string | null>>,
): () => void {
  const sectionIds = [
    'stats',
    'vision',
    'problems',
    'features',
    'about',
    'how',
    'who',
    'values',
    'core-mottos',
    'hierarchy',
    'roadmap',
    'contact',
    'faq',
  ];

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0,
  };

  const observerCallback = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      const targetElement = entry.target as HTMLElement;
      const identifier = targetElement.id || targetElement.dataset.nativeid || '';
      const sectionId = identifier.replace('section-', '');
      if (!sectionId) {
        return;
      }
      logger.info('ScrollSpy', `Section ${sectionId} is now in view`);
      setActiveSection(sectionId);
    });
  };

  const observer = new IntersectionObserver(observerCallback, observerOptions);
  const observedElements = new Set<HTMLElement>();

  const observeSection = (id: string, retryCount = 0): void => {
    const element = getSectionElement(id);
    if (element) {
      if (!observedElements.has(element)) {
        observer.observe(element);
        observedElements.add(element);
        logger.info('ScrollSpy', `Observing section: ${id}`);
      }
      return;
    }

    if (retryCount < 20) {
      setTimeout(() => observeSection(id, retryCount + 1), 100);
      if (retryCount === 0) {
        logger.info('ScrollSpy', `Section not found yet: ${id}, will retry`);
      }
      return;
    }

    logger.warn('ScrollSpy', `Section not found after ${retryCount} retries: ${id}`);
  };

  sectionIds.forEach((id) => {
    observeSection(id);
  });

  let mutationObserver: MutationObserver | null = null;
  if (typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(() => {
      sectionIds.forEach((id) => observeSection(id));
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    logger.info('ScrollSpy', 'Cleaning up observers');
    observer.disconnect();
    observedElements.clear();
    mutationObserver?.disconnect();
  };
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

  // Ensure top bar and bottom bar are visible when this screen is focused
  // This fixes the issue where bars disappear when navigating from TopBar's AboutButton
  useFocusEffect(
    useCallback(() => {
      logger.logScreenOpened('LandingSiteScreen');
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

    if (IS_WEB) {
      navigateLandingSectionOnWeb(sectionId, setActiveSection);
      return;
    }
    if (tryScrollNativeLandingToTop(sectionId, scrollViewRef)) {
      return;
    }
    logger.warn('LandingSiteScreen', 'Native scrolling not implemented for specific sections');
  };

  // Shared loadStats function - used by both initial load and auto-refresh
  // פונקציה משותפת לטעינת סטטיסטיקות - משמשת גם לטעינה ראשונית וגם לרענון אוטומטי
  const loadStats = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingStats(true);
      logger.info('LandingSite', 'Loading stats', { forceRefresh });
      const communityStats = await EnhancedStatsService.getCommunityStats({}, forceRefresh);
      // תמיכה בשני פורמטים: מספר ישיר או אובייקט עם שדה value (see mapCommunityStatsToLandingStats)
      const statsData = mapCommunityStatsToLandingStats(
        communityStats as Record<string, unknown>,
      );

      logger.info('LandingSite', 'Stats loaded', { statsData }, { periodic: true });
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


  // Scroll Spy - Track which section is currently in view (web)
  useEffect(() => {
    if (!IS_WEB) {
      return;
    }
    return registerLandingScrollSpy(setActiveSection);
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

