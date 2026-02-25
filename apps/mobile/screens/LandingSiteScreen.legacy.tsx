// LandingSiteScreen.tsx
// Web-only marketing landing page for KarmaCommunity
import React, { useEffect, useState, useRef, useCallback, Suspense, lazy } from 'react';
import { Platform, View, Text, StyleSheet, Image, TouchableOpacity, Linking, Dimensions, ActivityIndicator, ScrollView, Animated, Modal, FlatList, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/loggerService';
import ScrollContainer from '../components/ScrollContainer';
import ScreenWrapper from '../components/ScreenWrapper';
import { EnhancedStatsService } from '../utils/statsService';
import { apiService } from '../utils/apiService';
import { USE_BACKEND } from '../utils/dbConfig';
import { useWebMode } from '../stores/webModeStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUser } from '../stores/userStore';
import { navigationQueue } from '../utils/navigationQueue';
import { checkNavigationGuards } from '../utils/navigationGuards';
import AdminHierarchyTree from '../components/AdminHierarchyTree';

interface LandingStats {
  siteVisits: number;
  totalMoneyDonated: number;
  totalUsers: number;
  itemDonations: number;
  completedRides: number;
  recurringDonationsAmount: number;
  uniqueDonors: number;
  completedTasks: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isTablet = SCREEN_WIDTH > 768;
const isMobileWeb = isWeb && SCREEN_WIDTH <= 768;

const getSectionElement = (sectionId: string): HTMLElement | null => {
  if (!isWeb || typeof document === 'undefined') {
    return null;
  }
  const domId = sectionId.startsWith('section-') ? sectionId : `section-${sectionId}`;
  return (
    document.getElementById(domId) ??
    (document.querySelector(`[data-nativeid="${domId}"]`) as HTMLElement | null)
  );
};

// Calculate responsive sizes for floating menu based on screen width
const getMenuSizes = () => {
  if (isMobileWeb) {
    // Mobile web - smaller menu
    const menuWidth = SCREEN_WIDTH * 0.12; // 12% of screen width for mobile
    return {
      fontSize: Math.max(9, menuWidth * 0.12), // Smaller font for mobile
      iconSize: Math.max(12, menuWidth * 0.15), // Smaller icons
      titleSize: Math.max(10, menuWidth * 0.13), // Smaller title
      padding: Math.max(6, menuWidth * 0.08), // Smaller padding
    };
  }
  // Desktop/Tablet - original sizes
  const menuWidth = SCREEN_WIDTH * 0.1; // 10% of screen width
  return {
    fontSize: Math.max(10, menuWidth * 0.065), // ~6.5% of menu width, min 10px
    iconSize: Math.max(14, menuWidth * 0.08), // ~8% of menu width, min 14px
    titleSize: Math.max(12, menuWidth * 0.075), // ~7.5% of menu width, min 12px
    padding: Math.max(8, menuWidth * 0.05), // ~5% of menu width, min 8px
  };
};

const Section: React.FC<{ id?: string; title: string; subtitle?: string; children?: React.ReactNode, style?: any }> = ({ id, title, subtitle, children, style }) => (
  <View
    style={[styles.section, style]}
    nativeID={id}
    {...(isWeb && id ? { id } : {})}
  >
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.titleDecorator} />
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    {children || null}
  </View>
);

const Feature: React.FC<{ emoji: string; title: string; text: string; greenAccent?: boolean }> = ({ emoji, title, text, greenAccent }) => (
  <View style={[styles.feature, greenAccent && { backgroundColor: colors.greenBright + '12', borderColor: colors.greenBright + '30' }]}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

// Floating Navigation Menu Component
const FloatingMenu: React.FC<{
  onNavigate: (section: string) => void;
  activeSection: string | null;
}> = ({ onNavigate, activeSection }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const menuSizes = getMenuSizes();

  const menuItems = [
    { id: 'stats', label: 'במספרים', icon: 'stats-chart-outline' },
    { id: 'vision', label: 'החזון', icon: 'bulb-outline' },
    { id: 'problems', label: 'הבעיות', icon: 'alert-circle-outline' },
    { id: 'features', label: 'תכונות', icon: 'apps-outline' },
    { id: 'about', label: 'אודות', icon: 'information-circle-outline' },
    { id: 'how', label: 'איך זה עובד', icon: 'help-circle-outline' },
    { id: 'who', label: 'למי זה מתאים', icon: 'people-outline' },
    { id: 'values', label: 'ערכים', icon: 'heart-outline' },
    { id: 'hierarchy', label: 'מבנה ניהול', icon: 'git-network-outline' },
    { id: 'roadmap', label: 'מפת דרכים', icon: 'map-outline' },
    { id: 'contact', label: 'יצירת קשר', icon: 'mail-outline' },
    { id: 'faq', label: 'שאלות נפוצות', icon: 'chatbubble-ellipses-outline' },
  ];

  if (isMinimized) {
    return (
      <View style={styles.floatingMenuMinimized}>
        <TouchableOpacity
          onPress={() => setIsMinimized(false)}
          style={styles.menuToggleButton}
        >
          <Ionicons name="menu-outline" size={menuSizes.iconSize * 1.2} color={colors.info} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {/* Overlay שקוף שסוגר את התפריט כאשר לוחצים עליו */}
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={() => setIsMinimized(true)}
      />
      {/* התפריט הפתוח */}
      <View style={styles.floatingMenu}>
        <TouchableOpacity
          onPress={() => setIsMinimized(true)}
          style={styles.menuHeader}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuTitle, { fontSize: menuSizes.titleSize }]}>תפריט ניווט</Text>
          <Ionicons name="chevron-forward-outline" size={menuSizes.iconSize * 0.9} color={colors.textSecondary} />
        </TouchableOpacity>
        <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                { paddingVertical: menuSizes.padding, paddingHorizontal: menuSizes.padding * 1.5 },
                activeSection === item.id && styles.menuItemActive,
              ]}
              onPress={() => {
                onNavigate(item.id);
                logger.info('FloatingMenu', `Navigate to ${item.id}`);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon as any}
                size={menuSizes.iconSize}
                color={activeSection === item.id ? colors.info : colors.textSecondary}
                style={styles.menuItemIcon}
              />
              <Text style={[
                styles.menuItemText,
                { fontSize: menuSizes.fontSize },
                activeSection === item.id && styles.menuItemTextActive,
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
  );
};

type LazySectionProps = {
  section: React.ComponentType<any>;
  [key: string]: any;
};

const LazySection: React.FC<LazySectionProps> = ({ section: SectionComponent, ...props }) => {
  // On web, load immediately to ensure DOM elements exist for navigation
  // ב-web, טעינה מיידית כדי להבטיח שאלמנטי DOM קיימים לניווט
  const [isVisible, setIsVisible] = useState(isWeb);
  const ref = useRef<View>(null);

  useEffect(() => {
    // On web, sections are loaded immediately, so no need for lazy loading
    // ב-web, הסעיפים נטענים מיד, אז אין צורך ב-lazy loading
    if (isWeb) {
      return;
    }

    // For native, use lazy loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '0px 0px 100px 0px', // Start loading when the section is 100px away from the viewport
      }
    );

    if (ref.current) {
      observer.observe(ref.current as any);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current as any);
      }
    };
  }, []);

  return (
    <View ref={ref} style={{ minHeight: 200 }}>
      {isVisible ? (
        <SectionComponent {...props} />
      ) : <ActivityIndicator size="large" color={colors.info} style={{ marginVertical: 50 }} />}
    </View>
  );
};


const HeroSection: React.FC<{ onDonate: () => void }> = ({ onDonate }) => {
  const heroAnimation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(heroAnimation, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [heroAnimation]);

  return (
    <View style={styles.hero}>
      <View style={styles.heroGradient}>
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />
        <View style={styles.decoCircle3} />
        <Animated.View style={[
          styles.heroContent,
          {
            opacity: heroAnimation,
            transform: [{
              translateY: heroAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }]
          }
        ]}>

          <Text style={styles.welcomeTitle}>
            <Text style={styles.welcomeTitleLarge}>המקום </Text>
            <Text style={styles.welcomeTitleSmall}> בו  </Text>
            <Text style={styles.welcomeTitleLarge}>הטוב </Text>
            <Text style={styles.welcomeTitleSmall}> קורה </Text>
          </Text>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image source={require('../assets/images/new_logo_black.png')} style={styles.logo} resizeMode="contain" />
            </View>
          </View>
          <Text style={styles.title}>Karma Community</Text>
          <View style={styles.subtitlesRow}>
            <View style={styles.subtitleItem}>
              <Ionicons name="people-circle-outline" size={isMobileWeb ? 18 : 24} color={colors.info} style={styles.subtitleIcon} />
              <Text style={styles.subtitleText}>אחדות</Text>
            </View>
            <View style={[styles.subtitleItem, styles.subtitleItemGreen]}>
              <Ionicons name="eye-outline" size={isMobileWeb ? 18 : 24} color={colors.greenBright} style={styles.subtitleIcon} />
              <Text style={styles.subtitleText}>שקיפות</Text>
            </View>
            <View style={styles.subtitleItem}>
              <Ionicons name="checkmark-circle-outline" size={isMobileWeb ? 18 : 24} color={colors.info} style={styles.subtitleIcon} />
              <Text style={styles.subtitleText}>סדר</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>רשת חברתית שמחברת בין אנשים שצריכים עזרה, לאנשים שרוצים לעזור. פשוט, שקוף ומהלב.</Text>


          <View style={styles.ctaRow}>
            <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.success }]} onPress={() => { logger.info('LandingSite', 'Click - whatsapp direct'); Linking.openURL('https://wa.me/972528616878'); }}>
              <Ionicons name="logo-whatsapp" color={colors.white} size={isMobileWeb ? 14 : 18} /><Text style={styles.contactButtonText}>שלחו לי ווטסאפ </Text>
            </TouchableOpacity>
          </View>
          {/* Donation Button */}
          <TouchableOpacity
            style={[styles.donationCtaButton, { backgroundColor: colors.greenBright }]}
            onPress={onDonate}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={isMobileWeb ? 18 : 24} color={colors.white} />
            <Text style={styles.donationCtaButtonText}>תרמו לנו</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const VisionSection: React.FC<{ onGoToApp: () => void }> = ({ onGoToApp }) => (
  <Section id="section-vision" title="החזון שלנו" subtitle="הקיבוץ הקפיטליסטי" style={styles.sectionAltBackground}>
    <Text style={styles.paragraph}>
      <Text style={styles.emphasis}>קיבוץ דגיטלי בעולם קפיטליסטי. </Text>רשת חברתית לאיחוד, ריכוז, הנגשה, והפצת פילנתרופיה ועשייה חברתית מכל הסוגים ולכל האנשים.
      {"\n\n"}
      <Text style={styles.emphasis}>כרגע אנחנו בתהליך הקמה.</Text> כל מה שרשום בהמשך הוא חלק מהחזון שאנחנו רוצים לבנות, וכרגע אנחנו מזמינים אתכם לעזור לנו לבנות את זה.
    </Text>
    <Text style={styles.paragraph}>
      אנחנו מזמינים אתכם להצטרף אלינו לשנות את העולם וליצור שינוי חברתי אמיתי. להיות חלק ממשהו גדול, מוסרי ברמה הכי גבוהה, טכנולוגי, חברתי ועוד מלא דברים טובים.
    </Text>
    <View style={styles.mottoContainer}>
      <View style={styles.mottoCard}>
        <Ionicons name="swap-horizontal-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.mottoIcon} />
        <Text style={styles.mottoText}>"לתת זה גם לקבל"</Text>
      </View>
      <View style={[styles.mottoCard, { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '40' }]}>
        <Ionicons name="gift-outline" size={isMobileWeb ? 24 : 32} color={colors.greenBright} style={styles.mottoIcon} />
        <Text style={styles.mottoText}>"לכל אחד יש משהו שהוא צריך ומשהו שהוא ישמח לתת"</Text>
      </View>
    </View>
    <Text style={styles.paragraph}>
      KarmaCommunity היא יותר מרשת חברתית - היא תנועה שמחברת בין אנשים שרוצים לעשות טוב, ללא אינטרסים מסחריים, ללא פרסומות, רק אנושיות וקהילתיות אמיתית.
    </Text>
    <View style={styles.visionHighlights}>
      <View style={styles.visionHighlight}>
        <Ionicons name="heart" size={isMobileWeb ? 20 : 28} color={colors.secondary} />
        <Text style={styles.visionHighlightText}>מוסרי ברמה הגבוהה ביותר</Text>
      </View>
      <View style={styles.visionHighlight}>
        <Ionicons name="code-working" size={isMobileWeb ? 20 : 28} color={colors.info} />
        <Text style={styles.visionHighlightText}>טכנולוגי וחדשני</Text>
      </View>
      <View style={styles.visionHighlight}>
        <Ionicons name="people" size={isMobileWeb ? 20 : 28} color={colors.accent} />
        <Text style={styles.visionHighlightText}>חברתי ומחבר</Text>
      </View>
      <View style={styles.visionHighlight}>
        <Ionicons name="globe" size={isMobileWeb ? 20 : 28} color={colors.greenBright} />
        <Text style={styles.visionHighlightText}>שינוי עולמי אמיתי</Text>
      </View>
    </View>

    {/* CTA Button - Join Us */}
    {/* <View style={styles.ctaRow}>
      <TouchableOpacity
        style={styles.primaryCta}
        onPress={onGoToApp}
        activeOpacity={0.8}
      >
        <Ionicons name="people-outline" size={isMobileWeb ? 16 : 22} color={colors.white} style={styles.ctaIcon} />
        <Text style={styles.primaryCtaText}>הצטרפו אלינו</Text>
      </TouchableOpacity>
    </View> */}
  </Section>
);

