import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import type { FeedItem } from '../../../types/feed';
import { isMobileWeb } from '../../../globals/responsive';
import { styles } from './taskFeedCard.styles';

const isMobile = isMobileWeb();

export interface TaskAssignmentFeedCardBodyProps {
    item: FeedItem;
    isGrid: boolean;
}

/** Task-assignment body: grid shows title only; list shows full summary + meta rows. */
export const TaskAssignmentFeedCardBody: React.FC<TaskAssignmentFeedCardBodyProps> = ({ item, isGrid }) => {
    const { t } = useTranslation();
    const taskTitle = item.taskData?.title || item.title || t('post.noTitle');

    return (
        <View style={[styles.contentContainer, isGrid && styles.contentContainerGrid]}>
            <View style={styles.iconContainer}>
                <Ionicons name="construct-outline" size={isMobile ? 24 : 32} color={colors.primary} />
            </View>
            {isGrid ? (
                <View style={styles.textContainer}>
                    <Text style={[styles.description, { textAlign: 'center', fontWeight: '700' }]} numberOfLines={2}>
                        {taskTitle}
                    </Text>
                </View>
            ) : (
                <>
                    <View style={styles.textContainer}>
                        <Text style={[styles.titleAssignment, { textAlign: 'center' }]}>{t('tasks.status.new_for_you')}</Text>
                        <Text
                            style={[styles.description, { textAlign: 'center', fontWeight: 'bold', marginTop: 4 }]}
                            numberOfLines={2}
                        >
                            {taskTitle}
                        </Text>
                        {(item.description || item.taskData?.description) && (
                            <Text style={[styles.description, { textAlign: 'center' }]} numberOfLines={3}>
                                {item.taskData?.description || item.description}
                            </Text>
                        )}
                    </View>
                    <View style={styles.detailsSection}>
                        <View style={styles.detailRow}>
                            <Ionicons name="person-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                            <Text style={styles.detailText}>
                                {t('task.opened_by', 'נוצר ע"י')}: {item.user.name}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="people-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                            <Text style={styles.detailText}>
                                {t('task.performer', 'מבצע')}:{' '}
                                {item.taskData?.assignees && item.taskData.assignees.length > 0
                                    ? item.taskData.assignees.map((a) => a.name).join(', ')
                                    : t('task.unassigned', 'טרם שובץ')}
                            </Text>
                        </View>
                        {item.taskData?.estimated_hours ? (
                            <View style={styles.detailRow}>
                                <Ionicons name="time-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                                <Text style={styles.detailText}>
                                    {t('task.duration', 'משך זמן')}: {item.taskData.estimated_hours} {t('common.hours', 'שעות')}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </>
            )}
        </View>
    );
};
