import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import type { StatDetails } from './StatDetailsModal';
import { useUser } from '../stores/userStore';
import { useEffect, useState } from 'react';
import { getGlobalStats, formatShortNumber, parseShortNumber, CommunityStats, EnhancedStatsService } from '../utils/statsService';
import { USE_BACKEND } from '../utils/dbConfig';
import { enhancedDB } from '../utils/enhancedDatabaseService';

export type CommunityStat = {
  key: string;
  icon: string; // emoji
  label: string;
  value: string;
  color?: string;
};

interface CommunityStatsGridProps {
  onSelect: (details: StatDetails) => void;
}

const makeDetails = (stat: CommunityStat): StatDetails => ({
  key: stat.key,
  title: stat.label,
  icon: stat.icon,
  value: stat.value,
  color: stat.color,
  description: (require('i18next') as any).t('home:statsDetails.description', { label: stat.label }),
  bullets: [
    (require('i18next') as any).t('home:statsDetails.bullets.trends'),
    (require('i18next') as any).t('home:statsDetails.bullets.byCities'),
    (require('i18next') as any).t('home:statsDetails.bullets.highlight'),
  ],
  breakdownByCity: [
    { label: (require('i18next') as any).t('home:cities.tlv'), value: 42 },
    { label: (require('i18next') as any).t('home:cities.jerusalem'), value: 35 },
    { label: (require('i18next') as any).t('home:cities.haifa'), value: 28 },
    { label: (require('i18next') as any).t('home:cities.beerSheva'), value: 19 },
    { label: (require('i18next') as any).t('home:cities.ashdod'), value: 16 },
  ],
  trend: [8, 12, 9, 15, 13, 17, 21, 18, 24, 22],
});

const CommunityStatsGrid: React.FC<CommunityStatsGridProps> = ({ onSelect }) => {
  const { t } = useTranslation(['home']);
  const { isRealAuth } = useUser();
  const [statsState, setStatsState] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const POLLING_INTERVAL = 60000; // 60 seconds - stats don't change frequently
    
    const loadStats = async (forceRefresh = false) => {
      if (!mounted) return;
      
      console.log(`[CommunityStatsGrid] Loading stats, forceRefresh: ${forceRefresh}`);
      setLoading(true);
      
      try {
        let stats: CommunityStats;
        
        if (USE_BACKEND && isRealAuth) {
          // Use enhanced backend service for real users
          console.log('[CommunityStatsGrid] Fetching from backend with forceRefresh:', forceRefresh);
          stats = await EnhancedStatsService.getCommunityStats({}, forceRefresh);
          console.log('[CommunityStatsGrid] Stats received from backend:', Object.keys(stats).length, 'keys');
        } else {
          // Use legacy local stats for guests or if backend unavailable
          console.log('[CommunityStatsGrid] Using local stats (no backend or not authenticated)');
          stats = await getGlobalStats();
        }
        
        if (mounted) {
          setStatsState(stats);
          console.log('[CommunityStatsGrid] Stats state updated');
        }
      } catch (error) {
        console.error('[CommunityStatsGrid] Failed to load community stats:', error);
        
        // Fallback to legacy stats
        const fallbackStats = await getGlobalStats();
        if (mounted) setStatsState(fallbackStats);
      }
      
      setLoading(false);
    };
    
    // Initial load
    loadStats();
    
    // Auto-refresh every 60 seconds (but use cache - don't force refresh)
    const intervalId = setInterval(() => {
      loadStats(false); // Normal refresh with cache
    }, POLLING_INTERVAL);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [isRealAuth]);
  const realStats: CommunityStat[] = statsState
    ? (() => {
        const cfg: Array<{ key: keyof CommunityStats | 'activeMembers'; icon: string; color: string; labelKey?: string }> = [
          { key: 'moneyDonations', icon: '💵', color: colors.legacyDarkGreen },
          { key: 'volunteerHours', icon: '⏰', color: colors.warning },
          { key: 'rides', icon: '🚗', color: colors.info },
          { key: 'events', icon: '🎉', color: colors.secondary },
          { key: 'activeMembers', icon: '👥', color: colors.info, labelKey: 'appActiveUsers' },
          // Extended 15+
          { key: 'foodKg', icon: '🍎', color: colors.success },
          { key: 'clothingKg', icon: '👕', color: colors.info },
          { key: 'bloodLiters', icon: '🩸', color: colors.error },
          { key: 'courses', icon: '📚', color: colors.success },
          { key: 'treesPlanted', icon: '🌳', color: colors.legacyDarkGreen },
          { key: 'animalsAdopted', icon: '🐕', color: colors.warning },
          { key: 'recyclingBags', icon: '♻️', color: colors.success },
          { key: 'culturalEvents', icon: '🎭', color: colors.info },
          { key: 'appDownloads', icon: '📲', color: colors.info },
          { key: 'activeVolunteers', icon: '🙋', color: colors.success },
          { key: 'kmCarpooled', icon: '🚗', color: colors.info },
          { key: 'fundsRaised', icon: '💰', color: colors.success },
          { key: 'mealsServed', icon: '🍽️', color: colors.secondary },
          { key: 'booksDonated', icon: '📚', color: colors.legacyMediumPurple },
        ];
        return cfg.map((c) => {
          const labelKey = c.labelKey || String(c.key);
          const valueNum = (statsState as any)[c.key] ?? 0;
          return {
            key: String(c.key),
            icon: c.icon,
            label: t(`home:stats.${labelKey}`),
            value: formatShortNumber(typeof valueNum === 'number' ? valueNum : 0),
            color: c.color,
          } as CommunityStat;
        });
      })()
    : [];

  // Demo-only extra categories (לא יתנגשו עם keys שכבר קיימים ב-realStats)
  const demoStats: CommunityStat[] = [
    { key: 'sportsGroups', icon: '⚽', label: t('home:stats.sportsGroups'), value: '23', color: colors.success },
    { key: 'musicLessons', icon: '🎵', label: t('home:stats.musicLessons'), value: '34', color: colors.info },
    { key: 'artWorkshops', icon: '🎨', label: t('home:stats.artWorkshops'), value: '45', color: colors.warning },
    { key: 'computerLessons', icon: '💻', label: t('home:stats.computerLessons'), value: '28', color: colors.info },
    { key: 'doctorVisits', icon: '🏥', label: t('home:stats.doctorVisits'), value: '45', color: colors.error },
  ].filter((d) => !new Set(realStats.map((r) => r.key)).has(d.key));

  const stats: CommunityStat[] = isRealAuth ? realStats : [...realStats, ...demoStats];

  return (
    <View style={styles.container}>
      {stats.map((s) => (
        <TouchableOpacity key={s.key} style={[styles.card, styles.shadow]} onPress={() => onSelect(makeDetails(s))}>
          <Text style={styles.icon}>{s.icon}</Text>
          <Text style={styles.value}>{s.value}</Text>
          <Text style={styles.label} numberOfLines={2}>{s.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
    ...(Platform.OS === 'web' ? { overflowY: 'visible' } : {}),
  },
  card: {
    width: '31%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 1600,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shadow: {
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' } : {
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 4,
    }),
  },
  icon: {
    fontSize: FontSizes.heading2,
    marginBottom: 4,
  },
  value: {
    fontSize: FontSizes.medium,
    fontWeight: '800',
    color: colors.legacyDarkBlue,
    marginBottom: 2,
  },
  label: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: 4,
  },
});

export default CommunityStatsGrid;