// Stats Detail Modal Component
const StatsDetailModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  statType: string;
  statTitle: string;
  statValue: number;
  iconName: string;
  iconColor: string;
}> = ({ visible, onClose, statType, statTitle, statValue, iconName, iconColor }) => {
  const [detailData, setDetailData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDetailData = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.info('StatsDetailModal', `Loading detail data for ${statType}`);
      const response = await apiService.getStatDetails(statType);
      if (response.success && response.data) {
        setDetailData(response.data);
        logger.info('StatsDetailModal', `Loaded ${response.data.length} items for ${statType}`);
      }
    } catch (error) {
      logger.error('StatsDetailModal', 'Failed to load detail data', { error, statType });
    } finally {
      setIsLoading(false);
    }
  }, [statType]);

  useEffect(() => {
    if (visible && USE_BACKEND) {
      loadDetailData();
    }
  }, [visible, loadDetailData]);

  const renderDetailItem = ({ item, index }: { item: any; index: number }) => {
    // Different rendering based on stat type
    switch (statType) {
      case 'siteVisits':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {new Date(item.timestamp || item.created_at).toLocaleString('he-IL')}
              </Text>
              {item.user_agent && (
                <Text style={styles.detailItemSubtext}>{item.user_agent.substring(0, 50)}...</Text>
              )}
            </View>
          </View>
        );

      case 'totalUsers':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {item.name || item.email || 'משתמש'}
              </Text>
              <Text style={styles.detailItemSubtext}>
                הצטרף: {new Date(item.join_date || item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.city && <Text style={styles.detailItemSubtext}>עיר: {item.city}</Text>}
            </View>
          </View>
        );

      case 'totalMoneyDonated':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {item.donor_name || 'תורם אנונימי'} • {item.amount?.toLocaleString('he-IL')} ₪
              </Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(item.donation_date || item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.category_name && (
                <Text style={styles.detailItemSubtext}>קטגוריה: {item.category_name}</Text>
              )}
            </View>
          </View>
        );

      case 'itemDonations':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {item.title || item.item_name || 'פריט'}
              </Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.donor_name && (
                <Text style={styles.detailItemSubtext}>תורם: {item.donor_name}</Text>
              )}
            </View>
          </View>
        );

      case 'completedRides':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {item.from_city || 'מוצא'} → {item.to_city || 'יעד'}
              </Text>
              <Text style={styles.detailItemSubtext}>
                {new Date(item.ride_date || item.created_at).toLocaleDateString('he-IL')}
              </Text>
              {item.driver_name && (
                <Text style={styles.detailItemSubtext}>נהג: {item.driver_name}</Text>
              )}
            </View>
          </View>
        );

      case 'uniqueDonors':
      case 'recurringDonationsAmount':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {item.donor_name || 'תורם'}
                {item.amount && ` • ${item.amount.toLocaleString('he-IL')} ₪`}
              </Text>
              {item.frequency && (
                <Text style={styles.detailItemSubtext}>תדירות: {item.frequency}</Text>
              )}
              {item.start_date && (
                <Text style={styles.detailItemSubtext}>
                  החל מ: {new Date(item.start_date).toLocaleDateString('he-IL')}
                </Text>
              )}
            </View>
          </View>
        );

      case 'completedTasks':
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>
                {item.title || 'משימה'}
              </Text>
              {item.category && (
                <Text style={styles.detailItemSubtext}>קטגוריה: {item.category}</Text>
              )}
              {item.updated_at && (
                <Text style={styles.detailItemSubtext}>
                  הושלמה: {new Date(item.updated_at).toLocaleDateString('he-IL')}
                </Text>
              )}
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.detailItem}>
            <Text style={styles.detailItemNumber}>{index + 1}.</Text>
            <View style={styles.detailItemContent}>
              <Text style={styles.detailItemText}>{JSON.stringify(item)}</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name={iconName as any} size={isMobileWeb ? 28 : 36} color={iconColor} />
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{statTitle}</Text>
                <Text style={styles.modalSubtitle}>
                  {statValue.toLocaleString('he-IL')} {statType === 'totalMoneyDonated' || statType === 'recurringDonationsAmount' ? '₪' : 'פריטים'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={isMobileWeb ? 24 : 32} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {isLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.info} />
                <Text style={styles.modalLoadingText}>טוען פרטים...</Text>
              </View>
            ) : detailData.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="information-circle-outline" size={isMobileWeb ? 48 : 64} color={colors.textSecondary} />
                <Text style={styles.modalEmptyText}>אין נתונים להצגה</Text>
              </View>
            ) : (
              <FlatList
                data={detailData}
                renderItem={renderDetailItem}
                keyExtractor={(item, index) => `${statType}-${index}`}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.detailList}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Donation Modal Component
const DonationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const handleWhatsApp = () => {
    logger.info('DonationModal', 'Click - whatsapp');
    Linking.openURL('https://wa.me/972528616878');
  };


  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.donationModalContainer}>
          <View style={styles.donationModalHeader}>
            <View style={styles.donationModalTitleRow}>
              <Ionicons name="heart" size={isMobileWeb ? 32 : 40} color={colors.secondary} />
              <View style={styles.donationModalTitleContainer}>
                <Text style={styles.donationModalTitle}>תרמו לנו</Text>
                <Text style={styles.donationModalSubtitle}>כל תרומה עוזרת לנו לגדול</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={isMobileWeb ? 24 : 32} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.donationModalContent}>
            <View style={styles.donationMessageContainer}>
              <Ionicons name="information-circle" size={isMobileWeb ? 24 : 32} color={colors.info} />
              <Text style={styles.donationMessageText}>
                מוזמנים להעביר למספר 0528616878 לנוה המייסד בביט/פייבוקס
              </Text>
            </View>

            <View style={styles.donationButtonsContainer}>
              <TouchableOpacity
                style={[styles.donationButton, styles.donationButtonWhatsApp]}
                onPress={handleWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={isMobileWeb ? 20 : 28} color={colors.white} />
                <Text style={styles.donationButtonText}>ווטסאפ</Text>
              </TouchableOpacity>

            </View>

            <Text style={styles.donationNoteText}>
              תודה על התמיכה שלכם! כל תרומה עוזרת לנו להמשיך ולפתח את הקהילה.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const StatsSection: React.FC<{ stats: LandingStats; isLoadingStats: boolean; onGoToApp: () => void }> = ({ stats, isLoadingStats, onGoToApp }) => {
  const [selectedStat, setSelectedStat] = useState<{
    type: string;
    title: string;
    value: number;
    icon: string;
    color: string;
  } | null>(null);

  const handleStatPress = (type: string, title: string, value: number, icon: string, color: string) => {
    logger.info('StatsSection', `Stat card pressed: ${type}`);
    setSelectedStat({ type, title, value, icon, color });
  };

  return (
    <Section id="section-stats" title="הכוח של הקהילה שלנו" subtitle="השפעה אמיתית, במספרים">
      {selectedStat && (
        <StatsDetailModal
          visible={!!selectedStat}
          onClose={() => setSelectedStat(null)}
          statType={selectedStat.type}
          statTitle={selectedStat.title}
          statValue={selectedStat.value}
          iconName={selectedStat.icon}
          iconColor={selectedStat.color}
        />
      )}

      {isLoadingStats ? (
        <View style={styles.statsLoadingContainer}>
          <ActivityIndicator size="large" color={colors.info} />
          <Text style={styles.statsLoadingText}>טוען נתונים...</Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('siteVisits', 'ביקורים באתר', stats.siteVisits, 'eye-outline', colors.info)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.siteVisits.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>ביקורים באתר</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('totalMoneyDonated', 'תרומות כספיות', stats.totalMoneyDonated, 'cash-outline', colors.success)}
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={isMobileWeb ? 24 : 32} color={colors.success} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.totalMoneyDonated.toLocaleString('he-IL')} ₪</Text>
            <Text style={styles.statLabel}>ש"ח שנתרמו ישירות</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('totalUsers', 'חברי קהילה רשומים', stats.totalUsers, 'heart-outline', colors.secondary)}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={isMobileWeb ? 24 : 32} color={colors.secondary} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.totalUsers.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>חברי קהילה רשומים</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('itemDonations', 'פריטים שפורסמו', stats.itemDonations, 'cube-outline', colors.accent)}
            activeOpacity={0.7}
          >
            <Ionicons name="cube-outline" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.itemDonations.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>פריטים שפורסמו</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '40' }]}
            onPress={() => handleStatPress('completedRides', 'נסיעות קהילתיות', stats.completedRides, 'car-outline', colors.greenBright)}
            activeOpacity={0.7}
          >
            <Ionicons name="car-outline" size={isMobileWeb ? 24 : 32} color={colors.greenBright} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.completedRides.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>נסיעות קהילתיות</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('recurringDonationsAmount', 'תרומות קבועות', stats.recurringDonationsAmount, 'repeat-outline', colors.success)}
            activeOpacity={0.7}
          >
            <Ionicons name="repeat-outline" size={isMobileWeb ? 24 : 32} color={colors.success} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.recurringDonationsAmount.toLocaleString('he-IL')} ₪</Text>
            <Text style={styles.statLabel}>תרומות קבועות פעילות</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('uniqueDonors', 'תורמים פעילים', stats.uniqueDonors, 'people-outline', colors.info)}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.uniqueDonors.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>תורמים פעילים</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}
            onPress={() => handleStatPress('completedTasks', 'משימות שבוצעו', stats.completedTasks, 'checkmark-done-outline', colors.success)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done-outline" size={isMobileWeb ? 24 : 32} color={colors.success} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.completedTasks.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>משימות שבוצעו</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>
        </View>
      )}

      {/* CTA Button - Go to App */}
      {/* <View style={styles.ctaRow}>
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={onGoToApp}
          activeOpacity={0.8}
        >
          <Ionicons name="phone-portrait-outline" size={isMobileWeb ? 16 : 22} color={colors.white} style={styles.ctaIcon} />
          <Text style={styles.primaryCtaText}>עבור לאפליקציה</Text>
        </TouchableOpacity>
      </View> */}
    </Section>
  );
};

