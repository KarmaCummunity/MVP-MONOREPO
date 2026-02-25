// File overview:
// - Purpose: Unified global search across donations, rides, users, and hashtags.
// - Reached from: `SearchTabStack` initial route 'SearchScreen'.
// - Provides: Real-time search with tabs for different entities, debounced input, and detailed result cards.
// - Reads from: `enhancedDatabaseService`, `apiService`.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    Alert,
    SafeAreaView,
    ActivityIndicator,
    TextInput,
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import { useUser } from '../stores/userStore';
import { enhancedDB } from '../utils/enhancedDatabaseService';
import { apiService } from '../utils/apiService';
import { scaleSize } from '../globals/responsive';
import { createShadowStyle } from '../globals/styles';
import ItemDetailsModal from '../components/ItemDetailsModal';
import { useToast } from '../utils/toastService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Simple debounce implementation
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
    let timeout: any;
    return function (this: any, ...args: Parameters<T>) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

type SearchTab = 'All' | 'Rides' | 'Donations' | 'Users' | 'Hashtags';

interface SearchResult {
    id: string;
    type: 'ride' | 'donation' | 'user' | 'hashtag';
    title: string;          // Ride: from->to, Donation: title, User: name
    subtitle?: string;      // Ride: date/time, Donation: category, User: bio
    description?: string;   // Ride: notes, Donation: description
    image?: string;         // Avatar or Item image
    meta?: string;          // Extra info (seats, location, etc.)
    highlight?: boolean;
    rawData: any;           // Original object for navigation/details
}

const SearchScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const tabBarHeight = useBottomTabBarHeight();
    const { t } = useTranslation(['search', 'common', 'donations', 'trump']);
    const { selectedUser } = useUser();
    const { ToastComponent } = useToast();

    // Get initial query from route params (from deep link)
    const routeParams = route.params as { q?: string } | undefined;
    const initialQuery = routeParams?.q || '';

    const [query, setQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<SearchTab>('All');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false); // To show "start typing" vs "no results"
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [showItemModal, setShowItemModal] = useState(false);
    const [selectedItemType, setSelectedItemType] = useState<'item' | 'ride'>('item');

    const searchInputRef = useRef<TextInput>(null);

    // Update query when route params change (e.g., from deep link)
    useEffect(() => {
        if (routeParams?.q && routeParams.q !== query) {
            setQuery(routeParams.q);
        }
    }, [routeParams?.q, query]);

    // Tabs configuration
    const tabs: { id: SearchTab; label: string; icon: any }[] = [
        { id: 'All', label: t('search:tabs.all'), icon: 'grid-outline' },
        { id: 'Rides', label: t('trump:menu.history'), icon: 'car-sport-outline' }, // Using history label as approximation or custom
        { id: 'Donations', label: t('search:tabs.donations'), icon: 'heart-outline' },
        { id: 'Users', label: t('search:tabs.users'), icon: 'people-outline' },
        { id: 'Hashtags', label: '#', icon: 'pricetag-outline' },
    ];

    // --- Search Logic ---

    const performSearch = async (searchQuery: string, tab: SearchTab) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setHasSearched(false);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        setHasSearched(true);

        // Slight delay to allow UI to update (spinner)
        // await new Promise(r => setTimeout(r, 100));

        try {
            const promises: Promise<SearchResult[]>[] = [];
            const qLower = searchQuery.toLowerCase();

            // 1. Rides
            if (tab === 'All' || tab === 'Rides') {
                // Fetch rides - ideally backend supports search. If not, fetch active and filter.
                // Assuming enahncedDatabaseService.getRides supports basic filters or we fetch all active.
                promises.push(
                    enhancedDB.getRides({}).then(rides => {
                        return rides
                            .filter(r => {
                                // Client-side filter if backend didn't filter
                                const from = (r.from || '').toLowerCase();
                                const to = (r.to || '').toLowerCase();
                                return from.includes(qLower) || to.includes(qLower);
                            })
                            .map(r => ({
                                id: r.id,
                                type: 'ride' as const,
                                title: `${r.from} ➝ ${r.to}`,
                                subtitle: `${new Date((r.departure_time || r.date) as any).toLocaleDateString()} ${new Date((r.departure_time || r.time) as any).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                                description: r.description as string,
                                image: (r.driverImage as any) || undefined,
                                meta: `${r.available_seats} מושבים`,
                                rawData: r
                            }));
                    }).catch(e => {
                        console.warn('Search rides failed', e);
                        return [];
                    })
                );
            }

            // 2. Donations
            if (tab === 'All' || tab === 'Donations') {
                promises.push(
                    enhancedDB.getDonations({ search: searchQuery }).then(donations => {
                        return donations.map(d => ({
                            id: d.id,
                            type: 'donation',
                            title: d.title,
                            subtitle: d.category,
                            description: d.description,
                            image: (d as any).image, // Assuming image property exists
                            meta: d.location || (d as any).city,
                            rawData: d
                        }));
                    }).catch(e => {
                        console.warn('Search donations failed', e);
                        return [];
                    })
                );
            }

            // 3. Users
            if (tab === 'All' || tab === 'Users') {
                promises.push(
                    apiService.getUsers({ search: searchQuery }).then(res => {
                        if (!res.success || !res.data) return [];
                        // Assuming res.data.users or res.data is array
                        const users = Array.isArray(res.data) ? res.data : (res.data as any).users || [];
                        return users.map((u: any) => ({
                            id: u.id,
                            type: 'user',
                            title: u.name || t('search:typeLabels.user'),
                            subtitle: u.role || u.bio || t('search:userDefaultBio'),
                            image: u.avatar || u.image,
                            meta: 'חבר קהילה',
                            rawData: u
                        }));
                    }).catch(e => {
                        console.warn('Search users failed', e);
                        return [];
                    })
                );
            }

            // 4. Hashtags (Mock implementation for now or extraction)
            if (tab === 'All' || tab === 'Hashtags') {
                // Logic: If query starts with #, strict search. 
                // Else, maybe we search for tags that match the query?
                // For MVP, we can simulate hashtag results if the query *looks* like a tag or if we want to show tags used in descriptions.
                // Let's just return a generic result if query matches a pattern, or skip for now if no dedicated API.
                if (searchQuery.startsWith('#') || tab === 'Hashtags') {
                    const cleanTag = searchQuery.replace('#', '');
                    if (cleanTag.length > 1) {
                        promises.push(Promise.resolve([{
                            id: `tag_${cleanTag}`,
                            type: 'hashtag',
                            title: `#${cleanTag}`,
                            subtitle: 'חפש פוסטים ותרומות עם תגית זו',
                            rawData: { tag: cleanTag }
                        }] as SearchResult[]));
                    }
                }
            }

            // Execute all
            const resultsArrays = await Promise.all(promises);
            const flattened = resultsArrays.flat();

            // Sort: Exact matches first? Or just simple shuffle/mix? 
            // Let's sort Users > Donations > Rides for 'All'? Or shuffle.
            // Simple sort by title match relevance
            flattened.sort((a, b) => {
                const aStarts = a.title.toLowerCase().startsWith(qLower);
                const bStarts = b.title.toLowerCase().startsWith(qLower);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return 0;
            });

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setResults(flattened);

        } catch (err) {
            console.error('Global search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Debounce the search
    const debouncedSearch = useCallback(
        debounce((nextQuery: string, nextTab: SearchTab) => {
            performSearch(nextQuery, nextTab);
        }, 600),
        []
    );

    useEffect(() => {
        // Determine title for Rides tab if 'Rides' is selected (using translation fallback if 'trump' namespace incomplete)
        // We already defined tabs array outside.
    }, []);

    // Trigger search when query comes from URL (deep link)
    // This effect runs after performSearch is defined
    useEffect(() => {
        if (routeParams?.q && routeParams.q.trim()) {
            // Query came from URL, trigger search immediately
            // Only if it's different from current query to avoid infinite loops
            if (routeParams.q !== query) {
                setQuery(routeParams.q);
                performSearch(routeParams.q, activeTab);
            }
        }
    }, [routeParams?.q, activeTab]);

    const handleTextChange = (text: string) => {
        setQuery(text);
        debouncedSearch(text, activeTab);
    };

    const handleTabChange = (newTab: SearchTab) => {
        setActiveTab(newTab);
        if (query.trim()) {
            // Trigger immediate search (or fast debounce) on tab switch
            setIsSearching(true); // show loader immediately
            performSearch(query, newTab);
        }
    };

    // --- Render Helpers ---

    const renderIconForType = (type: string) => {
        switch (type) {
            case 'ride': return 'car-sport';
            case 'donation': return 'heart';
            case 'user': return 'person';
            case 'hashtag': return 'pricetag';
            default: return 'search';
        }
    };

    const renderColorForType = (type: string) => {
        switch (type) {
            case 'ride': return colors.info;
            case 'donation': return colors.pink;
            case 'user': return colors.warning;
            case 'hashtag': return colors.textSecondary;
            default: return colors.primary;
        }
    };

    const handleResultPress = (item: SearchResult) => {
        // Open modal for rides and donations (items)
        if (item.type === 'ride' || item.type === 'donation') {
            setSelectedItem(item.rawData);
            setSelectedItemType(item.type === 'ride' ? 'ride' : 'item');
            setShowItemModal(true);
        } else if (item.type === 'user') {
            // Navigate to user profile
            navigation.navigate('UserProfileScreen', {
                userId: item.rawData.id,
                userName: item.rawData.name || item.title,
                characterData: item.rawData
            });
        } else if (item.type === 'hashtag') {
            // For hashtags, show alert for now
            Alert.alert(
                item.title,
                `${item.description || ''}\n\n${item.subtitle || ''}`,
                [
                    { text: t('common:close'), style: 'cancel' }
                ]
            );
        }
    };

    const renderItem = ({ item }: { item: SearchResult }) => (
        <TouchableOpacity
            style={styles.resultCard}
            onPress={() => handleResultPress(item)}
            activeOpacity={0.7}
        >
            {/* Icon or Image */}
            <View style={styles.imageContainer}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.resultImage} />
                ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: renderColorForType(item.type) + '15' }]}>
                        <Ionicons name={renderIconForType(item.type) as any} size={24} color={renderColorForType(item.type)} />
                    </View>
                )}
                {/* Type Icon Badge (small overlay) */}
                {!item.image && item.type !== 'hashtag' && (
                    <View style={styles.typeBadge}>
                        <Ionicons name={renderIconForType(item.type) as any} size={10} color={colors.white} />
                    </View>
                )}
            </View>

            <View style={styles.resultContent}>
                <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                    {item.meta && <Text style={styles.resultMeta}>{item.meta}</Text>}
                </View>

                {item.subtitle && (
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {item.subtitle}
                    </Text>
                )}

                {item.description && (
                    <Text style={styles.resultDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}
            </View>

            <Ionicons name="chevron-back" size={18} color={colors.textTertiary} style={{ transform: [{ scaleX: -1 }] }} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header & Search Bar */}
            <View style={styles.header}>
                <Text style={styles.screenTitle}>{t('common:search')}</Text>

                <View style={styles.searchBarContainer}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        placeholder={t('search:ai.placeholder') || "חפש הכל..."}
                        placeholderTextColor={colors.textTertiary}
                        value={query}
                        onChangeText={handleTextChange}
                        returnKeyType="search"
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => handleTextChange('')} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Categories / Tabs */}
                <View style={styles.tabsContainer}>
                    <FlatList
                        horizontal
                        data={tabs}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContent}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            const isActive = activeTab === item.id;
                            return (
                                <TouchableOpacity
                                    style={[styles.tabItem, isActive && styles.activeTabItem]}
                                    onPress={() => handleTabChange(item.id)}
                                >
                                    <Ionicons
                                        name={item.icon}
                                        size={16}
                                        color={isActive ? colors.white : colors.textSecondary}
                                    />
                                    <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                {isSearching ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.pink} />
                        <Text style={styles.loadingText}>{t('search:searching')}</Text>
                    </View>
                ) : !hasSearched && !query ? (
                    // Initial State
                    <View style={styles.initialStateContainer}>
                        <Ionicons name="search-outline" size={60} color={colors.border} />
                        <Text style={styles.initialStateText}>{t('search:tryChangingSearchTerms') || "התחל להקליד כדי לחפש..."}</Text>

                        {/* Quick Suggestions / Recent (Optional placeholder logic) */}
                        <View style={styles.suggestions}>
                            <Text style={styles.suggestionsTitle}>{t('search:popularTitle')}</Text>
                            <View style={styles.tagsRow}>
                                {['תל אביב', 'ריהוט', 'מתנדבים'].map(tag => (
                                    <TouchableOpacity key={tag} style={styles.suggestionTag} onPress={() => handleTextChange(tag)}>
                                        <Text style={styles.suggestionText}>{tag}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                ) : results.length === 0 ? (
                    // No Results
                    <View style={styles.centerContainer}>
                        <Image
                            source={require('../assets/images/favicon.png')} // Fallback or use a generic "empty" asset if available
                            style={[styles.emptyImage, { opacity: 0.3, width: 60, height: 60, tintColor: colors.textSecondary }]}
                        />
                        <Text style={styles.noResultsText}>{t('search:noResultsFound')}</Text>
                    </View>
                ) : (
                    // Results List
                    <FlatList
                        data={results}
                        renderItem={renderItem}
                        keyExtractor={(item) => `${item.type}_${item.id}`}
                        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* AI Chat Button */}
            <TouchableOpacity
                style={styles.aiButton}
                onPress={() => {
                    navigation.navigate('ChatDetailScreen', {
                        conversationId: 'ai_simulation',
                        userName: t('search:ai.title') || 'AI Assistant', // Use localized title
                        otherUserId: 'ai_bot',
                        userAvatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712027.png'
                    });
                }}
            >
                <Ionicons name="chatbubbles-outline" size={24} color={colors.white} />
                <Text style={styles.aiButtonText}>AI</Text>
            </TouchableOpacity>

            {/* Item Details Modal */}
            <ItemDetailsModal
                visible={showItemModal}
                onClose={() => {
                    setShowItemModal(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
                type={selectedItemType}
                navigation={navigation}
            />
            {ToastComponent}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundPrimary,
    },
    header: {
        paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
        paddingTop: LAYOUT_CONSTANTS.SPACING.MD,
        paddingBottom: LAYOUT_CONSTANTS.SPACING.SM,
        backgroundColor: colors.backgroundPrimary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    screenTitle: {
        fontSize: FontSizes.heading2,
        fontWeight: 'bold',
        marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
        color: colors.textPrimary,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
        paddingHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
        height: scaleSize(44),
        marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: {
        marginRight: LAYOUT_CONSTANTS.SPACING.SM,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSizes.body,
        color: colors.textPrimary,
        textAlign: 'right', // Hebrew support
        height: '100%',
    },
    clearButton: {
        padding: 4,
    },
    tabsContainer: {
        marginBottom: 4,
    },
    tabsContent: {
        gap: LAYOUT_CONSTANTS.SPACING.SM,
        paddingVertical: 4,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: colors.backgroundTertiary,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeTabItem: {
        backgroundColor: colors.pink,
        borderColor: colors.pink,
    },
    tabText: {
        marginLeft: 6,
        fontSize: FontSizes.small,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    activeTabText: {
        color: colors.white,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        backgroundColor: colors.backgroundPrimary, // slightly different bg for content
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: LAYOUT_CONSTANTS.SPACING.XL,
    },
    loadingText: {
        marginTop: LAYOUT_CONSTANTS.SPACING.MD,
        color: colors.textSecondary,
        fontSize: FontSizes.body,
    },
    initialStateContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: scaleSize(60),
        paddingHorizontal: LAYOUT_CONSTANTS.SPACING.XL,
    },
    initialStateText: {
        marginTop: LAYOUT_CONSTANTS.SPACING.MD,
        fontSize: FontSizes.heading3,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    suggestions: {
        marginTop: scaleSize(40),
        width: '100%',
    },
    suggestionsTitle: {
        fontSize: FontSizes.body,
        fontWeight: 'bold',
        marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
        color: colors.textPrimary,
        textAlign: 'left',
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    suggestionTag: {
        backgroundColor: colors.white,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        ...createShadowStyle(colors.shadowLight, { width: 0, height: 1 }, 0.05, 2),
    },
    suggestionText: {
        color: colors.textSecondary,
        fontSize: FontSizes.small,
    },
    emptyImage: {
        marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    },
    noResultsText: {
        fontSize: FontSizes.heading3,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    listContent: {
        padding: LAYOUT_CONSTANTS.SPACING.LG,
        gap: LAYOUT_CONSTANTS.SPACING.MD,
    },
    // Result Card
    resultCard: {
        flexDirection: 'row',
        backgroundColor: colors.cardBackground || colors.white,
        padding: LAYOUT_CONSTANTS.SPACING.MD,
        borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
        alignItems: 'center',
        ...createShadowStyle(colors.shadowLight, { width: 0, height: 2 }, 0.08, 4),
        borderWidth: 1,
        borderColor: colors.border,
    },
    imageContainer: {
        position: 'relative',
        marginRight: LAYOUT_CONSTANTS.SPACING.MD,
    },
    resultImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.backgroundTertiary,
    },
    placeholderImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiButton: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        backgroundColor: colors.pink,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        ...createShadowStyle(colors.shadowDark, { width: 0, height: 4 }, 0.2, 5),
        zIndex: 100,
    },
    aiButtonText: {
        color: colors.white,
        marginLeft: 8,
        fontWeight: 'bold',
        fontSize: FontSizes.body,

    },
    typeBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: colors.pink,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.white,
    },
    resultContent: {
        flex: 1,
        justifyContent: 'center',
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    resultTitle: {
        fontSize: FontSizes.body,
        fontWeight: '600',
        color: colors.textPrimary,
        flex: 1,
        textAlign: 'left',
    },
    resultMeta: {
        fontSize: 10,
        color: colors.textTertiary,
        marginLeft: 8,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    resultSubtitle: {
        fontSize: FontSizes.small,
        color: colors.pink,
        marginBottom: 2,
        textAlign: 'left',
    },
    resultDescription: {
        fontSize: FontSizes.small, // slightly smaller
        color: colors.textSecondary,
        textAlign: 'left',
    },
});

export default SearchScreen;
