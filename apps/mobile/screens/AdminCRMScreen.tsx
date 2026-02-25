import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Platform,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NavigationProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { AdminStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';
import { apiService } from '../utils/apiService';
import { useAdminProtection } from '../hooks/useAdminProtection';

interface AdminCRMScreenProps {
    navigation: NavigationProp<AdminStackParamList>;
}

interface CrmContact {
    id: string;
    name: string;
    capabilities?: string;
    desire?: string;
    time_availability?: string;
    source?: string;
    referrer?: string;
    status: 'active' | 'inactive';
    created_at: string;
}

interface ContactFormData {
    name: string;
    capabilities: string;
    desire: string;
    time_availability: string;
    source: string;
    referrer: string;
    status: 'active' | 'inactive';
}

const LOG_SOURCE = 'AdminCRMScreen';

export default function AdminCRMScreen({ navigation }: AdminCRMScreenProps) {
    const route = useRoute();
    const routeParams = (route.params as any) || {};
    const viewOnly = routeParams?.viewOnly === true;
    useAdminProtection(true);
    const { selectedUser } = useUser();
    const tabBarHeight = useBottomTabBarHeight() || 0;
    const [contacts, setContacts] = useState<CrmContact[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<ContactFormData>({
        name: '',
        capabilities: '',
        desire: '',
        time_availability: '',
        source: '',
        referrer: '',
        status: 'active',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isMutating, setIsMutating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [headerHeight, setHeaderHeight] = useState(0);
    const [filtersHeight, setFiltersHeight] = useState(0);
    const screenHeight = Platform.OS === 'web' ? Dimensions.get('window').height : undefined;
    const maxListHeight = Platform.OS === 'web' && screenHeight && headerHeight > 0
        ? screenHeight - tabBarHeight - headerHeight - filtersHeight
        : undefined;

    useEffect(() => {
        loadContacts();
    }, [statusFilter, searchQuery]);

    const loadContacts = async () => {
        try {
            setIsLoading(true);
            const res = await apiService.crm.getAll({
                status: statusFilter !== 'all' ? statusFilter : undefined,
                search: searchQuery || undefined,
            });

            if (res.success && Array.isArray(res.data)) {
                setContacts(res.data);
            } else {
                setContacts([]);
            }
        } catch (error) {
            logger.error(LOG_SOURCE, 'Error loading contacts', { error });
            Alert.alert('שגיאה', 'לא ניתן לטעון את רשימת הקשרים');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFormData({
            name: '',
            capabilities: '',
            desire: '',
            time_availability: '',
            source: '',
            referrer: '',
            status: 'active',
        });
        setIsModalVisible(true);
    };

    const handleEdit = (contact: CrmContact) => {
        setIsEditMode(true);
        setEditingId(contact.id);
        setFormData({
            name: contact.name,
            capabilities: contact.capabilities || '',
            desire: contact.desire || '',
            time_availability: contact.time_availability || '',
            source: contact.source || '',
            referrer: contact.referrer || '',
            status: contact.status || 'active',
        });
        setIsModalVisible(true);
    };

    const handleDelete = (contact: CrmContact) => {
        Alert.alert('מחיקת איש קשר', `האם למחוק את ${contact.name}?`, [
            { text: 'ביטול', style: 'cancel' },
            {
                text: 'מחק',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setIsMutating(true);
                        const res = await apiService.crm.delete(contact.id);
                        if (res.success) {
                            loadContacts();
                        } else {
                            Alert.alert('שגיאה', 'מחיקה נכשלה');
                        }
                    } catch (e) {
                        Alert.alert('שגיאה', 'אירעה שגיאה במחיקה');
                    } finally {
                        setIsMutating(false);
                    }
                },
            },
        ]);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            Alert.alert('שגיאה', 'שם הוא שדה חובה');
            return;
        }

        try {
            setIsMutating(true);
            const payload = {
                ...formData,
                created_by: selectedUser?.id,
            };

            let res;
            if (isEditMode && editingId) {
                res = await apiService.crm.update(editingId, payload);
            } else {
                res = await apiService.crm.create(payload);
            }

            if (res.success) {
                setIsModalVisible(false);
                loadContacts();
            } else {
                Alert.alert('שגיאה', res.error || 'שמירה נכשלה');
            }
        } catch (e) {
            Alert.alert('שגיאה', 'אירעה שגיאה בשמירה');
        } finally {
            setIsMutating(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, Platform.OS === 'web' && { position: 'relative' }]}>
            <StatusBar backgroundColor={colors.backgroundSecondary} barStyle="dark-content" />
            <View 
                style={styles.header}
                onLayout={(event) => {
                    if (Platform.OS === 'web') {
                        const { height } = event.nativeEvent.layout;
                        setHeaderHeight(height);
                    }
                }}
            >
                <Text style={styles.title}>ניהול קשרים</Text>
                {!viewOnly && (
                    <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                        <Ionicons name="add" size={24} color="white" />
                        <Text style={styles.addButtonText}>הוסף</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View 
                style={styles.filtersContainer}
                onLayout={(event) => {
                    if (Platform.OS === 'web') {
                        const { height } = event.nativeEvent.layout;
                        setFiltersHeight(height);
                    }
                }}
            >
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="חפש שם, יכולות..."
                        placeholderTextColor={colors.textTertiary}
                    />
                </View>
                <View style={styles.statusFilterContainer}>
                    {['all', 'active', 'inactive'].map((s) => (
                        <TouchableOpacity
                            key={s}
                            style={[styles.filterButton, statusFilter === s && styles.filterButtonActive]}
                            onPress={() => setStatusFilter(s as any)}
                        >
                            <Text style={[styles.filterButtonText, statusFilter === s && styles.filterButtonTextActive]}>
                                {s === 'all' ? 'הכל' : s === 'active' ? 'פעיל' : 'לא פעיל'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* List container - limited height on web to ensure scrolling works */}
            <View style={[
                styles.listWrapper,
                Platform.OS === 'web' && maxListHeight ? {
                    maxHeight: maxListHeight,
                } : undefined
            ]}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadContacts} />}
                        scrollEnabled={true}
                        nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
                        scrollEventThrottle={16}
                    >
                    {contacts.map((c) => (
                        <View key={c.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={styles.cardTitle}>{c.name}</Text>
                                    <Text style={styles.cardDate}>{new Date(c.created_at).toLocaleDateString('he-IL')}</Text>
                                </View>
                                <View style={styles.cardActions}>
                                    {!viewOnly && (
                                        <>
                                            <TouchableOpacity onPress={() => handleEdit(c)} style={styles.actionButton}>
                                                <Ionicons name="create-outline" size={20} color={colors.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDelete(c)} style={styles.actionButton}>
                                                <Ionicons name="trash-outline" size={20} color={colors.error} />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </View>

                            <View style={styles.cardDetails}>
                                {c.capabilities ? <Text style={styles.detailText}><Text style={styles.bold}>יכולות:</Text> {c.capabilities}</Text> : null}
                                {c.desire ? <Text style={styles.detailText}><Text style={styles.bold}>רצון:</Text> {c.desire}</Text> : null}
                                {c.time_availability ? <Text style={styles.detailText}><Text style={styles.bold}>זמן:</Text> {c.time_availability}</Text> : null}
                                {c.source ? <Text style={styles.detailText}><Text style={styles.bold}>מקור:</Text> {c.source}</Text> : null}
                                {c.referrer ? <Text style={styles.detailText}><Text style={styles.bold}>מפנה:</Text> {c.referrer}</Text> : null}
                            </View>

                            <View style={[styles.statusBadge, c.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                                <Text style={[styles.statusText, c.status === 'active' ? styles.statusTextActive : styles.statusTextInactive]}>
                                    {c.status === 'active' ? 'פעיל' : 'לא פעיל'}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {contacts.length === 0 && (
                        <Text style={styles.emptyText}>לא נמצאו אנשי קשר</Text>
                    )}
                    </ScrollView>
                )}
            </View>

            <Modal visible={isModalVisible && !viewOnly} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditMode ? 'ערוך' : 'הוסף'}</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalForm}>
                            <FormInput label="שם *" value={formData.name} onChange={(v: string) => setFormData({ ...formData, name: v })} />
                            <FormInput label="יכולות" value={formData.capabilities} onChange={(v: string) => setFormData({ ...formData, capabilities: v })} multiline />
                            <FormInput label="רצון" value={formData.desire} onChange={(v: string) => setFormData({ ...formData, desire: v })} multiline />
                            <FormInput label="זמן / זמינות" value={formData.time_availability} onChange={(v: string) => setFormData({ ...formData, time_availability: v })} />
                            <FormInput label="מאיפה הגענו (מקור)" value={formData.source} onChange={(v: string) => setFormData({ ...formData, source: v })} />
                            <FormInput label="מי הפעיל/הביא (מפנה)" value={formData.referrer} onChange={(v: string) => setFormData({ ...formData, referrer: v })} />

                            <Text style={styles.label}>סטטוס</Text>
                            <View style={styles.statusSwitches}>
                                <TouchableOpacity
                                    style={[styles.statusSwitch, formData.status === 'active' && styles.statusSwitchActive]}
                                    onPress={() => setFormData({ ...formData, status: 'active' })}
                                >
                                    <Text style={formData.status === 'active' ? styles.wt : styles.bt}>פעיל</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.statusSwitch, formData.status === 'inactive' && styles.statusSwitchActive]}
                                    onPress={() => setFormData({ ...formData, status: 'inactive' })}
                                >
                                    <Text style={formData.status === 'inactive' ? styles.wt : styles.bt}>לא פעיל</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isMutating}>
                                {isMutating ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>שמור</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const FormInput = ({ label, value, onChange, multiline = false }: any) => (
    <View style={styles.formGroup}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={[styles.input, multiline && styles.textArea]}
            value={value}
            onChangeText={onChange}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
        />
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary, position: 'relative' },
    listWrapper: { flex: 1, backgroundColor: colors.backgroundSecondary },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: LAYOUT_CONSTANTS.SPACING.LG, backgroundColor: colors.background, paddingVertical: 20 },
    title: { fontSize: FontSizes.heading2, fontWeight: 'bold' },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, padding: 8, borderRadius: 8 },
    addButtonText: { color: 'white', marginLeft: 5, fontWeight: '600' },
    filtersContainer: { padding: 10, backgroundColor: colors.background },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundSecondary, borderRadius: 8, padding: 8, marginBottom: 10 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, textAlign: 'right' },
    statusFilterContainer: { flexDirection: 'row', justifyContent: 'space-around' },
    filterButton: { padding: 8, borderRadius: 15, width: '30%', alignItems: 'center', backgroundColor: '#eee' },
    filterButtonActive: { backgroundColor: colors.primary },
    filterButtonText: { color: '#666' },
    filterButtonTextActive: { color: 'white', fontWeight: 'bold' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 15, paddingBottom: 100 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'left' },
    cardDate: { fontSize: 12, color: '#999', textAlign: 'left' },
    cardActions: { flexDirection: 'row' },
    actionButton: { padding: 5, marginLeft: 10 },
    cardDetails: { marginBottom: 10 },
    detailText: { fontSize: 14, marginBottom: 4, textAlign: 'left' },
    bold: { fontWeight: 'bold' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    statusActive: { backgroundColor: '#e6fffa' },
    statusInactive: { backgroundColor: '#fff5f5' },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    statusTextActive: { color: colors.success },
    statusTextInactive: { color: colors.error },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%' },
    modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalForm: { padding: 20 },
    formGroup: { marginBottom: 15 },
    label: { marginBottom: 5, fontWeight: '600', textAlign: 'left' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, textAlign: 'right' },
    textArea: { height: 80 },
    saveButton: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    statusSwitches: { flexDirection: 'row', marginTop: 5 },
    statusSwitch: { flex: 1, padding: 10, alignItems: 'center', borderColor: colors.primary, borderWidth: 1 },
    statusSwitchActive: { backgroundColor: colors.primary },
    wt: { color: 'white' },
    bt: { color: colors.primary },
});
