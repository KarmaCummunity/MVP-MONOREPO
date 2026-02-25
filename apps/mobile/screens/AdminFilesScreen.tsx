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
    Linking,
    ActivityIndicator,
} from 'react-native';
import { NavigationProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { AdminStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { apiService } from '../utils/apiService';
import { useAdminProtection } from '../hooks/useAdminProtection';
import { pickDocument, validateFile, FileData, formatFileSize } from '../utils/fileService';
import { uploadFileWithProgress, buildAdminFilePath } from '../utils/storageService';

interface AdminFilesScreenProps {
    navigation: NavigationProp<AdminStackParamList>;
}

interface GeneralFile {
    id: string;
    name: string;
    url: string;
    folder_path: string;
    created_at: string;
    mime_type?: string;
    size?: number;
}

export default function AdminFilesScreen({ navigation }: AdminFilesScreenProps) {
    const route = useRoute();
    const routeParams = (route.params as any) || {};
    const viewOnly = routeParams?.viewOnly === true;
    useAdminProtection(true);
    const { selectedUser } = useUser();
    const [files, setFiles] = useState<GeneralFile[]>([]);
    const [currentFolder, setCurrentFolder] = useState('/');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMutating, setIsMutating] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState<FileData | null>(null);

    useEffect(() => {
        loadFiles();
    }, [currentFolder]);

    const loadFiles = async () => {
        try {
            setIsLoading(true);
            const res = await apiService.adminFiles.getAll({ folder: currentFolder });
            if (res.success && Array.isArray(res.data)) {
                setFiles(res.data);
            } else {
                setFiles([]);
            }
        } catch (e) {
            Alert.alert('שגיאה', 'לא ניתן לטעון קבצים');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpen = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור'));
    };

    const handleDelete = (file: GeneralFile) => {
        // Check hierarchy - simplified to checking if admin
        Alert.alert('מחיקה', `למחוק את ${file.name}?`, [
            { text: 'ביטול' },
            {
                text: 'מחק',
                style: 'destructive',
                onPress: async () => {
                    setIsMutating(true);
                    const res = await apiService.adminFiles.delete(file.id);
                    setIsMutating(false);
                    if (res.success) loadFiles();
                    else Alert.alert('שגיאה', 'מחיקה נכשלה');
                }
            }
        ]);
    };

    const handlePickFile = async () => {
        const result = await pickDocument();
        if (result.success && result.fileData) {
            setSelectedFile(result.fileData);
        } else if (result.error) {
            Alert.alert('שגיאה', result.error);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.alert('שגיאה', 'אנא בחר קובץ להעלאה');
            return;
        }

        // Validate file size (max 10MB for admin files)
        const maxSize = 10 * 1024 * 1024; // 10MB
        const validation = validateFile(selectedFile, maxSize);
        if (!validation.isValid) {
            Alert.alert('שגיאה', validation.error || 'הקובץ אינו תקין');
            return;
        }

        setIsMutating(true);
        setUploadProgress(0);

        try {
            // Generate file ID
            const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Build file path in Firebase Storage
            const fullPath = buildAdminFilePath(currentFolder, fileId, selectedFile.name);
            
            // Upload file to Firebase Storage with progress tracking
            let uploadedUrl: string;
            try {
                const uploadResult = await uploadFileWithProgress(
                    fullPath,
                    selectedFile.uri,
                    selectedFile.mimeType,
                    (progress) => {
                        setUploadProgress(progress);
                    }
                );
                uploadedUrl = uploadResult.url;
            } catch (uploadError: any) {
                console.error('❌ Upload file error:', uploadError);
                const errorMessage = uploadError?.message || uploadError?.code || 'שגיאה לא ידועה';
                console.error('❌ Upload error details:', {
                    error: uploadError,
                    fullPath,
                    fileName: selectedFile.name,
                    fileSize: selectedFile.size,
                    mimeType: selectedFile.mimeType,
                });
                Alert.alert(
                    'שגיאה בהעלאת הקובץ',
                    `לא ניתן להעלות את הקובץ. ${errorMessage.includes('CORS') ? 'בעיית CORS - בדוק את הגדרות Firebase Storage.' : errorMessage}`
                );
                setIsMutating(false);
                setUploadProgress(0);
                return;
            }

            // Save file metadata to database
            const res = await apiService.adminFiles.create({
                name: selectedFile.name,
                url: uploadedUrl,
                mime_type: selectedFile.mimeType,
                size: selectedFile.size || 0,
                folder_path: currentFolder,
                uploaded_by: selectedUser?.id
            });

            if (res.success) {
                setIsModalVisible(false);
                setSelectedFile(null);
                setUploadProgress(0);
                loadFiles();
            } else {
                Alert.alert('שגיאה', 'הוספה נכשלה');
            }
        } catch (error) {
            console.error('❌ Upload error:', error);
            Alert.alert('שגיאה', 'שגיאה בהעלאת הקובץ. אנא נסה שוב.');
        } finally {
            setIsMutating(false);
            setUploadProgress(0);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>קבצים משותפים</Text>
                {!viewOnly && (
                    <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
                        <Ionicons name="add" size={24} color="white" />
                        <Text style={styles.addText}>הוסף קובץ</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.folderBar}>
                <Ionicons name="folder-open" size={20} color={colors.primary} />
                <Text style={styles.folderName}>{currentFolder === '/' ? 'תיקייה ראשית' : currentFolder}</Text>
            </View>

            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 20 }} size="large" color={colors.primary} />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadFiles} />}
                >
                    {files.map((f) => (
                        <View key={f.id} style={styles.fileItem}>
                            <TouchableOpacity style={styles.fileInfo} onPress={() => handleOpen(f.url)}>
                                <Ionicons name="document-text-outline" size={30} color={colors.secondary} />
                                <View style={styles.textContainer}>
                                    <Text style={styles.fileName}>{f.name}</Text>
                                    <View style={styles.fileMeta}>
                                        <Text style={styles.fileDate}>{new Date(f.created_at).toLocaleDateString('he-IL')}</Text>
                                        {f.size && f.size > 0 && (
                                            <Text style={styles.fileSize}> • {formatFileSize(f.size)}</Text>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                            {!viewOnly && (
                                <TouchableOpacity onPress={() => handleDelete(f)} style={styles.deleteBtn}>
                                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                    {files.length === 0 && (
                        <Text style={styles.emptyText}>אין קבצים בתיקייה זו</Text>
                    )}
                </ScrollView>
            )}

            <Modal visible={isModalVisible && !viewOnly} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>הוספת קובץ</Text>

                        {!selectedFile ? (
                            <>
                                <Text style={styles.label}>בחר קובץ מהטלפון/מחשב</Text>
                                <TouchableOpacity style={styles.pickFileButton} onPress={handlePickFile}>
                                    <Ionicons name="document-outline" size={24} color={colors.primary} />
                                    <Text style={styles.pickFileText}>בחר קובץ</Text>
                                </TouchableOpacity>
                                <Text style={styles.hintText}>מקסימום 10MB</Text>
                            </>
                        ) : (
                            <>
                                <View style={styles.selectedFileContainer}>
                                    <Ionicons name="document" size={24} color={colors.primary} />
                                    <View style={styles.selectedFileInfo}>
                                        <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                                        {selectedFile.size && (
                                            <Text style={styles.selectedFileSize}>{formatFileSize(selectedFile.size)}</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedFile(null)}>
                                        <Ionicons name="close-circle" size={24} color={colors.error} />
                                    </TouchableOpacity>
                                </View>

                                {isMutating && uploadProgress > 0 && (
                                    <View style={styles.progressContainer}>
                                        <View style={styles.progressBarContainer}>
                                            <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                                        </View>
                                        <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
                                    </View>
                                )}
                            </>
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                onPress={() => {
                                    setIsModalVisible(false);
                                    setSelectedFile(null);
                                    setUploadProgress(0);
                                }} 
                                style={styles.cancelBtn}
                                disabled={isMutating}
                            >
                                <Text>ביטול</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={handleUpload} 
                                style={[styles.saveBtn, (!selectedFile || isMutating) && styles.saveBtnDisabled]} 
                                disabled={!selectedFile || isMutating}
                            >
                                {isMutating ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white' }}>העלה</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background },
    title: { fontSize: 22, fontWeight: 'bold' },
    addButton: { flexDirection: 'row', backgroundColor: colors.primary, padding: 8, borderRadius: 8 },
    addText: { color: 'white', marginLeft: 5, fontWeight: 'bold' },
    folderBar: { flexDirection: 'row', padding: 15, alignItems: 'center', backgroundColor: '#eef' },
    folderName: { marginLeft: 10, fontWeight: 'bold', color: colors.primary },
    list: { padding: 15 },
    fileItem: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'space-between' },
    fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    textContainer: { marginLeft: 15, flex: 1 },
    fileName: { fontSize: 16, fontWeight: 'bold', textAlign: 'left' },
    fileMeta: { flexDirection: 'row', alignItems: 'center' },
    fileDate: { fontSize: 12, color: '#888', textAlign: 'left' },
    fileSize: { fontSize: 12, color: '#888', textAlign: 'left' },
    deleteBtn: { padding: 10 },
    emptyText: { textAlign: 'center', marginTop: 30, color: '#999' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { marginBottom: 5, fontWeight: 'bold', textAlign: 'right' },
    hintText: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 },
    pickFileButton: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 2, 
        borderColor: colors.primary, 
        borderStyle: 'dashed',
        padding: 20, 
        borderRadius: 10, 
        marginBottom: 15 
    },
    pickFileText: { marginLeft: 10, color: colors.primary, fontWeight: 'bold' },
    selectedFileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
    },
    selectedFileInfo: { flex: 1, marginLeft: 10 },
    selectedFileName: { fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
    selectedFileSize: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 4 },
    progressContainer: { marginBottom: 15 },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 5, marginBottom: 15, textAlign: 'right' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    cancelBtn: { padding: 10 },
    saveBtn: { backgroundColor: colors.primary, padding: 10, borderRadius: 5, width: 100, alignItems: 'center' },
    saveBtnDisabled: { backgroundColor: colors.textSecondary, opacity: 0.5 },
});