const ProblemsSection = () => (
  <Section id="section-problems" title="הבעיות שאנחנו באים לפתור" subtitle="למה צריך בכלל את KC?">
    <View style={styles.problemsContent}>
      <View style={styles.problemCard}>
        <Ionicons name="copy-outline" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.problemIcon} />
        <Text style={styles.problemTitle}>כפילות, פיזור וחוסר אמינות</Text>
        <Text style={styles.problemText}>
          היום יש כל כך הרבה פלטפורמות, קבוצות וואטסאפ, ועמותות שמנסות לעזור. כל אחד עובד לבד, יש כפילויות, חוסר תיאום, וקשה לדעת על מי אפשר לסמוך.
          Karma Community מאחדת את כל זה למקום אחד, שקוף ואמין.
        </Text>
      </View>

      <View style={styles.problemCard}>
        <Ionicons name="people-circle-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.problemIcon} />
        <Text style={styles.problemTitle}>הדיסוננס בין קהילה לחופשיות</Text>
        <Text style={styles.problemText}>
          כבר שנים שיש לאדם את הדיסוננס בין הרצון לקהילה והרצון לחופשיות. הרי כל קהילה עם הגבלות ומוסכמות משלה.
          {'\n\n'}
          Karma Community באה להציע פלטפורמה, מין רשת חברתית, אשר מצד אחד שמה דגש על ביחד ומצד שני דגש על חופש וליברליות.
        </Text>
      </View>

      <View style={styles.problemCard}>
        <Ionicons name="ban-outline" size={isMobileWeb ? 24 : 32} color={colors.secondary} style={styles.problemIcon} />
        <Text style={styles.problemTitle}>רשתות חברתיות מונעות מאינטרסים</Text>
        <Text style={styles.problemText}>
          דווקא בעידן של רשתות חברתיות המונעות מאינטרסים של כסף ופרסומות, אנחנו רואים את הפוטנציאל והצורך האמיתי שיש לנו כבני אדם ב"רשתות" האלה.
          {'\n\n'}
          Karma Community באה להציע רשת חברתית ללא פרסומות וללא תוכן חומרי/פוגעני. פלטפורמה המקדשת קהילתיות ושיתוף.
        </Text>
      </View>
    </View>
  </Section>
);

const FeaturesSection = () => (
  <Section id="section-features" title="כל מה שצריך כדי לעשות טוב" subtitle="כלים פשוטים שהופכים עזרה הדדית לחלק מהיום-יום" style={styles.sectionAltBackground}>
    <View style={styles.featuresGrid}>
      <Feature emoji="🤝" title="צריכים עזרה? רוצים לעזור?" text="פרסמו בקלות בקשה או הצעה, וקבלו מענה מהקהילה סביבכם. משיעורי עזר ועד תיקונים קטנים בבית." />
      <Feature emoji="💬" title="התחברו לאנשים כמוכם" text="מצאו קבוצות עניין, הצטרפו לדיונים, וצרו קשרים חדשים עם אנשים שאכפת להם." />
      <Feature emoji="📍" title="גלו הזדמנויות סביבכם" text="המפה החכמה שלנו תראה לכם איפה צריכים אתכם, ממש ליד הבית." greenAccent />
      <Feature emoji="🔒" title="פלטפורמה בטוחה ושקופה" text="בלי פרסומות, בלי תוכן פוגעני, רק קהילתיות אמיתית ואמון הדדי." />
    </View>
  </Section>
);

const HowItWorksSection = () => (
  <Section id="section-how" title="איך זה עובד?" subtitle="תהליך פשוט וברור שמחבר בין אנשים">
    <Text style={styles.paragraph}>
      קהילת קארמה בנויה על עקרון פשוט: כל אחד יכול לתת וכל אחד יכול לקבל. התהליך שלנו נועד להיות פשוט, שקוף וידידותי.
    </Text>
    <View style={styles.stepsRow}>
      <View style={styles.stepCard}>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <Ionicons name="person-add-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>הצטרפו לקהילה</Text>
        <Text style={styles.stepText}>
          הירשמו בכמה שניות - רק פרטים בסיסיים. ספרו לנו מה מעניין אתכם, איפה אתם, ומה אתם יכולים להציע או מה אתם צריכים. אין צורך במידע מיותר, רק מה שחשוב.
        </Text>
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
        <Ionicons name="create-outline" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>פרסמו או חפשו</Text>
        <Text style={styles.stepText}>
          צריכים עזרה? פרסמו בקשה ברורה עם מה אתם צריכים, מתי ואיפה. רוצים לעזור? פרסמו הצעה עם מה אתם יכולים לתת. או פשוט דפדפו בפיד וראו מה קורה סביבכם.
        </Text>
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumber}>3</Text>
        </View>
        <Ionicons name="search-outline" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>גלו הזדמנויות</Text>
        <Text style={styles.stepText}>
          המפה החכמה שלנו תראה לכם איפה צריכים אתכם, ממש ליד הבית. הפיד האישי שלכם יציג לכם בקשות והצעות רלוונטיות לפי המיקום והעניין שלכם.
        </Text>
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumber}>4</Text>
        </View>
        <Ionicons name="chatbubble-ellipses-outline" size={isMobileWeb ? 24 : 32} color={colors.secondary} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>צרו קשר</Text>
        <Text style={styles.stepText}>
          ראיתם משהו שמעניין אתכם? שלחו הודעה ישירה, תאמו פרטים, הכירו את האדם שמאחורי הבקשה או ההצעה. הכל שקוף, בטוח ופשוט.
        </Text>
      </View>
      <View style={[styles.stepCard, { backgroundColor: colors.greenBright + '12', borderColor: colors.greenBright + '40' }]}>
        <View style={[styles.stepNumberBadge, { backgroundColor: colors.greenBright }]}>
          <Text style={styles.stepNumber}>5</Text>
        </View>
        <Ionicons name="heart-outline" size={isMobileWeb ? 24 : 32} color={colors.greenBright} style={styles.stepIcon} />
        <Text style={styles.stepTitle}>עשו טוב והרגישו את ההבדל</Text>
        <Text style={styles.stepText}>
          תאמו, פגשו, עזרו או קבלו עזרה. כל פעולה כזו יוצרת קשר אנושי אמיתי ומחזקת את הקהילה. אתם תראו את ההשפעה שלכם, והקהילה תראה את התרומה שלכם.
        </Text>
      </View>
    </View>
    <View style={styles.howItWorksNote}>
      <Ionicons name="information-circle-outline" size={isMobileWeb ? 18 : 24} color={colors.info} />
      <Text style={styles.howItWorksNoteText}>
        הכל בחינם, הכל שקוף, הכל למען הקהילה. אין בירוקרטיה, אין עמלות, רק אנשים שעוזרים לאנשים.
      </Text>
    </View>
  </Section>
);

const WhoIsItForSection: React.FC<{ onDonate: () => void }> = ({ onDonate }) => (
  <Section id="section-who" title="למי זה מתאים?" subtitle="לכולם. באמת." style={styles.sectionAltBackground}>
    <Text style={styles.paragraph}>
      <Text style={styles.emphasis}>קהילת קארמה מיועדת לכולם.</Text> עשירים ועניים, מרכז ופריפריה, לא משנה דת, גזע, מין, לאום ואפילו לא מיקום פיזי. כל אחד יכול לתת וכל אחד יכול לקבל.
    </Text>
    <View style={styles.whoContent}>
      <View style={styles.whoMainCard}>
        <Ionicons name="people-outline" size={isMobileWeb ? 32 : 48} color={colors.info} style={styles.whoMainIcon} />
        <Text style={styles.splitTitle}>לאנשים פרטיים</Text>
        <Text style={styles.paragraph}>
          בשלבים הראשונים, KarmaCommunity מתמקדת באנשים פרטיים - שכנים, חברים, וכל מי שרוצה לתת מהזמן, הידע או החפצים שלו כדי לעזור לאחרים.
        </Text>
        <View style={styles.iconBullets}>
          <View style={styles.iconBulletRow}><Ionicons name="gift-outline" size={isMobileWeb ? 14 : 18} color={colors.secondary} /><Text style={styles.iconBulletText}>שיתוף חפצים, מזון וציוד</Text></View>
          <View style={styles.iconBulletRow}><Ionicons name="time-outline" size={isMobileWeb ? 14 : 18} color={colors.accent} /><Text style={styles.iconBulletText}>התנדבות וסיוע נקודתי</Text></View>
          <View style={styles.iconBulletRow}><Ionicons name="school-outline" size={isMobileWeb ? 14 : 18} color={colors.info} /><Text style={styles.iconBulletText}>שיתוף ידע ושיעורי עזר</Text></View>
          <View style={styles.iconBulletRow}><Ionicons name="heart-outline" size={isMobileWeb ? 14 : 18} color={colors.greenBright} /><Text style={styles.iconBulletText}>יצירת קשרים אנושיים אמיתיים</Text></View>
          <View style={styles.iconBulletRow}><Ionicons name="people-outline" size={isMobileWeb ? 14 : 18} color={colors.success} /><Text style={styles.iconBulletText}>כמובן כולם מוזמנים להתנדב ולתרום גם לקהילה עצמה ולהיות חלק מהמייסדים</Text></View>
        </View>

        {/* Donation Button */}
        <TouchableOpacity
          style={styles.donationCtaButton}
          onPress={onDonate}
          activeOpacity={0.8}
        >
          <Ionicons name="heart" size={isMobileWeb ? 18 : 24} color={colors.white} />
          <Text style={styles.donationCtaButtonText}>תרמו לנו</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.whoFutureCard}>
        <Ionicons name="business-outline" size={isMobileWeb ? 24 : 32} color={colors.textSecondary} style={styles.whoFutureIcon} />
        <Text style={styles.whoFutureTitle}>עמותות וארגונים - בהמשך</Text>
        <Text style={styles.whoFutureText}>
          בשלבים הבאים נחבר גם עמותות וארגונים עם כלים ייעודיים לניהול מתנדבים, תרומות ופניות. דגש חשוב - זה יקרה רק אחרי שנבסס קהילה חזקה של אנשים פרטיים.
        </Text>
      </View>
    </View>
  </Section>
);

