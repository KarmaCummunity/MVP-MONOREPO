import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import HeaderComp from '../components/HeaderComp';
import DonationStatsFooter from '../components/DonationStatsFooter';
import { biDiTextAlign, isLandscape, scaleSize } from '../globals/responsive';
import { useTranslation } from 'react-i18next';
import { donationResources } from '../utils/donationResources';
import ScrollContainer from '../components/ScrollContainer';
import AddLinkComponent from '../components/AddLinkComponent';

export interface CategoryConfig {
  id: string;
  title?: string;
  subtitle?: string;
  icon: string;
  color: string;
  bgColor: string;
  description?: string;
}

interface Props {
  route?: { params?: { config?: CategoryConfig } };
  config?: CategoryConfig;
}

const CategoryScreen: React.FC<Props> = ({ route, config: propConfig }) => {
  const { t } = useTranslation(['donations','common']);
  const config: CategoryConfig = propConfig || route?.params?.config || {
    id: 'generic',
    icon: 'help-circle-outline',
    color: colors.info,
    bgColor: colors.infoLight,
  };
  const [mode, setMode] = useState(true);
  const [linkHealth, setLinkHealth] = useState<Record<string, boolean>>({});

  const title = config.title ?? t(`donations:categories.${config.id}.title`);
  const subtitle = config.subtitle ?? t(`donations:categories.${config.id}.subtitle`);
  const description = config.description ?? t(`donations:categories.${config.id}.description`);

  const handleToggleMode = () => setMode((prev) => !prev);
  const handleSelectMenuItem = (option: string) => {
    console.log('Category menu selected:', option);
  };

  const handleSearch = (
    query: string,
    filters?: string[],
    sorts?: string[],
    results?: any[]
  ) => {
    console.log('Category search:', {
      query,
      filters: filters ?? [],
      sorts: sorts ?? [],
      results: results ?? [],
    });
  };

  // Check links health in background
  React.useEffect(() => {
    const resources = donationResources[config.id] || [];
    if (resources.length === 0) return;

    let isCancelled = false;
    const controller = new AbortController();

    const checkUrl = async (url: string): Promise<boolean> => {
      try {
        const timeout = setTimeout(() => controller.abort(), 5000);
        // Some servers block HEAD; try HEAD then GET fallback
        const headResp = await fetch(url, { method: 'HEAD', signal: controller.signal } as any).catch(() => null);
        if (headResp && (headResp.ok || (headResp.status >= 200 && headResp.status < 400))) {
          clearTimeout(timeout);
          return true;
        }
        const getResp = await fetch(url, { method: 'GET', signal: controller.signal } as any).catch(() => null);
        clearTimeout(timeout);
        return !!(getResp && (getResp.ok || (getResp.status >= 200 && getResp.status < 400)));
      } catch {
        return false;
      }
    };

    (async () => {
      const results: Record<string, boolean> = {};
      for (const r of resources) {
        const ok = await checkUrl(r.url);
        results[r.url] = ok;
        if (isCancelled) return;
        setLinkHealth((prev) => ({ ...prev, [r.url]: ok }));
      }
    })();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [config.id]);

  return (
    <View style={styles.container}>
      <HeaderComp
        mode={mode}
        menuOptions={[`${t('donations:share')} ${title}`, t('common:settings'), t('common:report')]}
        onToggleMode={handleToggleMode}
        onSelectMenuItem={handleSelectMenuItem}
        placeholder={`${t('donations:searchWithin')} ${title}`}
        filterOptions={[t('donations:filter.nearMe'), t('donations:filter.popular'), t('donations:filter.new')]}
        sortOptions={[t('donations:sort.name'), t('donations:sort.date'), t('donations:sort.rating')]}
        searchData={[]}
        onSearch={handleSearch}
      />

      <ScrollContainer contentStyle={[
        styles.content,
        isLandscape() && { paddingHorizontal: LAYOUT_CONSTANTS.SPACING.XL },
      ]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: config.bgColor, borderColor: config.color }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {!!subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
          {!!description && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('donations:section.content')}</Text>
          <Text style={styles.sectionText}>
            {t('donations:section.contentBody', { title })}
          </Text>

          {!!donationResources[config.id] && donationResources[config.id].length > 0 && (
            <View style={styles.linksContainer}>
              {donationResources[config.id].map((res) => {
                const isHealthy = linkHealth[res.url];
                return (
                  <TouchableOpacity
                    key={`${config.id}-${res.url}`}
                    style={[styles.linkButton, !isHealthy === true ? styles.linkButtonDisabled : null, { borderColor: config.color }]}
                    activeOpacity={0.8}
                    onPress={async () => {
                      try {
                        const supported = await Linking.canOpenURL(res.url);
                        if (supported) await Linking.openURL(res.url);
                        else Alert.alert(t('common:error'), t('common:cannotOpenLink'));
                      } catch (e) {
                        Alert.alert(t('common:error'), t('common:cannotOpenLink'));
                      }
                    }}
                  >
                    <View style={styles.linkButtonHeader}>
                      <Text style={styles.linkButtonTitle}>{res.name}</Text>
                      <Text style={[styles.linkPill, { borderColor: config.color, color: config.color }]}>{t('common:web')}</Text>
                    </View>
                    {!!res.description && (
                      <Text style={styles.linkButtonDesc}>{res.description}</Text>
                    )}
                    {isHealthy === false && (
                      <Text style={styles.linkWarningText}>{t('common:cannotOpenLink')}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('donations:section.relatedStats')}</Text>
          <DonationStatsFooter
            stats={[
              { label: t('donations:stats.newPosts'), value: 12, icon: 'megaphone-outline' },
              { label: t('donations:stats.activeRequests'), value: 7, icon: 'help-circle-outline' },
              { label: t('donations:stats.activePartners'), value: 5, icon: 'people-outline' },
            ]}
          />
        </View>

        {/* Add Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>קישורים שימושיים</Text>
          <AddLinkComponent category={config.id} />
        </View>
      </ScrollContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    paddingBottom: LAYOUT_CONSTANTS.SPACING.XL * 3 + LAYOUT_CONSTANTS.SPACING.SM,
  },
  hero: {
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    borderWidth: 1,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  title: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
    textAlign: biDiTextAlign('right'),
  },
  subtitle: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
    textAlign: biDiTextAlign('right'),
  },
  description: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    lineHeight: Math.round(FontSizes.body * 1.4),
    textAlign: biDiTextAlign('right'),
  },
  section: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  sectionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: 'semibold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    lineHeight: Math.round(FontSizes.body * 1.3),
    textAlign: biDiTextAlign('right'),
  },
  linksContainer: {
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  linkButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
  },
  linkButtonDisabled: {
    opacity: 0.7,
  },
  linkButtonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  linkButtonTitle: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  linkButtonDesc: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  linkPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: FontSizes.caption,
  },
  linkWarningText: {
    marginTop: 6,
    fontSize: FontSizes.caption,
    color: colors.error,
  },
});

export default CategoryScreen;

