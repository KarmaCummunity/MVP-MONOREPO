/**
 * @file LandingSiteScreen
 * @description Main landing page screen - web marketing page for KarmaCommunity
 * @module Landing
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { logger } from '../../utils/loggerService';
import ScrollContainer from '../../components/ScrollContainer';
import ScreenWrapper from '../../components/ScreenWrapper';
import { EnhancedStatsService } from '../../src/services/stats.service';
import { apiService } from '../../src/api/api.service';
import { USE_BACKEND } from '../../utils/dbConfig';
import { useUser } from '../../stores/userStore';
import { useWebMode } from '../../stores/webModeStore';
import { navigationQueue } from '../../utils/navigationQueue';
import { checkNavigationGuards } from '../../utils/navigationGuards';
import { FloatingMenu, LazySection, HeroSection } from './components';
import { StatsSection } from './components/sections/StatsSection';
import { VisionSection } from './components/sections/VisionSection';
import { ProblemsSection } from './components/sections/ProblemsSection';
import { FeaturesSection } from './components/sections/FeaturesSection';
import { HowItWorksSection } from './components/sections/HowItWorksSection';
import { WhoIsItForSection } from './components/sections/WhoIsItForSection';
import { ValuesSection } from './components/sections/ValuesSection';
import { CoreMottosSection } from './components/sections/CoreMottosSection';
import { AdminHierarchySection } from './components/sections/AdminHierarchySection';
import { RoadmapSection } from './components/sections/RoadmapSection';
import { AboutSection } from './components/sections/AboutSection';
import { GallerySection } from './components/sections/GallerySection';
import { PartnersSection } from './components/sections/PartnersSection';
import { FAQSection } from './components/sections/FAQSection';
import { ContactSection } from './components/sections/ContactSection';
import { DonationModal } from './components/modals/DonationModal';
import { styles } from './styles';
import { getSectionElement } from './utils';
import { IS_WEB } from './constants';
import type { LandingStats } from './types';

const LandingSiteScreen: React.FC = () => {
  const { t } = useTranslation('landing');
  logger.debug('LandingSite', 'Component rendered', undefined, { periodic: true });

  const { setMode } = useWebMode();
  const navigation = useNavigation();
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
  const statsVersionRef = useRef<string>('');
  const [showDonationModal, setShowDonationModal] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollSpyObserverRef = useRef<IntersectionObserver | null>(null);
  const observedElementsRef = useRef<Set<HTMLElement>>(new Set());

  useFocusEffect(
    useCallback(() => {
      logger.debug('LandingSiteScreen', 'Screen focused, ensuring bars are visible');
      (navigation as unknown as { setParams: (p: { hideTopBar: boolean; hideBottomBar: boolean }) => void }).setParams({
        hideTopBar: false,
        hideBottomBar: false,
      });
    }, [navigation])
  );

  const handleGoToApp = async () => {
    logger.info('LandingSiteScreen', 'Navigate to app mode', { isAuthenticated, isGuestMode });
    setMode('app');

    const targetRoute = (isAuthenticated || isGuestMode) ? 'HomeStack' : 'LoginScreen';
    const guardContext = {
      isAuthenticated,
      isGuestMode,
      isAdmin,
      mode: 'app' as const,
    };

    const guardResult = await checkNavigationGuards(
      {
        type: 'reset',
        index: 0,
        routes: [{ name: targetRoute }],
      },
      guardContext
    );

    if (!guardResult.allowed) {
      if (guardResult.redirectTo) {
        await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
      }
      return;
    }

    await navigationQueue.reset(0, [{ name: targetRoute }], 2);
  };

  const handleNavigate = (sectionId: string) => {
    logger.info('LandingSiteScreen', `Navigate to section: ${sectionId}`, {
      isWeb: IS_WEB,
      hasScrollRef: !!scrollViewRef.current,
    });

    if (IS_WEB) {
      const scrollToSection = (retryCount = 0) => {
        try {
          if (sectionId === 'top') {
            const scrollContainer = document.querySelector('[data-scroll-container="true"]');
            if (scrollContainer) {
              scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
              setActiveSection(sectionId);
              logger.info('LandingSiteScreen', 'Scrolled to top via container');
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
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
            let parent = element.parentElement;
            let scrollContainer: HTMLElement | null = null;

            while (parent) {
              const style = window.getComputedStyle(parent);
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
    } else {
      if (sectionId === 'top' && scrollViewRef.current) {
        scrollViewRef.current.scrollTo?.({ y: 0, animated: true });
        logger.info('LandingSiteScreen', 'Scrolled to top via ScrollView ref');
      } else {
        logger.warn('LandingSiteScreen', 'Native scrolling not implemented for specific sections');
      }
    }
  };

  const loadStats = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingStats(true);
      logger.info('LandingSite', 'Loading stats', { forceRefresh });
      const communityStats = await EnhancedStatsService.getCommunityStats({}, forceRefresh);

      const getValue = (stat: number | { value?: number }): number => {
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
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (!USE_BACKEND) {
      logger.info('LandingSite', 'Backend not available, skipping smart polling');
      return;
    }

    logger.info('LandingSite', 'Setting up smart polling (checks every 30 seconds)');

    const checkForUpdates = async () => {
      try {
        const response = await apiService.getCommunityStatsVersion();
        if (response.success && response.version) {
          const newVersion = response.version;
          const currentVersion = statsVersionRef.current;

          if (currentVersion && newVersion !== currentVersion) {
            logger.info('LandingSite', 'Stats version changed, reloading...', {
              oldVersion: currentVersion,
              newVersion: newVersion,
            });
            await loadStats(true);
            statsVersionRef.current = newVersion;
          } else if (!currentVersion) {
            statsVersionRef.current = newVersion;
            logger.info('LandingSite', 'Initial stats version set', { version: newVersion });
          }
        }
      } catch (error) {
        logger.error('LandingSite', 'Failed to check stats version', { error });
      }
    };

    checkForUpdates();
    const pollInterval = setInterval(checkForUpdates, 30000);

    return () => {
      logger.info('LandingSite', 'Clearing smart polling interval');
      clearInterval(pollInterval);
    };
  }, [loadStats]);

  useEffect(() => {
    logger.info('LandingSite', 'useEffect triggered - Landing page mounted', { isWeb: IS_WEB, USE_BACKEND });

    const VISIT_TRACKED_KEY = 'kc_site_visit_tracked';

    const trackVisitAndLoadStats = async () => {
      const visitTracked = IS_WEB && typeof window !== 'undefined'
        ? sessionStorage.getItem(VISIT_TRACKED_KEY) === 'true'
        : false;

      if (visitTracked) {
        logger.info('LandingSite', 'Visit already tracked in this session, skipping');
        await loadStats(false);
        return;
      }

      if (IS_WEB && USE_BACKEND) {
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(VISIT_TRACKED_KEY, 'true');
          }

          logger.info('LandingSite', 'Tracking site visit...');
          const response = await apiService.trackSiteVisit();
          if (response.success) {
            logger.info('LandingSite', 'Site visit tracked successfully');
            await loadStats(true);
          } else {
            logger.warn('LandingSite', 'Site visit tracking failed', { error: response.error });
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem(VISIT_TRACKED_KEY);
            }
            await loadStats(false);
          }
        } catch (error) {
          logger.error('LandingSite', 'Failed to track site visit', { error });
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(VISIT_TRACKED_KEY);
          }
          await loadStats(false);
        }
      } else {
        logger.info('LandingSite', 'Skipping site visit tracking', { isWeb: IS_WEB, USE_BACKEND });
        await loadStats(false);
      }
    };

    trackVisitAndLoadStats();

    return () => {
      logger.info('LandingSite', 'Landing page unmounted');
    };
  }, [loadStats]);

  useEffect(() => {
    if (!IS_WEB) return;

    const sectionIds = ['stats', 'vision', 'problems', 'features', 'about', 'how', 'who', 'values', 'core-mottos', 'hierarchy', 'roadmap', 'contact', 'faq'];

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
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
      scrollSpyObserverRef.current = null;
      mutationObserver?.disconnect();
    };
  }, []);

  return (
    <ScreenWrapper style={styles.container}>
      {isAuthenticated && !isGuestMode && <FloatingMenu onNavigate={handleNavigate} activeSection={activeSection} />}

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
        <HeroSection onDonate={() => setShowDonationModal(true)} />
        <StatsSection stats={stats} isLoadingStats={isLoadingStats} onGoToApp={handleGoToApp} />
        <LazySection section={VisionSection} />
        <LazySection section={ProblemsSection} />
        <LazySection section={FeaturesSection} />
        <LazySection section={AboutSection} />
        <LazySection section={GallerySection} />
        <LazySection section={PartnersSection} />
        <LazySection section={HowItWorksSection} />
        <LazySection section={WhoIsItForSection} onDonate={() => setShowDonationModal(true)} />
        <LazySection section={ValuesSection} />
        <LazySection section={CoreMottosSection} />
        <LazySection section={AdminHierarchySection} />
        <LazySection section={RoadmapSection} />
        <LazySection section={ContactSection} />
        <LazySection section={FAQSection} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('legacy.footer', { year: new Date().getFullYear() })}</Text>
        </View>
      </ScrollContainer>
    </ScreenWrapper>
  );
};

export default LandingSiteScreen;
