import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';

export interface Option {
    label: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    isDestructive?: boolean;
    color?: string;
}

interface OptionsModalProps {
    visible: boolean;
    onClose: () => void;
    options: Option[];
    title?: string;
    cancelText?: string;
    anchorPosition?: { x: number, y: number };
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OptionsModal: React.FC<OptionsModalProps> = ({
    visible,
    onClose,
    options,
    title,
    cancelText = 'ביטול',
    anchorPosition
}) => {
    if (!visible) return null;

    // Popover positioning logic
    const popoverStyle = anchorPosition ? {
        position: 'absolute' as const,
        top: anchorPosition.y + 10, // Slightly below the touch point
        // If clicked on right side, align right. If left, align left.
        ...(anchorPosition.x > SCREEN_WIDTH / 2
            ? { right: SCREEN_WIDTH - anchorPosition.x - 10 }
            : { left: anchorPosition.x - 10 }
        ),
        width: 200, // Compact width
    } : null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={[styles.overlay, anchorPosition ? styles.overlayClear : {}]}>
                    <TouchableWithoutFeedback>
                        <View style={[
                            styles.modalContainer,
                            popoverStyle,
                            !anchorPosition && styles.bottomSheetContainer
                        ]}>
                            <View style={[styles.contentContainer, styles.shadow]}>
                                {title && !anchorPosition && (
                                    <View style={styles.header}>
                                        <Text style={styles.title}>{title}</Text>
                                    </View>
                                )}

                                {options.map((option, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.option,
                                            index < options.length - 1 && styles.borderBottom
                                        ]}
                                        onPress={() => {
                                            // Close first, then execute action
                                            onClose();
                                            requestAnimationFrame(() => {
                                                option.onPress();
                                            });
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.optionContent}>
                                            {option.icon && (
                                                <Ionicons
                                                    name={option.icon}
                                                    size={20}
                                                    color={option.isDestructive ? colors.error : (option.color || colors.textPrimary)}
                                                />
                                            )}
                                            <Text style={[
                                                styles.optionText,
                                                option.isDestructive && styles.destructiveText,
                                                option.color ? { color: option.color } : {}
                                            ]}>
                                                {option.label}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {!anchorPosition && (
                                <TouchableOpacity style={[styles.cancelButton, styles.shadow]} onPress={onClose} activeOpacity={0.9}>
                                    <Text style={styles.cancelText}>{cancelText}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    overlayClear: {
        backgroundColor: 'rgba(0,0,0,0.2)', // Lighter dim for popover
        justifyContent: 'flex-start', // Allow absolute positioning from top
        padding: 0,
    },
    modalContainer: {
        gap: 8,
    },
    bottomSheetContainer: {
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
    },
    contentContainer: {
        backgroundColor: colors.white,
        borderRadius: 12,
        overflow: 'hidden',
    },
    shadow: {
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
        padding: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    title: {
        fontSize: FontSizes.small,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    option: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.white,
    },
    borderBottom: {
        borderBottomWidth: 0.5,
        borderBottomColor: colors.borderSecondary || colors.border,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start', // Align start for popover look
        gap: 12,
    },
    optionText: {
        fontSize: FontSizes.body,
        fontWeight: '500',
        color: colors.textPrimary,
        textAlign: 'left',
    },
    destructiveText: {
        color: colors.error,
    },
    cancelButton: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    cancelText: {
        fontSize: FontSizes.body,
        fontWeight: '600',
        color: colors.primary,
    },
});

export default OptionsModal;