const ValuesSection = () => {
  const valuePills = [
    'שקיפות מלאה',
    'אמון ובטיחות',
    'קהילתיות פעילה',
    'אחריות משותפת',
    'גישה מכל מקום',
    'מדידה ולמידה',
  ];
  const commitments = [
    { icon: 'shield-checkmark-outline', text: 'אימות משתמשים וארגונים לפני עלייה לאוויר', color: colors.success },
    { icon: 'sparkles-outline', text: 'חוויית שימוש נוחה ונקייה מהסחות דעת', color: colors.secondary },
    { icon: 'leaf-outline', text: 'התפתחות ברת קיימא – בלי פרסומות ובלי דאטה מיותר', color: colors.greenBright },
  ];

  return (
    <Section id="section-values" title="הערכים שמנחים אותנו" subtitle="מה הופך את Karma Community לקהילה בטוחה ואמינה" style={styles.sectionAltBackground}>
      <Text style={styles.paragraph}>
        אנו מובילים שינוי באמצעות מערכת שמעמידה את האדם במרכז. כל פיצ׳ר נבחן לפי תרומתו לשקיפות, לחיבורים אנושיים וליכולת למדוד השפעה אמיתית.
      </Text>
      <View style={styles.valuesRow}>
        {valuePills.map((value) => (
          <View key={value} style={styles.valuePill}>
            <Text style={styles.valuePillText}>{value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.trustList}>
        {commitments.map((item) => (
          <View key={item.text} style={styles.trustRow}>
            <Ionicons name={item.icon as any} size={isMobileWeb ? 14 : 18} color={item.color} />
            <Text style={styles.trustText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
};

const CoreMottosSection = () => (
  <Section id="section-core-mottos" title="העקרונות המנחים שלנו" subtitle="מה שמניע אותנו קדימה">
    <View style={styles.coreMottosContainer}>
      <View style={styles.coreMottoItem}>
        <Ionicons name="sparkles" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.coreMottoIcon} />
        <Text style={styles.coreMottoText}>השאריות של האחד יכול להיות האוצר של מישהו אחר</Text>
      </View>

      <View style={[styles.coreMottoItem, { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '50' }]}>
        <Ionicons name="heart-circle" size={isMobileWeb ? 24 : 32} color={colors.greenBright} style={styles.coreMottoIcon} />
        <Text style={styles.coreMottoText}>לכל אחד מאיתנו יש משהו לתת וגם משהו שהוא היה שמח לקבל</Text>
      </View>

      <View style={styles.coreMottoItem}>
        <Ionicons name="swap-horizontal" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.coreMottoIcon} />
        <Text style={styles.coreMottoText}>לתת זה גם לקבל</Text>
      </View>
    </View>
  </Section>
);

// Admin Hierarchy Section - Visual tree of the management structure
const AdminHierarchySection = () => {
  const navigation = useNavigation<any>();
  const { isAuthenticated, isGuestMode } = useUser();

  const handleViewAdminDashboard = () => {
    // Allow everyone to view, including unauthenticated users
    navigation.navigate('AdminDashboard', { viewOnly: true, hideTopBar: false, hideBottomBar: false });
  };

  return (
    <Section id="section-hierarchy" title="מבנה הניהול" subtitle="הצוות שמוביל את הקהילה" style={styles.sectionAltBackground}>
      <View style={styles.hierarchyContainer}>
        <AdminHierarchyTree />
      </View>
      <TouchableOpacity
        style={[styles.contactButton, { backgroundColor: colors.primary, marginTop: 20 }]}
        onPress={handleViewAdminDashboard}
        activeOpacity={0.8}
      >
        <Ionicons name="eye-outline" color={colors.white} size={isMobileWeb ? 14 : 18} />
        <Text style={styles.contactButtonText}>למאחורי הקלעים של KC</Text>
      </TouchableOpacity>
    </Section>
  );
};

const RoadmapSection = () => {
  const roadmapSteps = [
    {
      time: 'Q1 2026',
      label: 'הוצאת גרסה ראשונה לאפלקציה לandroid וios',
      icon: 'phone-portrait-outline',
      color: colors.info
    },
    {
      time: 'Q2 2026',
      label: 'פיצירים מתקדמים לשיתוף מידע עם שאר העמותות וקבוצות הוואטספ והפייסבוק',
      icon: 'share-social-outline',
      color: colors.secondary
    },
    {
      time: 'Q3 2026',
      label: 'שיתופי פעולה עם עיריות וגורמי רווחה',
      icon: 'business-outline',
      color: colors.accent
    },
    {
      time: 'Q4 2026',
      label: 'יציאה לחו״ל כפלטפורמה בינלאומית',
      icon: 'globe-outline',
      color: colors.success
    },
  ];

  const logoEvolution = [
    { image: require('../assets/images/landingScreen/kc_log_evo/logo-0.jpeg'), label: 'התחלה' },
    { image: require('../assets/images/landingScreen/kc_log_evo/logo-1.jpeg'), label: 'פיתוח' },
    { image: require('../assets/images/landingScreen/kc_log_evo/logo-2.jpeg'), label: 'שיפור' },
    { image: require('../assets/images/landingScreen/kc_log_evo/logo-3.jpeg'), label: 'עדכון' },
    { image: require('../assets/images/landingScreen/kc_log_evo/logo-4.png'), label: 'עכשיו' },
  ];

  return (
    <Section id="section-roadmap" title="מפת הדרכים שלנו" subtitle="התוכנית להרחבת האימפקט של הקהילה">
      <View style={styles.roadmapContainer}>
        {roadmapSteps.map((step, index) => (
          <View key={step.label} style={styles.roadmapItemWrapper}>
            <View style={styles.roadmapItem}>
              <View style={[styles.roadmapIconContainer, { backgroundColor: step.color + '15' }]}>
                <Ionicons
                  name={step.icon as any}
                  size={isMobileWeb ? 24 : 32}
                  color={step.color}
                />
              </View>
              <View style={styles.roadmapContent}>
                <View style={[styles.roadmapTimeBadge, { backgroundColor: step.color }]}>
                  <Text style={styles.roadmapTimeText}>{step.time}</Text>
                </View>
                <Text style={styles.roadmapLabel}>{step.label}</Text>
              </View>
            </View>
            {index < roadmapSteps.length - 1 && (
              <View style={styles.roadmapConnector}>
                <View style={[styles.roadmapConnectorLine, { borderColor: step.color + '40' }]} />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Logo Evolution Section */}
      <View style={styles.logoEvolutionContainer}>
        <Text style={styles.logoEvolutionTitle}>איך הדברים מתפתחים</Text>
        <Text style={styles.logoEvolutionSubtitle}>הלוגו שלנו עבר כמה גרסאות בדרך לכאן</Text>
        <View style={styles.logoEvolutionGrid}>
          {logoEvolution.map((logo, index) => (
            <View key={index} style={styles.logoEvolutionItem}>
              <Image source={logo.image} style={styles.logoEvolutionImage} resizeMode="contain" />
              <Text style={styles.logoEvolutionLabel}>{logo.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.brandStrip}>
        <Ionicons name="rocket-outline" size={isMobileWeb ? 18 : 24} color={colors.info} />
        <Text style={styles.trustText}>מתקדמים יחד עם הקהילה – כל פידבק משפיע על סדר העדיפויות שלנו.</Text>
      </View>
    </Section>
  );
};

const AboutSection: React.FC = () => (
  <Section id="section-about" title="קהילה אחת. מטרה אחת." subtitle="הסיפור של קהילת קארמה">
    <Text style={styles.paragraph}>
      בעולם מלא ברעש, אנחנו מאמינים בכוח השקט של עשיית הטוב. קהילת קארמה נולדה מתוך צורך פשוט: לחבר בין אנשים. בין אלה שצריכים עזרה, לבין אלה שיכולים ורוצים להושיט יד. ראינו את הכפילויות, את חוסר האמון ואת המאמצים המפוזרים, והחלטנו ליצור פלטפורמה אחת שמאחדת את כולם.
    </Text>
    <Text style={styles.paragraph}>
      בלי פרסומות, בלי אינטרסים, רק טכנולוגיה בשירות האנושיות. המשימה שלנו היא להפוך את הנתינה לחלק טבעי ופשוט מהיום-יום של כולנו, וליצור חברה ישראלית מחוברת, תומכת ואכפתית יותר.
    </Text>
    <Text style={[styles.sectionSubTitle, { marginTop: 30 }]}>מילה מהמייסד, נוה סרוסי</Text>
    <Text style={styles.paragraph}>
      מגיל צעיר הרגשתי פריבילגיה ושהחיים שלי מסודרים. דווקא בצבא, למרות שהגעתי לתפקיד טוב בתור מתכנת מטוסים, לא הרגשתי את המשמעות שחיפשתי. כל הזמן חשבתי איך אני יכול להביא שינוי אמיתי וטוב לעולם. תמיד עניין אותי לעבוד בסקיילים גדולים ולהשפיע לטובה על כמה שיותר אנשים.
    </Text>
    <Text style={styles.paragraph}>
      קהילת קארמה היא הדרך שלי להפוך את הטוב לנגיש יותר, ליצור פלטפורמה שמחברת בין אנשים שרוצים לעזור לאנשים שצריכים עזרה. אני מאמין בכוח של קהילה לשנות מציאות, ואשמח שתצטרפו אליי למסע הזה.
    </Text>

    {/* WhatsApp CTA Button */}
    <View style={styles.ctaRow}>
      <TouchableOpacity
        style={[styles.contactButton, { backgroundColor: colors.success }]}
        onPress={() => {
          logger.info('LandingSite', 'Click - whatsapp from founder section');
          Linking.openURL('https://wa.me/972528616878');
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="logo-whatsapp" color={colors.white} size={isMobileWeb ? 14 : 18} />
        <Text style={styles.contactButtonText}>שלחו לי ווטסאפ</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.githubLinkContainer}>
      <TouchableOpacity
        style={styles.githubLinkButton}
        onPress={() => { logger.info('LandingSite', 'Click - github org'); Linking.openURL('https://github.com/KarmaCummunity'); }}
      >
        <Ionicons name="logo-github" size={isMobileWeb ? 18 : 24} color={colors.textPrimary} />
        <View style={styles.githubLinkTextContainer}>
          <Text style={styles.githubLinkTitle}>גיטהאב - הקוד הפתוח</Text>
          <Text style={styles.githubLinkDescription}>זה הקוד של האפליקציה. כולם מוזמנים להסתכל ולעזור</Text>
        </View>
        <Ionicons name="arrow-forward-outline" size={isMobileWeb ? 16 : 20} color={colors.info} />
      </TouchableOpacity>
    </View>
  </Section>
);

const GallerySection = () => (
  <Section title="רגעים מהקהילה" subtitle="תמונות ששוות אלף מילים">
    <View style={styles.galleryGrid}>
      <Image source={require('../assets/images/landingScreen/found-money.png')} style={styles.galleryImage} resizeMode="cover" />
      <Image source={require('../assets/images/landingScreen/together.png')} style={styles.galleryImage} resizeMode="cover" />
      <Image source={require('../assets/images/landingScreen/toy_donation.png')} style={styles.galleryImage} resizeMode="cover" />
    </View>
  </Section>
);

const PartnersSection = () => (
  <Section title="ביחד יוצרים שינוי" subtitle="גאים לשתף פעולה עם ארגונים שחולקים את החזון שלנו" style={styles.sectionAltBackground}>
    <View style={styles.partnersContainer}>
      <View style={styles.partnerCard}>
        <Image source={require('../assets/images/landingScreen/jgive-logo.png')} style={styles.partnerLogo} resizeMode="contain" />
      </View>
    </View>
  </Section>
);

const InstagramSection = () => {
  const [webViewKey, setWebViewKey] = useState(0);

  return (
    <Section id="section-instagram" title="עקבו אחרינו באינסטגרם" subtitle="תמונות וסרטונים מהקהילה שלנו" style={styles.sectionAltBackground}>
      <View style={styles.instagramContainer}>
        {isWeb ? (
          <View style={styles.instagramWebViewContainer}>
            <WebView
              key={webViewKey}
              source={{ uri: 'https://www.instagram.com/karma_community_/' }}
              style={styles.instagramWebView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.instagramLoadingContainer}>
                  <ActivityIndicator size="large" color={colors.secondary} />
                  <Text style={styles.instagramLoadingText}>טוען אינסטגרם...</Text>
                </View>
              )}
              onError={() => {
                logger.error('LandingSite', 'Instagram WebView error');
                setWebViewKey(prev => prev + 1); // Retry
              }}
            />
          </View>
        ) : (
          <View style={styles.instagramFallback}>
            <Ionicons name="logo-instagram" size={isMobileWeb ? 48 : 64} color={colors.secondary} />
            <Text style={styles.instagramFallbackText}>
              עקבו אחרינו באינסטגרם
            </Text>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: colors.secondary }]}
              onPress={() => {
                logger.info('LandingSite', 'Click - instagram from section');
                Linking.openURL('https://www.instagram.com/karma_community_/');
              }}
            >
              <Ionicons name="logo-instagram" color={colors.white} size={isMobileWeb ? 14 : 18} />
              <Text style={styles.contactButtonText}>פתח באינסטגרם</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Section>
  );
};



const FAQItem: React.FC<{ question: string; answer: string; icon?: string }> = ({ question, answer, icon }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedRotation = useRef(new Animated.Value(0)).current;

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(animatedRotation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setIsExpanded(!isExpanded);
  };

  const contentHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200], // Max height for answer
  });

  const rotateInterpolate = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.faqCard}>
      <TouchableOpacity
        style={styles.faqQuestionRow}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.faqQuestionContent}>
          {icon && (
            <Ionicons
              name={icon as any}
              size={isMobileWeb ? 20 : 24}
              color={colors.info}
              style={styles.faqIcon}
            />
          )}
          <Text style={styles.faqQ}>{question}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons
            name="chevron-down-outline"
            size={isMobileWeb ? 20 : 24}
            color={colors.info}
          />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={[styles.faqAnswerContainer, { maxHeight: contentHeight, opacity: animatedHeight }]}>
        <Text style={styles.faqA}>{answer}</Text>
      </Animated.View>
    </View>
  );
};

const FAQSection = () => {
  const faqData = [
    {
      question: 'האם השימוש באפליקציה עולה כסף?',
      answer: 'לא. קהילת קארמה היא מיזם ללא מטרות רווח, והשימוש בה יהיה תמיד בחינם, לכולם. אנחנו מאמינים שעזרה הדדית צריכה להיות נגישה לכולם, ללא כל עלות.',
      icon: 'cash-outline',
    },
    {
      question: 'איך אפשר לתרום או להתנדב?',
      answer: 'הדרך הטובה ביותר היא להוריד את האפליקציה, להצטרף לקהילה ולהתחיל להגיב לבקשות שעולות. בנוסף, תמיד אפשר ליצור איתנו קשר ישירות דרך ווטסאפ, מייל או לקבוצת הווטסאפ שלנו. כל עזרה מוערכת!',
      icon: 'heart-outline',
    },
    {
      question: 'האם האפליקציה זמינה גם לאנדרואיד וגם ל-iOS?',
      answer: 'האפליקציה נמצאת כרגע בתהליך בנייה. בינתיים, יש לנו אתר Web זמין לשימוש שניתן לגשת אליו מכל דפדפן, גם הוא בתהליך בנייה והתפתחות מתמשכת. אנו עובדים על גרסאות לאנדרואיד ו-iOS שיושקו בעתיד.',
      icon: 'phone-portrait-outline',
    },
    {
      question: 'האם יש פרסומות?',
      answer: 'ממש לא. הפלטפורמה נקייה לחלוטין מפרסומות ומקדשת תוכן קהילתי בלבד. אנחנו מחויבים לשמור על חוויית משתמש נקייה וממוקדת בקהילה, ללא הסחות דעת מסחריות.',
      icon: 'ban-outline',
    },
    {
      question: 'איך מתחילים להשתמש באפליקציה?',
      answer: 'פשוט מאוד! הורידו את האפליקציה, הירשמו עם כמה פרטים בסיסיים (או השתמשו במצב אורח), ומיד תוכלו להתחיל לפרסם בקשות או הצעות, או לדפדף ולגלות מה קורה בקהילה סביבכם.',
      icon: 'play-circle-outline',
    },
    {
      question: 'מה זה אומר "קיבוץ דיגיטלי"?',
      answer: 'זה החזון שלנו - ליצור קהילה דיגיטלית שמתפקדת כמו קיבוץ: שיתוף, עזרה הדדית, אחריות משותפת, אבל בעולם המודרני והדיגיטלי. כל אחד יכול לתת וכל אחד יכול לקבל, בלי בירוקרטיה ובלי עמלות.',
      icon: 'people-circle-outline',
    },
    {
      question: 'איך אתם מבטיחים אבטחה ופרטיות?',
      answer: 'אנחנו לוקחים את האבטחה והפרטיות ברצינות רבה. כל המידע מוצפן, אנחנו לא משתפים מידע עם צדדים שלישיים, ויש לנו מערכת אימות משתמשים. בנוסף, כל המשתמשים יכולים לשלוט בפרטיות שלהם ולהחליט מה לחשוף.',
      icon: 'shield-checkmark-outline',
    },
    {
      question: 'מה ההבדל בין Karma Community לבין פלטפורמות אחרות?',
      answer: 'ההבדל העיקרי הוא שאנחנו ללא מטרות רווח, ללא פרסומות, וממוקדים 100% בקהילה ובעזרה הדדית. אנחנו לא מוכרים מידע, לא מנסים להרוויח כסף מהמשתמשים, וכל מה שאנחנו עושים הוא למען הקהילה.',
      icon: 'star-outline',
    },
    {
      question: 'איך אפשר לעזור בפיתוח האפליקציה?',
      answer: 'אנחנו תמיד שמחים לעזרה! אפשר לעזור בקוד (הכל פתוח בגיטהאב), בעיצוב, בתוכן, בבדיקות, או פשוט להיות חלק מהקהילה ולשתף פידבק. צרו איתנו קשר דרך ווטסאפ או מייל ונשמח לספר לכם איך אפשר לעזור.',
      icon: 'code-working-outline',
    },
    {
      question: 'מה קורה אם יש בעיה טכנית?',
      answer: 'אם נתקלתם בבעיה טכנית, אנחנו כאן לעזור! צרו איתנו קשר דרך ווטסאפ, מייל, או דרך קבוצת הווטסאפ שלנו. נשתדל לענות מהר ככל האפשר ולפתור את הבעיה. הפידבק שלכם חשוב לנו מאוד!',
      icon: 'help-circle-outline',
    },
  ];

  return (
    <Section id="section-faq" title="שאלות ותשובות" subtitle="כל מה שרציתם לדעת על Karma Community">
      <View style={styles.faqContainer}>
        {faqData.map((item, index) => (
          <FAQItem
            key={index}
            question={item.question}
            answer={item.answer}
            icon={item.icon}
          />
        ))}
      </View>
    </Section>
  );
};

const ContactSection = () => (
  <Section id="section-contact" title="דברו איתנו והצטרפו לקהילה שעושה טוב" subtitle="נשמח לשמוע מכם, לקבל פידבק או או ביקורת וכמובן לחבר אתכם לקהילה" style={styles.sectionAltBackground}>
    <View style={styles.contactRow}>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.success }]} onPress={() => { logger.info('LandingSite', 'Click - whatsapp direct'); Linking.openURL('https://wa.me/972528616878'); }}>
        <Ionicons name="logo-whatsapp" color={colors.white} size={isMobileWeb ? 14 : 18} /><Text style={styles.contactButtonText}>שלחו לי ווטסאפ</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.info }]} onPress={() => { logger.info('LandingSite', 'Click - email'); Linking.openURL('mailto:navesarussi@gmail.com'); }}>
        <Ionicons name="mail-outline" color={colors.white} size={isMobileWeb ? 14 : 18} /><Text style={styles.contactButtonText}>שלחו לי מייל</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.secondary }]} onPress={() => { logger.info('LandingSite', 'Click - instagram'); Linking.openURL('https://www.instagram.com/karma_community_/'); }}>
        <Ionicons name="logo-instagram" color={colors.white} size={isMobileWeb ? 14 : 18} /><Text style={styles.contactButtonText}>עקבו באינסטגרם</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.success }]} onPress={() => { logger.info('LandingSite', 'Click - whatsapp group'); Linking.openURL('https://chat.whatsapp.com/Hi2TpFcO5huKVKarvecz00'); }}>
        <Ionicons name="chatbubbles-outline" color={colors.white} size={isMobileWeb ? 14 : 18} /><Text style={styles.contactButtonText}>הצטרפו לקבוצת ווטסאפ</Text>
      </TouchableOpacity>
    </View>
  </Section>
);

