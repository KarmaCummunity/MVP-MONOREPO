import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import apiService from '../utils/apiService';

interface User {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    roles?: string[];
}

interface UserSelectorProps {
    selectedUsers: User[];
    onSelect: (user: User) => void;
    onRemove: (userId: string) => void;
    singleSelection?: boolean;
    useModal?: boolean;
}

export default function UserSelector({ selectedUsers, onSelect, onRemove, singleSelection = false, useModal = true }: UserSelectorProps) {

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [defaultUsers, setDefaultUsers] = useState<User[]>([]);

    // Fetch default users on mount
    useEffect(() => {
        const fetchDefaultUsers = async () => {
            setLoading(true);
            try {
                const res = await apiService.getUsers({ limit: 50 });
                if (res.success && res.data) {
                    setDefaultUsers(res.data);
                    // If no query, show defaults immediately
                    if (!query) {
                        setResults(res.data);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch default users', err);
            } finally {
                setLoading(false);
            }
        };

        // Fetch if we open modal, or if inline and it's first load
        if ((useModal && modalVisible) || !useModal) {
            // Only fetch if we haven't already (or maybe refresh?)
            // For now, let's fetch always to ensure fresh data
            fetchDefaultUsers();
        }
    }, [useModal, modalVisible]);

    useEffect(() => {
        if (!query || query.length < 2) {
            // If query is empty, show default users
            setResults(defaultUsers);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await apiService.searchUsers(query);
                if (res.success && res.data) {
                    setResults(res.data);
                }
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, defaultUsers]);

    // Handle initial selection in modal mode: clear query for fresh search next time
    const handleSelect = (user: User) => {
        onSelect(user);
        if (useModal) {
            setModalVisible(false);
            setQuery('');
            setResults(defaultUsers);
        } else {
            setQuery('');
            setResults(defaultUsers);
        }
    };

    const renderSearchInput = () => (
        <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
                style={styles.input}
                placeholder="חפש משתמש..."
                value={query}
                onChangeText={setQuery}
                placeholderTextColor={colors.textSecondary}
                autoFocus={useModal} // Auto focus when modal opens
            />
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
    );

    const renderResultsList = () => (
        <View style={[styles.resultsList, useModal && styles.resultsListModal]}>
            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: user }) => {
                    const isSelected = selectedUsers.some(u => u.id === user.id);
                    if (isSelected) return null;

                    return (
                        <TouchableOpacity
                            style={styles.resultItem}
                            onPress={() => handleSelect(user)}
                        >
                            <Image
                                source={{ uri: user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}` }}
                                style={styles.resultAvatar}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.resultName}>{user.name}</Text>
                                <Text style={styles.resultEmail}>{user.email}</Text>
                            </View>
                            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.7 }}>
                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        ) : (
                            <>
                                <Ionicons name={query.length < 2 ? "people-outline" : "warning-outline"} size={40} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                                <Text style={styles.emptyText}>
                                    {query.length < 2 ? 'אין משתמשים להצגה' : 'לא נמצאו תוצאות'}
                                </Text>
                            </>
                        )}
                    </View>
                }
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.label}>הקצאה למשתמשים:</Text>

            {/* Selected Users Chips */}
            <View style={styles.chipsContainer}>
                {selectedUsers.map(user => (
                    <View key={user.id} style={styles.chip}>
                        <Image
                            source={{ uri: user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}` }}
                            style={styles.chipAvatar}
                        />
                        <Text style={styles.chipText}>{user.name}</Text>
                        <TouchableOpacity onPress={() => onRemove(user.id)}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* Modal Trigger or Inline Search */}
            {(!singleSelection || selectedUsers.length === 0) && (
                useModal ? (
                    <>
                        <TouchableOpacity
                            style={styles.openModalButton}
                            onPress={() => setModalVisible(true)}
                        >
                            <Ionicons name="person-add-outline" size={20} color={colors.textSecondary} />
                            <Text style={styles.openModalText}>לחץ לחיפוש והוספת משתמשים...</Text>
                        </TouchableOpacity>

                        <Modal
                            visible={modalVisible}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setModalVisible(false)}
                        >
                            <View style={styles.modalBackdrop}>
                                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                                    <View style={styles.modalOverlay} />
                                </TouchableWithoutFeedback>

                                <View style={styles.modalContent}>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>בחירת משתמש</Text>
                                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                                            <Ionicons name="close" size={24} color={colors.textPrimary} />
                                        </TouchableOpacity>
                                    </View>

                                    {renderSearchInput()}
                                    {renderResultsList()}
                                </View>
                            </View>
                        </Modal>
                    </>
                ) : (
                    <>
                        {renderSearchInput()}
                        {results.length > 0 && renderResultsList()}
                    </>
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        zIndex: 100,
    },
    label: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        textAlign: 'right',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
        justifyContent: 'flex-end',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 20,
        padding: 4,
        paddingRight: 12,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    chipAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    chipText: {
        fontSize: 14,
        color: colors.textPrimary,
    },
    // Inline search styles
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        textAlign: 'right',
        marginRight: 8,
        color: colors.textPrimary,
        height: '100%',
    },
    resultsList: {
        backgroundColor: colors.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: 200,
        overflow: 'hidden',
    },
    resultsListModal: {
        borderWidth: 0,
        flex: 1,
        maxHeight: undefined, // Let it fill space in modal
        marginTop: 8,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
    },
    resultAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'left',
    },
    resultEmail: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'left',
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        color: colors.textSecondary,
    },

    // Modal Styles
    openModalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        height: 44,
        justifyContent: 'flex-end',
        gap: 8,
    },
    openModalText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50, // Avoid status bar somewhat
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        backgroundColor: colors.background,
        width: '100%',
        height: '80%', // Takes most of screen but not all
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
});
