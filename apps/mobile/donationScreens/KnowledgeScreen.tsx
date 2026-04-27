import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useUser } from '../stores/userStore';
import HeaderComp from '../components/HeaderComp';
import AddLinkComponent from '../components/AddLinkComponent';
import ScrollContainer from '../components/ScrollContainer';
import { apiService } from '../utils/apiService';
import { mapKnowledgeContributionApiError } from '../components/knowledgeDonationApiMessages';
import { logger } from '../utils/loggerService';
import { toastService, useToast } from '../utils/toastService';
import { postsService } from '../utils/postsService';
import { mapPostToFeedItemForItemsScreen } from './items/mapPostToFeedItemForItemsScreen';
import type { FeedItem } from '../types/feed';
import PostReelItem from '../components/Feed/PostReelItem';
import { usePostMenu } from '../hooks/usePostMenu';
import OptionsModal from '../components/Feed/OptionsModal';
import ReportPostModal from '../components/Feed/ReportPostModal';
import { usePostComposerStore } from '../stores/postComposerStore';
import { useTranslation } from 'react-i18next';

type KnowledgeLinkRow = {
  id: string;
  url: string;
  description: string | null;
  linkType: string;
};

export default function KnowledgeScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const route = useRoute();
  const routeParams = route.params as { mode?: string } | undefined;

  const { ToastComponent } = useToast();
  const { t: ti } = useTranslation('items');
  const { t: tc } = useTranslation('common');
  const { selectedUser, isAuthenticated, isGuestMode, isAdmin } = useUser();
  const { openComposer } = usePostComposerStore();
  const [openRequestsExpanded, setOpenRequestsExpanded] = useState(false);
  const [openRequestPosts, setOpenRequestPosts] = useState<FeedItem[]>([]);
  const [openRequestsLoading, setOpenRequestsLoading] = useState(false);

  const initialMode = routeParams?.mode === 'offer' ? true : false;
  const [mode, setMode] = useState(initialMode);
  const defaultSearchParamApplied = useRef(false);

  const [knowledgeOfferMessage, setKnowledgeOfferMessage] = useState('');
  const [knowledgeOfferSending, setKnowledgeOfferSending] = useState(false);

  const [communityLinks, setCommunityLinks] = useState<KnowledgeLinkRow[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);

  const loadOpenKnowledgeRequests = useCallback(async () => {
    setOpenRequestsLoading(true);
    try {
      const uid = selectedUser?.id || 'guest';
      const openPostsResponse = await postsService.getPosts(300, 0, uid);
      if (openPostsResponse.success && Array.isArray(openPostsResponse.data)) {
        const requestPosts = openPostsResponse.data
          .map(mapPostToFeedItemForItemsScreen)
          .filter((post: FeedItem | null): post is FeedItem => Boolean(post))
          .filter((post) => post.intent === 'request' && post.category === 'knowledge');
        setOpenRequestPosts(requestPosts);
      } else {
        setOpenRequestPosts([]);
      }
    } catch {
      setOpenRequestPosts([]);
    } finally {
      setOpenRequestsLoading(false);
    }
  }, [selectedUser?.id]);

  const handleReportSubmit = async (_reason: string) => {
    if (!selectedPostForReport) return;
    setReportModalVisible(false);
    setSelectedPostForReport(null);
  };

  const handlePostClosed = useCallback((postId: string) => {
    setOpenRequestPosts((prev) => prev.filter((p) => p.id !== postId));
    setTimeout(() => {
      void loadOpenKnowledgeRequests();
    }, 100);
  }, [loadOpenKnowledgeRequests]);

  const {
    handleMorePress,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    selectedPostForReport,
    setSelectedPostForReport,
  } = usePostMenu({
    onReopen: () => {
      void loadOpenKnowledgeRequests();
    },
  });

  const loadCommunityLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      const res = await apiService.getKnowledgeCommunityLinks();
      if (res.success && Array.isArray(res.data)) {
        setCommunityLinks(
          res.data.map((row: any) => ({
            id: row.id,
            url: row.url,
            description: row.description ?? null,
            linkType: row.linkType || 'group',
          })),
        );
      } else {
        setCommunityLinks([]);
        if (res.success === false && res.error) {
          toastService.showError(res.error);
        }
      }
    } catch {
      setCommunityLinks([]);
      toastService.showError('לא ניתן לטעון את רשימת הקישורים');
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!mode) {
        void loadCommunityLinks();
      } else {
        void loadOpenKnowledgeRequests();
      }
    }, [mode, loadCommunityLinks, loadOpenKnowledgeRequests]),
  );

  useEffect(() => {
    const raw = routeParams?.mode;
    const invalid =
      raw === undefined ||
      raw === null ||
      raw === '' ||
      raw === 'undefined' ||
      raw === 'null';

    if (raw === 'offer') {
      defaultSearchParamApplied.current = false;
      setMode(true);
      return;
    }

    if (raw === 'search') {
      defaultSearchParamApplied.current = false;
      setMode(false);
      return;
    }

    if (invalid) {
      setMode(false);
      if (!defaultSearchParamApplied.current) {
        defaultSearchParamApplied.current = true;
        (navigation as { setParams: (p: object) => void }).setParams({ mode: 'search' });
      }
      return;
    }

    defaultSearchParamApplied.current = false;
    setMode(false);
  }, [routeParams?.mode, navigation]);

  const handleToggleMode = useCallback(() => {
    const next = !mode;
    setMode(next);
    (navigation as { setParams: (p: object) => void }).setParams({
      mode: next ? 'offer' : 'search',
    });
  }, [mode, navigation]);

  const noopSearch = useCallback(() => {}, []);

  const submitKnowledgeOfferRequest = useCallback(async () => {
    if (!isAuthenticated || isGuestMode) {
      toastService.showError('התחברו כדי לשלוח בקשה.');
      return;
    }
    if (!selectedUser?.id) {
      toastService.showError('לא ניתן לזהות את המשתמש. נסו להתחבר מחדש.');
      return;
    }

    setKnowledgeOfferSending(true);
    logger.debug('KnowledgeScreen', 'Submitting knowledge contribution request', {
      messageLen: knowledgeOfferMessage.trim().length,
    });
    try {
      const res = await apiService.createKnowledgeContributionRequest({
        message: knowledgeOfferMessage.trim() || undefined,
      });

      if (res.success) {
        const taskId =
          res.data && typeof res.data === 'object' && 'id' in res.data
            ? String((res.data as { id?: string }).id ?? '')
            : '';
        logger.info('KnowledgeScreen', 'Knowledge contribution request created', {
          taskId: taskId || undefined,
        });
        setKnowledgeOfferMessage('');
        toastService.showSuccess(
          'נוצרה משימה במסך ניהול המשימות למנהלים. ניצור אתכם קשר בהקדם.',
          3500,
        );
        return;
      }

      logger.error('KnowledgeScreen', 'Knowledge contribution request rejected', {
        error: res.error,
      });
      toastService.showError(mapKnowledgeContributionApiError(res.error), 4000);
    } catch (e) {
      logger.error('KnowledgeScreen', 'Knowledge offer request failed', {
        err: e instanceof Error ? e.message : String(e),
      });
      toastService.showError(
        mapKnowledgeContributionApiError(
          e instanceof Error ? e.message : 'Network error - please check your connection',
        ),
        3500,
      );
    } finally {
      setKnowledgeOfferSending(false);
    }
  }, [isAuthenticated, isGuestMode, knowledgeOfferMessage, selectedUser?.id]);

  const openCommunityLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else toastService.showError('לא ניתן לפתוח את הקישור');
    } catch {
      toastService.showError('לא ניתן לפתוח את הקישור');
    }
  };

  const confirmDeleteLink = (link: KnowledgeLinkRow) => {
    Alert.alert('מחיקת קישור', 'למחוק את הקישור מהרשימה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          const res = await apiService.deleteKnowledgeCommunityLink(link.id);
          if (res.success) {
            toastService.showSuccess('הקישור נמחק');
            await loadCommunityLinks();
          } else {
            toastService.showError(res.error || 'מחיקה נכשלה');
          }
        },
      },
    ]);
  };

  const headerPlaceholder = mode
    ? 'מצב מציע: הוסיפו קישור או שלחו בקשת תרומת ידע'
    : 'מצב מחפש: קישורים שתרמה הקהילה';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <HeaderComp
        // ModeToggleButton uses legacy inverted styling; KnowledgeScreen keeps true=offer/search in URL.
        mode={!mode}
        menuOptions={[]}
        onToggleMode={handleToggleMode}
        onSelectMenuItem={() => {}}
        title=""
        placeholder={headerPlaceholder}
        filterOptions={[]}
        sortOptions={[]}
        searchData={[]}
        onSearch={noopSearch}
        hideSortButton
      />

      <ScrollContainer
        style={styles.scrollView}
        contentStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!mode ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.requestCtaButton}
              onPress={() => openComposer({ intent: 'request', category: 'knowledge' })}
              activeOpacity={0.85}
            >
              <Text style={styles.requestCtaText}>{ti('donationScreen.search.requestCta')}</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>ידע שתרמה הקהילה</Text>
            <Text style={styles.sectionDescription}>
              קישורים שהוסיפו משתמשים — אין צורך באישור מנהל לפרסום.
            </Text>
            {linksLoading ? (
              <ActivityIndicator style={styles.loader} color={colors.secondary} />
            ) : communityLinks.length === 0 ? (
              <Text style={styles.emptyText}>עדיין אין קישורים. עברו למצב מציע כדי להוסיף.</Text>
            ) : (
              communityLinks.map((link) => (
                <View key={link.id} style={styles.linkRow}>
                  <TouchableOpacity
                    style={styles.linkRowMain}
                    onPress={() => openCommunityLink(link.url)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={link.linkType === 'organization' ? 'business' : 'link'}
                      size={20}
                      color={colors.secondary}
                    />
                    <View style={styles.linkRowText}>
                      {link.description ? (
                        <Text style={styles.linkTitle} numberOfLines={2}>
                          {link.description}
                        </Text>
                      ) : null}
                      <Text style={styles.linkUrl} numberOfLines={1}>
                        {link.url}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {isAdmin ? (
                    <TouchableOpacity
                      style={styles.linkDeleteWrap}
                      onPress={() => confirmDeleteLink(link)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={22} color={colors.destructiveAction} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.openRequestsToggle}
              onPress={() => setOpenRequestsExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>{ti('donationScreen.offer.openRequestsList')}</Text>
              <Text style={styles.toggleChevron}>{openRequestsExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {openRequestsExpanded && (
              <View style={styles.openRequestsBlock}>
                {openRequestsLoading ? (
                  <ActivityIndicator style={styles.loader} color={colors.secondary} />
                ) : openRequestPosts.length === 0 ? (
                  <Text style={styles.emptyText}>{ti('donationScreen.offer.noOpenRequests')}</Text>
                ) : (
                  openRequestPosts.map((post) => {
                    const { width } = Dimensions.get('window');
                    const cardWidth = width - 80;
                    return (
                      <View key={post.id} style={styles.openRequestRow}>
                        <PostReelItem
                          item={post}
                          cardWidth={cardWidth}
                          numColumns={1}
                          onPress={() => {}}
                          onCommentPress={() => {}}
                          onMorePress={handleMorePress}
                          onPostClosed={handlePostClosed}
                        />
                      </View>
                    );
                  })
                )}
              </View>
            )}
            <Text style={styles.sectionTitle}>הוספת קישור</Text>
            <Text style={styles.sectionDescription}>
              כל אחד יכול להוסיף קישור; מנהלים יכולים למחוק קישורים לא מתאימים במצב מחפש.
            </Text>
            <AddLinkComponent
              category="knowledge"
              hideLinksList
              onLinkAdded={() => {
                void loadCommunityLinks();
              }}
            />

            <Text style={[styles.sectionTitle, styles.offerTitleSpacing]}>רוצים לתרום ידע?</Text>
            <Text style={styles.sectionDescription}>
              שלחו לנו הודעה קצרה וניצור אתכם קשר. בהמשך יתאפשר גם להעלות קבצים, סרטון או טקסט ישירות
              מהאפליקציה.
            </Text>
            <View style={styles.offerCard}>
              <TextInput
                style={styles.offerInput}
                placeholder="מה תרצו לתרום? (נושא, ניסיון, זמינות…)"
                placeholderTextColor={colors.textSecondary}
                value={knowledgeOfferMessage}
                onChangeText={setKnowledgeOfferMessage}
                multiline
                maxLength={4000}
                textAlignVertical="top"
                editable={!knowledgeOfferSending}
              />
              <Text style={styles.offerHint}>
                הבקשה נרשמת כמשימה במסך ניהול המשימות (כותרת: בקשה לתרומת מידע) עם פרטיכם ותוכן
                ההודעה.
              </Text>
              <TouchableOpacity
                style={[styles.offerButton, knowledgeOfferSending && styles.offerButtonDisabled]}
                onPress={submitKnowledgeOfferRequest}
                disabled={knowledgeOfferSending}
                activeOpacity={0.85}
              >
                {knowledgeOfferSending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color={colors.white} style={styles.offerButtonIcon} />
                    <Text style={styles.offerButtonText}>שליחת בקשה למנהל הקהילה</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollContainer>

      <OptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        options={modalOptions}
        title={tc('options')}
        anchorPosition={modalPosition}
      />
      <ReportPostModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        isLoading={false}
      />
      {ToastComponent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    paddingBottom: 48,
  },
  section: {
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  offerTitleSpacing: {
    marginTop: 28,
  },
  sectionDescription: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 20,
  },
  loader: {
    marginVertical: 24,
  },
  emptyText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  linkRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 10,
  },
  linkRowText: {
    flex: 1,
  },
  linkTitle: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
  },
  linkDeleteWrap: {
    padding: 10,
  },
  offerCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: 12,
  },
  offerHint: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  offerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  offerButtonDisabled: {
    opacity: 0.7,
  },
  offerButtonIcon: {
    marginRight: 8,
  },
  offerButtonText: {
    color: colors.white,
    fontSize: FontSizes.body,
    fontWeight: '600',
  },
  requestCtaButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  requestCtaText: {
    color: colors.background,
    fontSize: FontSizes.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  openRequestsToggle: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  toggleChevron: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  openRequestsBlock: {
    marginBottom: 20,
  },
  openRequestRow: {
    marginBottom: 10,
    width: '100%',
  },
});