{/* <Section title="הצטרפו לקהילה שעושה טוב" subtitle="כל אחד יכול להשפיע. בואו נבנה את זה יחד." style={styles.sectionAltBackground}> */ }

const LandingSiteScreen: React.FC = () => {
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
      console.log('🏠 LandingSiteScreen - Screen focused, ensuring bars are visible');
      navigation.setParams({
        hideTopBar: false,
        hideBottomBar: false,
      });
    }, [navigation])
  );

  // Handle navigation to app mode
  const handleGoToApp = async () => {
    logger.info('LandingSiteScreen', 'Navigate to app mode', { isAuthenticated, isGuestMode });
    setMode('app');

    // Determine target route based on authentication status
    const targetRoute = (isAuthenticated || isGuestMode) ? 'HomeStack' : 'LoginScreen';

    // Check guards before navigation
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
      // If guard blocks, try redirect if provided
      if (guardResult.redirectTo) {
        await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
      }
      return;
    }

    // Use navigation queue with high priority (2) for mode changes
    await navigationQueue.reset(0, [{ name: targetRoute }], 2);
  };

  // Handle navigation from floating menu
  const handleNavigate = (sectionId: string) => {
    logger.info('LandingSiteScreen', `Navigate to section: ${sectionId}`, {
      isWeb,
      hasScrollRef: !!scrollViewRef.current,
      platform: Platform.OS,
    });

    // For web, use DOM scrolling with container targeting to prevent window scroll
    if (isWeb) {
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
            // Find the nearest scrollable parent explicitly
            let parent = element.parentElement;
            let scrollContainer: HTMLElement | null = null;

            while (parent) {
              const style = window.getComputedStyle(parent);
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
    logger.info('LandingSite', 'useEffect triggered - Landing page mounted', { isWeb, USE_BACKEND });

    // Use sessionStorage to prevent double tracking across all instances
    // שימוש ב-sessionStorage למניעת ספירה כפולה בכל ה-instances
    const VISIT_TRACKED_KEY = 'kc_site_visit_tracked';

    // Track site visit - only on web and if backend is available
    // ספירת ביקור באתר - רק ב-web ואם השרת זמין
    // שינוי: שימוש ב-sessionStorage למניעת כפילות בכל ה-instances
    // Change: Use sessionStorage to prevent double tracking across all instances
    const trackVisitAndLoadStats = async () => {
      // Check if visit already tracked in this session (shared across all component instances)
      // בדיקה אם הביקור כבר נספר ב-session זה (משותף לכל ה-instances של הקומפוננטה)
      const visitTracked = isWeb && typeof window !== 'undefined'
        ? sessionStorage.getItem(VISIT_TRACKED_KEY) === 'true'
        : false;

      if (visitTracked) {
        logger.info('LandingSite', 'Visit already tracked in this session, skipping');
        await loadStats(false);
        return;
      }

      if (isWeb && USE_BACKEND) {
        try {
          // Mark as tracked immediately in sessionStorage to prevent double calls
          // סימון כנספר מיד ב-sessionStorage כדי למנוע קריאות כפולות
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(VISIT_TRACKED_KEY, 'true');
          }

          logger.info('LandingSite', 'Tracking site visit...');
          const response = await apiService.trackSiteVisit();
          if (response.success) {
            logger.info('LandingSite', 'Site visit tracked successfully');
            // Reload stats with forceRefresh to get updated site_visits count
            // טעינה מחדש של סטטיסטיקות עם forceRefresh כדי לקבל את מספר הביקורים המעודכן
            await loadStats(true);
          } else {
            logger.warn('LandingSite', 'Site visit tracking failed', { error: response.error });
            // Reset flag on failure so we can retry
            // איפוס הדגל בכשל כדי שנוכל לנסות שוב
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem(VISIT_TRACKED_KEY);
            }
            // Still load stats even if tracking failed
            await loadStats(false);
          }
        } catch (error) {
          logger.error('LandingSite', 'Failed to track site visit', { error });
          // Reset flag on error so we can retry
          // איפוס הדגל בשגיאה כדי שנוכל לנסות שוב
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(VISIT_TRACKED_KEY);
          }
          // Still load stats even if tracking failed
          await loadStats(false);
        }
      } else {
        // If not web or backend not available, just load stats
        logger.info('LandingSite', 'Skipping site visit tracking', { isWeb, USE_BACKEND });
        await loadStats(false);
      }
    };

    trackVisitAndLoadStats();

    return () => {
      logger.info('LandingSite', 'Landing page unmounted');
    };
  }, []);


  // Scroll Spy - Track which section is currently in view
  useEffect(() => {
    if (!isWeb) return; // Works on all web screens including mobile

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
  }, [isWeb]);

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
        <HeroSection onDonate={() => setShowDonationModal(true)} />
        <StatsSection stats={stats} isLoadingStats={isLoadingStats} onGoToApp={handleGoToApp} />
        <LazySection section={VisionSection} onGoToApp={handleGoToApp} />
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
          <Text style={styles.footerText}>© {new Date().getFullYear()} Karma Community — נבנה באהבה ובתמיכת הקהילה.</Text>
        </View>
      </ScrollContainer>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingBottom: isMobileWeb ? 80 : 120,
    backgroundColor: colors.white,
  },
  hero: {
    width: '100%',
    overflow: 'hidden',
  },
  heroGradient: {
    backgroundColor: colors.backgroundTertiary,
    paddingTop: isMobileWeb ? 40 : (isWeb ? 60 : 80),
    paddingBottom: isMobileWeb ? 30 : (isWeb ? 50 : 70),
    paddingHorizontal: isMobileWeb ? 16 : (isWeb ? 20 : 40),
    position: 'relative',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  welcomeTitle: {
    fontSize: isMobileWeb ? 28 : (isWeb ? (isTablet ? 56 : 42) : 64),
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: isMobileWeb ? 16 : (isWeb ? 24 : 32),
    letterSpacing: -1,
    lineHeight: isMobileWeb ? 34 : (isWeb ? (isTablet ? 64 : 50) : 72),
  },
  welcomeTitleLarge: {
    fontSize: isMobileWeb ? 32 : (isWeb ? (isTablet ? 64 : 48) : 72),
    fontWeight: '900',
    color: colors.textPrimary,
  },
  welcomeTitleSmall: {
    fontSize: isMobileWeb ? 24 : (isWeb ? (isTablet ? 48 : 36) : 56),
    fontWeight: '900',
    color: colors.textPrimary,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: isMobileWeb ? 12 : (isWeb ? 20 : 28),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: isMobileWeb ? 140 : (isWeb ? (isTablet ? 240 : 220) : 260),
    overflow: 'hidden',
  },
  logoBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: isMobileWeb ? 180 : (isWeb ? (isTablet ? 320 : 280) : 360),
    height: isMobileWeb ? 180 : (isWeb ? (isTablet ? 320 : 280) : 360),
    opacity: 0.35,
  },
  title: {
    fontSize: isMobileWeb ? 24 : (isWeb ? (isTablet ? 48 : 36) : 56),
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: isMobileWeb ? 12 : (isWeb ? 16 : 20),
    letterSpacing: -0.5,
  },
  subtitlesRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: isMobileWeb ? 12 : (isWeb ? (isTablet ? 28 : 20) : 32),
    marginBottom: isMobileWeb ? 8 : (isWeb ? 12 : 16),
    flexWrap: 'wrap',
  },
  subtitleItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: isMobileWeb ? 6 : (isWeb ? (isTablet ? 12 : 10) : 14),
    paddingHorizontal: isMobileWeb ? 8 : (isWeb ? (isTablet ? 16 : 12) : 20),
    paddingVertical: isMobileWeb ? 6 : (isWeb ? (isTablet ? 10 : 8) : 12),
    borderRadius: isMobileWeb ? 12 : (isWeb ? (isTablet ? 20 : 16) : 24),
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  subtitleItemGreen: {
    backgroundColor: colors.greenBright + '18',
    borderColor: colors.greenBright + '50',
  },
  subtitleIcon: {
    marginTop: isMobileWeb ? 1 : 2,
  },
  subtitleText: {
    fontSize: isMobileWeb ? 12 : (isWeb ? (isTablet ? 24 : 18) : 28),
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: isMobileWeb ? 14 : (isWeb ? (isTablet ? 20 : 18) : 24),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: isMobileWeb ? 6 : (isWeb ? 8 : 12),
    maxWidth: isMobileWeb ? '95%' : (isTablet ? '70%' : '90%'),
    lineHeight: isMobileWeb ? 20 : (isWeb ? 28 : 32),
    fontWeight: '500',
  },
  heroMottosContainer: {
    marginTop: isMobileWeb ? 16 : 24,
    width: '100%',
    alignItems: 'center',
    gap: isMobileWeb ? 8 : 12,
  },
  mottoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobileWeb ? 8 : 12,
    maxWidth: isMobileWeb ? '95%' : '85%',
  },
  mottoItemIcon: {
    marginTop: isMobileWeb ? 2 : 4,
  },
  mottoSubtitle: {
    fontSize: isMobileWeb ? 16 : (isWeb ? (isTablet ? 22 : 20) : 26),
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: isMobileWeb ? 24 : (isWeb ? 32 : 36),
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: isMobileWeb ? 10 : 16,
    marginTop: isMobileWeb ? 24 : 40,
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  ctaIcon: {
    marginRight: isMobileWeb ? 6 : 8,
  },
  primaryCta: {
    backgroundColor: colors.info,
    paddingHorizontal: isMobileWeb ? 20 : 32,
    paddingVertical: isMobileWeb ? 12 : 18,
    borderRadius: isMobileWeb ? 12 : 16,
    minWidth: isMobileWeb ? 140 : 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.info,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 8,
  },
  primaryCtaText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: isMobileWeb ? 14 : (isWeb ? 18 : 20),
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  secondaryCta: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.info,
    paddingHorizontal: isMobileWeb ? 20 : 32,
    paddingVertical: isMobileWeb ? 12 : 18,
    borderRadius: isMobileWeb ? 12 : 16,
    minWidth: isMobileWeb ? 140 : 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryCtaText: {
    color: colors.info,
    fontWeight: '800',
    fontSize: isMobileWeb ? 14 : (isWeb ? 18 : 20),
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  section: {
    paddingHorizontal: isMobileWeb ? 16 : (isWeb ? (isTablet ? 40 : 24) : 40),
    paddingVertical: isMobileWeb ? 24 : (isWeb ? (isTablet ? 60 : 40) : 50),
    width: '100%',
    alignSelf: 'center',
    maxWidth: isTablet ? 1200 : '100%',
  },
  sectionTitle: {
    fontSize: isMobileWeb ? 20 : (isWeb ? (isTablet ? 36 : 28) : 42),
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: isMobileWeb ? 6 : 8,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: isMobileWeb ? 13 : (isWeb ? (isTablet ? 18 : 16) : 22),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: isMobileWeb ? 12 : (isWeb ? 20 : 24),
    lineHeight: isMobileWeb ? 18 : (isWeb ? 26 : 30),
    fontWeight: '500',
  },
  sectionSubTitle: {
    fontSize: isMobileWeb ? 14 : (isWeb ? 18 : 24),
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: isMobileWeb ? 10 : (isWeb ? 15 : 20),
    marginBottom: isMobileWeb ? 6 : (isWeb ? 8 : 12)
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: isMobileWeb ? 12 : 24,
    width: '100%',
    marginTop: isMobileWeb ? 12 : 20,
  },
  feature: {
    flex: 1,
    minWidth: isMobileWeb ? 140 : 280,
    maxWidth: isMobileWeb ? '100%' : 350,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    borderRadius: isMobileWeb ? 12 : 20,
    padding: isMobileWeb ? 16 : 28,
    alignItems: 'center',
    margin: isMobileWeb ? 4 : 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  featureEmoji: {
    fontSize: isMobileWeb ? 32 : 48,
    marginBottom: isMobileWeb ? 10 : 16,
  },
  featureTitle: {
    fontSize: isMobileWeb ? 16 : 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: isMobileWeb ? 8 : 12,
    letterSpacing: -0.3,
  },
  featureText: {
    fontSize: isMobileWeb ? 13 : 18,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: isMobileWeb ? 18 : 28,
    fontWeight: '400',
  },
  paragraph: {
    fontSize: isMobileWeb ? 14 : (isWeb ? 18 : 20),
    color: colors.textPrimary,
    lineHeight: isMobileWeb ? 20 : (isWeb ? 28 : 30),
    textAlign: 'center',
    marginTop: isMobileWeb ? 8 : 12,
    maxWidth: isMobileWeb ? '95%' : (isTablet ? '80%' : '90%'),
    alignSelf: 'center',
    fontWeight: '400',
  },
  linksRow: { flexDirection: 'row', gap: isMobileWeb ? 12 : 24, marginTop: isMobileWeb ? 10 : 16, alignSelf: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  link: { color: colors.primary, fontWeight: '700', fontSize: isMobileWeb ? 14 : 20, padding: isMobileWeb ? 6 : 8 },
  faqContainer: {
    width: '100%',
    maxWidth: isTablet ? 900 : '100%',
    alignSelf: 'center',
    gap: isMobileWeb ? 12 : 16,
    marginTop: isMobileWeb ? 12 : 20,
  },
  faqCard: {
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 12 : 16,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    marginBottom: isMobileWeb ? 8 : 12,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobileWeb ? 16 : 20,
    backgroundColor: colors.backgroundSecondary,
  },
  faqQuestionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobileWeb ? 10 : 14,
  },
  faqIcon: {
    marginRight: isMobileWeb ? 4 : 6,
  },
  faqQ: {
    flex: 1,
    fontWeight: '800',
    color: colors.textPrimary,
    fontSize: isMobileWeb ? 15 : 18,
    lineHeight: isMobileWeb ? 22 : 26,
  },
  faqAnswerContainer: {
    paddingHorizontal: isMobileWeb ? 16 : 20,
    paddingBottom: isMobileWeb ? 16 : 20,
    overflow: 'hidden',
  },
  faqA: {
    color: colors.textSecondary,
    fontSize: isMobileWeb ? 14 : 16,
    lineHeight: isMobileWeb ? 20 : 24,
    fontWeight: '400',
  },
  iconBullets: { marginTop: isMobileWeb ? 10 : 16, gap: isMobileWeb ? 10 : 16, width: '100%', maxWidth: isMobileWeb ? '95%' : '90%', alignSelf: 'center' },
  iconBulletRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: isMobileWeb ? 10 : 16, justifyContent: 'center', paddingVertical: isMobileWeb ? 2 : 4 },
  iconBulletText: { color: colors.textPrimary, fontSize: isMobileWeb ? 13 : 18, textAlign: 'center', flex: 1 },
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: isMobileWeb ? 12 : 24, justifyContent: 'space-around', marginTop: isMobileWeb ? 12 : 20, width: '100%' },
  stepCard: {
    flex: 1,
    minWidth: isMobileWeb ? 140 : 280,
    maxWidth: isMobileWeb ? '100%' : 350,
    borderRadius: isMobileWeb ? 12 : 20,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    backgroundColor: colors.white,
    padding: isMobileWeb ? 16 : 28,
    alignItems: 'center',
    margin: isMobileWeb ? 4 : 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  stepTitle: {
    marginTop: isMobileWeb ? 10 : 16,
    fontWeight: '800',
    color: colors.textPrimary,
    fontSize: isMobileWeb ? 16 : 24,
    letterSpacing: -0.3,
  },
  stepText: {
    marginTop: isMobileWeb ? 8 : 12,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: isMobileWeb ? 13 : 18,
    lineHeight: isMobileWeb ? 18 : 28,
    fontWeight: '400',
  },
  splitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: isMobileWeb ? 16 : 30, justifyContent: 'space-around', width: '100%' },
  splitColumn: { flex: 1, minWidth: isMobileWeb ? 140 : 320, maxWidth: isMobileWeb ? '100%' : 500, padding: isMobileWeb ? 12 : 20 },
  splitTitle: { textAlign: 'center', fontSize: isMobileWeb ? 18 : 24, fontWeight: '800', color: colors.textPrimary, marginBottom: isMobileWeb ? 8 : 12 },
  valuesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: isMobileWeb ? 6 : 10, justifyContent: 'center', marginTop: isMobileWeb ? 4 : 6 },
  valuePill: {
    paddingHorizontal: isMobileWeb ? 14 : 24,
    paddingVertical: isMobileWeb ? 8 : 14,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.info,
    margin: isMobileWeb ? 3 : 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  valuePillText: {
    color: colors.info,
    fontWeight: '700',
    fontSize: isMobileWeb ? 12 : 18,
  },
  roadmapContainer: {
    marginTop: isMobileWeb ? 24 : 32,
    width: '100%',
    maxWidth: isTablet ? 1000 : '100%',
    alignSelf: 'center',
    writingDirection: 'rtl',
  },
  roadmapItemWrapper: {
    width: '100%',
    marginBottom: 0,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 16 : 20,
    padding: isMobileWeb ? 16 : 24,
    marginBottom: isMobileWeb ? 20 : 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.backgroundSecondary,
    writingDirection: 'rtl',
  },
  roadmapIconContainer: {
    width: isMobileWeb ? 48 : 64,
    height: isMobileWeb ? 48 : 64,
    borderRadius: isMobileWeb ? 24 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: isMobileWeb ? 12 : 16,
    flexShrink: 0,
  },
  roadmapContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  roadmapTimeBadge: {
    paddingHorizontal: isMobileWeb ? 12 : 16,
    paddingVertical: isMobileWeb ? 6 : 8,
    borderRadius: isMobileWeb ? 8 : 12,
    alignSelf: 'flex-end',
    marginBottom: isMobileWeb ? 8 : 12,
  },
  roadmapTimeText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: isMobileWeb ? 14 : 16,
    letterSpacing: 0.5,
  },
  roadmapLabel: {
    color: colors.textPrimary,
    fontSize: isMobileWeb ? 16 : 20,
    lineHeight: isMobileWeb ? 24 : 30,
    fontWeight: '700',
    textAlign: 'right',
  },
  roadmapConnector: {
    position: 'absolute',
    right: isMobileWeb ? 24 : 32,
    top: isMobileWeb ? 64 : 88,
    height: isMobileWeb ? 20 : 24,
    width: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  roadmapConnectorLine: {
    width: 2,
    height: '100%',
    borderLeftWidth: 2,
    borderStyle: 'dashed',
  },
  logoEvolutionContainer: {
    marginTop: isMobileWeb ? 32 : 48,
    width: '100%',
    alignItems: 'center',
  },
  logoEvolutionTitle: {
    fontSize: isMobileWeb ? 20 : 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: isMobileWeb ? 8 : 12,
  },
  logoEvolutionSubtitle: {
    fontSize: isMobileWeb ? 14 : 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: isMobileWeb ? 20 : 28,
    fontWeight: '500',
  },
  logoEvolutionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isMobileWeb ? 12 : 20,
    width: '100%',
    maxWidth: isTablet ? 800 : '100%',
  },
  logoEvolutionItem: {
    alignItems: 'center',
    gap: isMobileWeb ? 8 : 12,
    flex: 1,
    minWidth: isMobileWeb ? 100 : 140,
    maxWidth: isMobileWeb ? 120 : 160,
  },
  logoEvolutionImage: {
    width: isMobileWeb ? 80 : 120,
    height: isMobileWeb ? 80 : 120,
    borderRadius: isMobileWeb ? 12 : 16,
    borderWidth: 2,
    borderColor: colors.backgroundTertiary,
    backgroundColor: colors.white,
  },
  logoEvolutionLabel: {
    fontSize: isMobileWeb ? 12 : 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  brandStrip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: isMobileWeb ? 8 : 10, paddingVertical: isMobileWeb ? 12 : 16 },
  brandIcon: { width: isMobileWeb ? 30 : 40, height: isMobileWeb ? 30 : 40, opacity: 0.9 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: isMobileWeb ? 10 : 20, justifyContent: 'center', marginTop: isMobileWeb ? 16 : 24, width: '100%' },
  contactButton: {
    flexDirection: 'row',
    gap: isMobileWeb ? 8 : 12,
    alignItems: 'center',
    paddingHorizontal: isMobileWeb ? 16 : 28,
    paddingVertical: isMobileWeb ? 12 : 18,
    borderRadius: isMobileWeb ? 12 : 16,
    minWidth: isMobileWeb ? 140 : 200,
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  contactButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: isMobileWeb ? 13 : 18,
    letterSpacing: 0.3,
  },
  footer: {
    paddingHorizontal: isMobileWeb ? 16 : 20,
    paddingVertical: isMobileWeb ? 20 : 32,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundSecondary,
    alignItems: 'center',
    marginTop: isMobileWeb ? 24 : 40,
    backgroundColor: colors.backgroundSecondary,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: isMobileWeb ? 12 : 14,
    fontWeight: '500',
  },
  // Statistics styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: isMobileWeb ? 12 : 24,
    marginTop: isMobileWeb ? 12 : 20,
    width: '100%'
  },
  statCard: {
    flex: 1,
    minWidth: isMobileWeb ? 140 : 250,
    maxWidth: isMobileWeb ? '48%' : 300,
    paddingVertical: isMobileWeb ? 16 : 32,
    paddingHorizontal: isMobileWeb ? 12 : 20,
    borderRadius: isMobileWeb ? 12 : 20,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    backgroundColor: colors.white,
    alignItems: 'center',
    margin: isMobileWeb ? 4 : 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  statIcon: {
    marginBottom: isMobileWeb ? 8 : 12,
  },
  statNumber: {
    fontSize: isMobileWeb ? 22 : (isWeb ? 36 : 40),
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: isMobileWeb ? 6 : 8,
    letterSpacing: -1,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: isMobileWeb ? 12 : 18,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: isMobileWeb ? 16 : 26,
    fontWeight: '500',
  },
  statsLoadingContainer: {
    paddingVertical: isMobileWeb ? 40 : 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsLoadingText: {
    marginTop: isMobileWeb ? 12 : 16,
    fontSize: isMobileWeb ? 14 : 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  useCases: { gap: isMobileWeb ? 10 : 16, marginTop: isMobileWeb ? 10 : 16, alignSelf: 'center', width: '100%', maxWidth: isMobileWeb ? '95%' : '90%' },
  useCaseRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: isMobileWeb ? 10 : 16, alignSelf: 'center', paddingVertical: isMobileWeb ? 4 : 8 },
  useCaseText: { color: colors.textPrimary, fontSize: isMobileWeb ? 13 : 18, textAlign: 'center', flex: 1 },
  testimonials: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: isMobileWeb ? 12 : 24, marginTop: isMobileWeb ? 12 : 20, width: '100%' },
  testimonialCard: {
    flex: 1,
    minWidth: isMobileWeb ? 140 : 320,
    maxWidth: isMobileWeb ? '100%' : 400,
    borderRadius: isMobileWeb ? 12 : 20,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    backgroundColor: colors.white,
    padding: isMobileWeb ? 16 : 28,
    margin: isMobileWeb ? 4 : 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  testimonialText: {
    color: colors.textPrimary,
    fontSize: isMobileWeb ? 13 : 18,
    lineHeight: isMobileWeb ? 18 : 30,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  testimonialUser: {
    color: colors.textSecondary,
    marginTop: isMobileWeb ? 10 : 16,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: isMobileWeb ? 12 : 16,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isMobileWeb ? 8 : 16,
    marginTop: isMobileWeb ? 12 : 20
  },
  galleryImage: {
    width: isMobileWeb ? 140 : 280,
    height: isMobileWeb ? 140 : 280,
    borderRadius: isMobileWeb ? 12 : 20,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    backgroundColor: colors.backgroundSecondary
  },
  partnersContainer: {
    width: '100%',
    maxWidth: isTablet ? 800 : '100%',
    alignSelf: 'center',
    marginTop: isMobileWeb ? 12 : 20,
  },
  partnersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobileWeb ? 20 : 40,
    marginTop: isMobileWeb ? 12 : 20,
    flexWrap: 'wrap'
  },
  partnerCard: {
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 16 : 24,
    padding: isMobileWeb ? 24 : 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: isMobileWeb ? '100%' : 400,
    alignSelf: 'center',
  },
  partnerLogo: {
    height: isMobileWeb ? 50 : 70,
    width: isMobileWeb ? 120 : 180,
    marginBottom: isMobileWeb ? 12 : 16,
  },
  partnerName: {
    fontSize: isMobileWeb ? 18 : 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: isMobileWeb ? 8 : 12,
  },
  partnerDescription: {
    fontSize: isMobileWeb ? 14 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: isMobileWeb ? 20 : 24,
  },
  instagramContainer: {
    width: '100%',
    maxWidth: isTablet ? 900 : '100%',
    alignSelf: 'center',
    marginTop: isMobileWeb ? 12 : 20,
    borderRadius: isMobileWeb ? 12 : 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instagramEmbedContainer: {
    width: '100%',
    height: isMobileWeb ? 500 : 600,
    borderRadius: isMobileWeb ? 12 : 16,
    overflow: 'hidden',
  },
  instagramWebViewContainer: {
    width: '100%',
    height: isMobileWeb ? 500 : 600,
    borderRadius: isMobileWeb ? 12 : 16,
    overflow: 'hidden',
  },
  instagramWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  instagramLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    gap: isMobileWeb ? 12 : 16,
  },
  instagramLoadingText: {
    fontSize: isMobileWeb ? 14 : 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  instagramFallback: {
    padding: isMobileWeb ? 40 : 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobileWeb ? 16 : 24,
  },
  instagramFallbackText: {
    fontSize: isMobileWeb ? 16 : 20,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  trustList: { gap: isMobileWeb ? 6 : 10, marginTop: isMobileWeb ? 6 : 8, alignItems: 'center' },
  trustRow: { flexDirection: 'row-reverse', gap: isMobileWeb ? 6 : 8, alignItems: 'center' },
  trustText: { color: colors.textPrimary, fontSize: isMobileWeb ? 11 : 14 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: isMobileWeb ? 8 : 12, marginTop: isMobileWeb ? 6 : 8 },
  categoryCard: {
    width: isMobileWeb ? 100 : 150,
    height: isMobileWeb ? 60 : 90,
    borderRadius: isMobileWeb ? 12 : 16,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobileWeb ? 4 : 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryText: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: isMobileWeb ? 12 : 16,
  },
  // Floating Menu Styles
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999, // מתחת לתפריט אבל מעל התוכן
  },
  floatingMenu: {
    position: 'absolute',
    right: isMobileWeb ? 8 : 20,
    top: isMobileWeb ? 60 : 100,
    minWidth: 150,
    width: isMobileWeb ? '14%' : '10%',
    maxHeight: isMobileWeb ? '70vh' as any : (isWeb ? '80vh' as any : 600),
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 12 : 20,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 1000,
    overflow: 'hidden',
  },
  floatingMenuMinimized: {
    position: 'absolute',
    right: isMobileWeb ? 8 : 20,
    top: isMobileWeb ? 60 : 100,
    width: isMobileWeb ? SCREEN_WIDTH * 0.05 : SCREEN_WIDTH * 0.03, // 5% for mobile, 3% for desktop
    height: isMobileWeb ? SCREEN_WIDTH * 0.05 : SCREEN_WIDTH * 0.03,
    // backgroundColor: colors.white,
    borderRadius: isMobileWeb ? SCREEN_WIDTH * 0.025 : SCREEN_WIDTH * 0.015,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuToggleButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_WIDTH * 0.01, // 1% of screen width
    paddingVertical: SCREEN_WIDTH * 0.008, // 0.8% of screen width
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
    backgroundColor: colors.backgroundSecondary,
  },
  menuTitle: {
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  menuMinimizeButton: {
    padding: SCREEN_WIDTH * 0.002, // 0.2% of screen width
  },
  menuItems: {
    flex: 1,
    paddingVertical: SCREEN_WIDTH * 0.006, // 0.6% of screen width
  },
  menuItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SCREEN_WIDTH * 0.006, // 0.6% of screen width
    borderRightWidth: 3,
    borderRightColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: colors.backgroundTertiary,
    borderRightColor: colors.info,
  },
  menuItemIcon: {
    marginLeft: SCREEN_WIDTH * 0.002, // 0.2% of screen width
  },
  menuItemText: {
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  menuItemTextActive: {
    color: colors.info,
    fontWeight: '700',
  },
  // New Styles
  decoCircle1: {
    position: 'absolute',
    width: isMobileWeb ? 200 : 400,
    height: isMobileWeb ? 200 : 400,
    borderRadius: isMobileWeb ? 100 : 200,
    backgroundColor: 'rgba(65, 105, 225, 0.05)',
    top: isMobileWeb ? -50 : -100,
    left: isMobileWeb ? -75 : -150,
  },
  decoCircle2: {
    position: 'absolute',
    width: isMobileWeb ? 150 : 300,
    height: isMobileWeb ? 150 : 300,
    borderRadius: isMobileWeb ? 75 : 150,
    backgroundColor: 'rgba(255, 192, 203, 0.08)',
    bottom: isMobileWeb ? -25 : -50,
    right: isMobileWeb ? -50 : -100,
  },
  decoCircle3: {
    position: 'absolute',
    width: isMobileWeb ? 120 : 240,
    height: isMobileWeb ? 120 : 240,
    borderRadius: isMobileWeb ? 60 : 120,
    backgroundColor: colors.greenBright + '20',
    top: isMobileWeb ? 40 : 80,
    right: isMobileWeb ? -30 : -60,
  },
  titleDecorator: {
    width: isMobileWeb ? 40 : 60,
    height: isMobileWeb ? 3 : 4,
    backgroundColor: colors.info,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: isMobileWeb ? 16 : 24,
  },
  sectionAltBackground: {
    backgroundColor: colors.backgroundSecondary,
  },
  emphasis: {
    fontWeight: '800',
    color: colors.info,
  },
  visionHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isMobileWeb ? 16 : 24,
    marginTop: isMobileWeb ? 20 : 32,
    width: '100%',
  },
  visionHighlight: {
    flex: 1,
    minWidth: isMobileWeb ? 140 : 200,
    maxWidth: isMobileWeb ? '100%' : 250,
    alignItems: 'center',
    padding: isMobileWeb ? 16 : 24,
    gap: isMobileWeb ? 8 : 12,
  },
  visionHighlightText: {
    fontSize: isMobileWeb ? 13 : 16,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  problemsContent: {
    gap: isMobileWeb ? 20 : 32,
    marginTop: isMobileWeb ? 16 : 24,
    width: '100%',
  },
  problemCard: {
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 16 : 24,
    padding: isMobileWeb ? 20 : 32,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: isMobileWeb ? 12 : 16,
  },
  problemIcon: {
    marginBottom: isMobileWeb ? 12 : 16,
    alignSelf: 'center',
  },
  problemTitle: {
    fontSize: isMobileWeb ? 18 : 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: isMobileWeb ? 12 : 16,
    letterSpacing: -0.3,
  },
  problemText: {
    fontSize: isMobileWeb ? 14 : 18,
    color: colors.textSecondary,
    lineHeight: isMobileWeb ? 20 : 28,
    textAlign: 'right',
    fontWeight: '400',
  },
  whoContent: {
    width: '100%',
    maxWidth: isTablet ? 900 : '100%',
    alignSelf: 'center',
  },
  whoMainCard: {
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 16 : 24,
    padding: isMobileWeb ? 24 : 40,
    borderWidth: 2,
    borderColor: colors.info,
    shadowColor: colors.info,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
    marginBottom: isMobileWeb ? 20 : 32,
  },
  whoMainIcon: {
    marginBottom: isMobileWeb ? 16 : 24,
  },
  whoFutureCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: isMobileWeb ? 12 : 20,
    padding: isMobileWeb ? 20 : 28,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  whoFutureIcon: {
    marginBottom: isMobileWeb ? 12 : 16,
    opacity: 0.6,
  },
  whoFutureTitle: {
    fontSize: isMobileWeb ? 16 : 20,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: isMobileWeb ? 8 : 12,
  },
  whoFutureText: {
    fontSize: isMobileWeb ? 13 : 16,
    color: colors.textSecondary,
    lineHeight: isMobileWeb ? 18 : 24,
    textAlign: 'center',
    fontWeight: '400',
  },
  githubLinkContainer: {
    marginTop: isMobileWeb ? 24 : 32,
    width: '100%',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  },
  githubLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 16 : 20,
    padding: isMobileWeb ? 20 : 28,
    borderWidth: 2,
    borderColor: colors.info,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    gap: isMobileWeb ? 12 : 16,
  },
  githubLinkTextContainer: {
    flex: 1,
    gap: isMobileWeb ? 4 : 6,
  },
  githubLinkTitle: {
    fontSize: isMobileWeb ? 16 : 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: isMobileWeb ? 4 : 6,
  },
  githubLinkDescription: {
    fontSize: isMobileWeb ? 13 : 16,
    color: colors.textSecondary,
    lineHeight: isMobileWeb ? 18 : 24,
    fontWeight: '400',
  },
  mottoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isMobileWeb ? 16 : 24,
    marginTop: isMobileWeb ? 20 : 32,
    marginBottom: isMobileWeb ? 20 : 32,
    width: '100%',
  },
  mottoCard: {
    flex: 1,
    minWidth: isMobileWeb ? 140 : 280,
    maxWidth: isMobileWeb ? '100%' : 400,
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 16 : 24,
    padding: isMobileWeb ? 20 : 32,
    borderWidth: 2,
    borderColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobileWeb ? 12 : 16,
    shadowColor: colors.info,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  mottoIcon: {
    marginBottom: isMobileWeb ? 4 : 8,
  },
  mottoText: {
    fontSize: isMobileWeb ? 16 : 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: isMobileWeb ? 22 : 30,
  },
  coreMottosContainer: {
    marginTop: isMobileWeb ? 20 : 32,
    width: '100%',
    maxWidth: isTablet ? 900 : '100%',
    alignSelf: 'center',
    gap: isMobileWeb ? 20 : 28,
  },
  hierarchyContainer: {
    marginTop: isMobileWeb ? 16 : 24,
    width: '100%',
    maxWidth: isTablet ? 900 : '100%',
    alignSelf: 'center',
  },
  coreMottoItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: isMobileWeb ? 12 : 16,
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 16 : 24,
    padding: isMobileWeb ? 20 : 32,
    borderWidth: 2,
    borderColor: colors.backgroundTertiary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  coreMottoIcon: {
    marginLeft: isMobileWeb ? 8 : 12,
    flexShrink: 0,
  },
  coreMottoText: {
    fontSize: isMobileWeb ? 16 : (isWeb ? (isTablet ? 22 : 20) : 24),
    color: colors.textPrimary,
    textAlign: 'right',
    fontWeight: '700',
    lineHeight: isMobileWeb ? 24 : (isWeb ? 32 : 36),
    fontStyle: 'italic',
    flex: 1,
  },
  stepNumberBadge: {
    position: 'absolute',
    top: isMobileWeb ? -12 : -16,
    right: isMobileWeb ? 16 : 24,
    width: isMobileWeb ? 32 : 40,
    height: isMobileWeb ? 32 : 40,
    borderRadius: isMobileWeb ? 16 : 20,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stepNumber: {
    fontSize: isMobileWeb ? 16 : 20,
    fontWeight: '900',
    color: colors.white,
  },
  stepIcon: {
    marginTop: isMobileWeb ? 12 : 16,
    marginBottom: isMobileWeb ? 12 : 16,
  },
  statChevron: {
    position: 'absolute',
    bottom: isMobileWeb ? 12 : 16,
    left: isMobileWeb ? 12 : 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileWeb ? 16 : 24,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 16 : 24,
    width: '100%',
    maxWidth: isTablet ? 800 : (isMobileWeb ? '95%' : 600),
    maxHeight: '85%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobileWeb ? 16 : 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
    backgroundColor: colors.backgroundTertiary,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobileWeb ? 12 : 16,
    flex: 1,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: isMobileWeb ? 18 : 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: isMobileWeb ? 4 : 6,
  },
  modalSubtitle: {
    fontSize: isMobileWeb ? 14 : 18,
    fontWeight: '600',
    color: colors.info,
  },
  modalCloseButton: {
    padding: isMobileWeb ? 4 : 8,
    marginRight: isMobileWeb ? -4 : -8,
  },
  modalContent: {
    flex: 1,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isMobileWeb ? 40 : 60,
  },
  modalLoadingText: {
    marginTop: isMobileWeb ? 12 : 16,
    fontSize: isMobileWeb ? 14 : 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isMobileWeb ? 40 : 60,
  },
  modalEmptyText: {
    marginTop: isMobileWeb ? 16 : 24,
    fontSize: isMobileWeb ? 16 : 20,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailList: {
    padding: isMobileWeb ? 16 : 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: isMobileWeb ? 12 : 16,
    paddingHorizontal: isMobileWeb ? 12 : 16,
    borderRadius: isMobileWeb ? 12 : 16,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: isMobileWeb ? 8 : 12,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
  },
  detailItemNumber: {
    fontSize: isMobileWeb ? 14 : 18,
    fontWeight: '700',
    color: colors.info,
    marginLeft: isMobileWeb ? 8 : 12,
    minWidth: isMobileWeb ? 24 : 32,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemText: {
    fontSize: isMobileWeb ? 14 : 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: isMobileWeb ? 4 : 6,
    lineHeight: isMobileWeb ? 20 : 24,
  },
  detailItemSubtext: {
    fontSize: isMobileWeb ? 12 : 14,
    color: colors.textSecondary,
    lineHeight: isMobileWeb ? 16 : 20,
    marginTop: isMobileWeb ? 2 : 4,
  },
  howItWorksNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobileWeb ? 10 : 14,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: isMobileWeb ? 12 : 16,
    padding: isMobileWeb ? 16 : 24,
    marginTop: isMobileWeb ? 24 : 32,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
    width: '100%',
    maxWidth: isTablet ? 800 : '100%',
    alignSelf: 'center',
  },
  howItWorksNoteText: {
    flex: 1,
    fontSize: isMobileWeb ? 14 : 18,
    color: colors.textPrimary,
    lineHeight: isMobileWeb ? 20 : 26,
    fontWeight: '500',
  },
  // Donation Modal Styles
  donationModalContainer: {
    backgroundColor: colors.white,
    borderRadius: isMobileWeb ? 20 : 28,
    width: '100%',
    maxWidth: isTablet ? 500 : (isMobileWeb ? '90%' : 450),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  donationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobileWeb ? 20 : 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
    backgroundColor: colors.backgroundTertiary,
  },
  donationModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobileWeb ? 12 : 16,
    flex: 1,
  },
  donationModalTitleContainer: {
    flex: 1,
  },
  donationModalTitle: {
    fontSize: isMobileWeb ? 20 : 28,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: isMobileWeb ? 4 : 6,
  },
  donationModalSubtitle: {
    fontSize: isMobileWeb ? 14 : 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  donationModalContent: {
    padding: isMobileWeb ? 20 : 28,
  },
  donationMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: isMobileWeb ? 12 : 16,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: isMobileWeb ? 12 : 16,
    padding: isMobileWeb ? 16 : 20,
    marginBottom: isMobileWeb ? 20 : 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  donationMessageText: {
    flex: 1,
    fontSize: isMobileWeb ? 15 : 18,
    color: colors.textPrimary,
    lineHeight: isMobileWeb ? 22 : 26,
    fontWeight: '600',
  },
  donationButtonsContainer: {
    flexDirection: 'row',
    gap: isMobileWeb ? 10 : 16,
    marginBottom: isMobileWeb ? 16 : 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  donationButton: {
    flex: 1,
    minWidth: isMobileWeb ? 100 : 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobileWeb ? 8 : 12,
    paddingVertical: isMobileWeb ? 14 : 18,
    paddingHorizontal: isMobileWeb ? 16 : 20,
    borderRadius: isMobileWeb ? 12 : 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  donationButtonWhatsApp: {
    backgroundColor: colors.success,
  },
  donationButtonBit: {
    backgroundColor: colors.info,
  },
  donationButtonPayBox: {
    backgroundColor: colors.primary,
  },
  donationButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: isMobileWeb ? 14 : 18,
    letterSpacing: 0.3,
  },
  donationNoteText: {
    fontSize: isMobileWeb ? 13 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: isMobileWeb ? 18 : 24,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  donationCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobileWeb ? 8 : 12,
    backgroundColor: colors.secondary,
    paddingVertical: isMobileWeb ? 14 : 18,
    paddingHorizontal: isMobileWeb ? 24 : 32,
    borderRadius: isMobileWeb ? 12 : 16,
    marginTop: isMobileWeb ? 20 : 28,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  donationCtaButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: isMobileWeb ? 16 : 20,
    letterSpacing: 0.3,
  },
  donationCtaButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobileWeb ? 8 : 12,
    backgroundColor: colors.secondary,
    paddingVertical: isMobileWeb ? 12 : 18,
    paddingHorizontal: isMobileWeb ? 16 : 28,
    borderRadius: isMobileWeb ? 12 : 16,
    minWidth: isMobileWeb ? 140 : 200,
    marginBottom: isMobileWeb ? 16 : 20,
    alignSelf: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  donationCtaButtonTextTop: {
    color: colors.white,
    fontWeight: '800',
    fontSize: isMobileWeb ? 13 : 18,
    letterSpacing: 0.3,
  },
});

export default LandingSiteScreen;



