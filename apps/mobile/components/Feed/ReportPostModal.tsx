import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    TouchableWithoutFeedback,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';
import { Ionicons } from '@expo/vector-icons';

interface ReportPostModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    isLoading?: boolean;
    title?: string;
}

const ReportPostModal: React.FC<ReportPostModalProps> = ({
    visible,
    onClose,
    onSubmit,
    isLoading = false,
    title = 'דיווח על פוסט'
}) => {
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (reason.trim()) {
            onSubmit(reason);
            setReason('');
        }
    };

    const handleClose = () => {
        setReason('');
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContainer}>
                                <View style={styles.header}>
                                    <Text style={styles.title}>{title}</Text>
                                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                        <Ionicons name="close" size={24} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.content}>
                                    <Text style={styles.subtitle}>אנא פרט/י את הסיבה לדיווח:</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="כתוב כאן..."
                                        placeholderTextColor={colors.textSecondary}
                                        multiline
                                        numberOfLines={4}
                                        value={reason}
                                        onChangeText={setReason}
                                        textAlign="right"
                                    />
                                </View>

                                <View style={styles.footer}>
                                    <TouchableOpacity
                                        style={[styles.cancelButton]}
                                        onPress={handleClose}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.cancelButtonText}>ביטול</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.submitButton, !reason.trim() && styles.disabledButton]}
                                        onPress={handleSubmit}
                                        disabled={!reason.trim() || isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color={colors.white} size="small" />
                                        ) : (
                                            <Text style={styles.submitButtonText}>שלח דיווח</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.white,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: FontSizes.large,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 16,
    },
    subtitle: {
        fontSize: FontSizes.body,
        color: colors.textSecondary,
        marginBottom: 12,
        textAlign: 'right',
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        minHeight: 120,
        textAlignVertical: 'top',
        fontSize: FontSizes.body,
        color: colors.textPrimary,
        backgroundColor: colors.background,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        gap: 12,
        backgroundColor: colors.backgroundSecondary, // slight gray background for footer
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: colors.buttonDisabled,
    },
    submitButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: FontSizes.body,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cancelButtonText: {
        color: colors.textSecondary,
        fontSize: FontSizes.body,
    },
});

export default ReportPostModal;
