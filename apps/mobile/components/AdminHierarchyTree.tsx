// AdminHierarchyTree.tsx
// Interactive visual tree component for displaying admin hierarchy
// Uses the existing color palette and design system

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { apiService } from '../utils/apiService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isTablet = SCREEN_WIDTH > 768;
const isMobileWeb = isWeb && SCREEN_WIDTH <= 768;

// Types
export interface ManagerNode {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  level: number;
  isSuperAdmin: boolean;
  isAdmin?: boolean;
  isVolunteer?: boolean;
  salary?: number;
  seniority_start_date?: string;
  children?: ManagerNode[];
}

interface ManagerNodeProps {
  node: ManagerNode;
  isLast?: boolean;
  depth?: number;
}

// Individual Manager Node Component (Recursive)
const ManagerNodeComponent: React.FC<ManagerNodeProps> = ({ node, isLast = false, depth = 0 }) => {
  const { t } = useTranslation('admin');
  const [isExpanded, setIsExpanded] = useState(true);
  const [animatedHeight] = useState(new Animated.Value(1));
  const hasChildren = node.children && node.children.length > 0;

  const toggleExpand = useCallback(() => {
    if (!hasChildren) return;
    
    Animated.timing(animatedHeight, {
      toValue: isExpanded ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
    
    setIsExpanded(!isExpanded);
  }, [isExpanded, hasChildren, animatedHeight]);

  // Get role badge color
  const getRoleBadgeStyle = () => {
    if (node.isSuperAdmin) {
      return { backgroundColor: colors.accent, color: colors.white };
    }
    if (node.isAdmin) {
      return { backgroundColor: colors.primary, color: colors.white };
    }
    if (node.isVolunteer) {
      return { backgroundColor: colors.warning, color: colors.white };
    }
    return { backgroundColor: colors.backgroundSecondary, color: colors.textSecondary };
  };

  const getRoleLabel = () => {
    if (node.isSuperAdmin) return t('hierarchy.roleSuperAdmin');
    if (node.isAdmin) return t('hierarchy.roleAdmin');
    if (node.isVolunteer) return t('hierarchy.roleVolunteer');
    return t('hierarchy.roleUser');
  };

  const badgeStyle = getRoleBadgeStyle();

  return (
    <View style={styles.nodeContainer}>
      {/* Connection line from parent */}
      {depth > 0 && (
        <View style={styles.connectionLineContainer}>
          <View style={[styles.connectionLineVertical, { height: isLast ? '50%' : '100%' }]} />
          <View style={styles.connectionLineHorizontal} />
        </View>
      )}

      {/* Manager Card */}
      <TouchableOpacity
        style={[
          styles.managerCard,
          node.isSuperAdmin && styles.superAdminCard,
          depth === 0 && styles.rootCard,
        ]}
        onPress={toggleExpand}
        activeOpacity={hasChildren ? 0.7 : 1}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {node.avatar_url ? (
            <Image source={{ uri: node.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, node.isSuperAdmin && styles.superAdminAvatarPlaceholder]}>
              <Ionicons
                name="person"
                size={isMobileWeb ? 18 : 24}
                color={node.isSuperAdmin ? colors.white : colors.textSecondary}
              />
            </View>
          )}
          {/* Super Admin Crown */}
          {node.isSuperAdmin && (
            <View style={styles.crownBadge}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.managerName, node.isSuperAdmin && styles.superAdminName]} numberOfLines={1}>
            {node.name}
          </Text>
          <Text style={styles.managerEmail} numberOfLines={1}>
            {node.email}
          </Text>
          {/* Role Badge */}
          <View style={[styles.roleBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
            <Text style={[styles.roleText, { color: badgeStyle.color }]}>{getRoleLabel()}</Text>
          </View>
          
          {/* Salary */}
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={isMobileWeb ? 12 : 14} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {t('hierarchy.salary')}: ₪{(node.salary ?? 0).toLocaleString('he-IL')}
            </Text>
          </View>
          
          {/* Seniority */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={isMobileWeb ? 12 : 14} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {t('hierarchy.seniority')}: {node.seniority_start_date || new Date().toISOString().split('T')[0]}
            </Text>
          </View>
          
          {/* Level/Rank */}
          <View style={styles.infoRow}>
            <Ionicons name="layers-outline" size={isMobileWeb ? 12 : 14} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {t('hierarchy.level')}: {node.level}
            </Text>
          </View>
        </View>

        {/* Expand/Collapse Indicator */}
        {hasChildren && (
          <View style={styles.expandIndicator}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={isMobileWeb ? 16 : 20}
              color={colors.textSecondary}
            />
            <Text style={styles.childrenCount}>
              {node.children!.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Children (Subordinates) */}
      {hasChildren && isExpanded && (
        <Animated.View
          style={[
            styles.childrenContainer,
            {
              opacity: animatedHeight,
              transform: [{
                scaleY: animatedHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              }],
            },
          ]}
        >
          {node.children!.map((child, index) => (
            <ManagerNodeComponent
              key={child.id}
              node={child}
              isLast={index === node.children!.length - 1}
              depth={depth + 1}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
};

// Main Tree Component
interface AdminHierarchyTreeProps {
  onError?: (error: string) => void;
}

const AdminHierarchyTree: React.FC<AdminHierarchyTreeProps> = ({ onError }) => {
  const { t } = useTranslation('admin');
  const [treeData, setTreeData] = useState<ManagerNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const loadHierarchy = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getFullAdminHierarchy();
      
      if (response.success && response.data) {
        setTreeData(response.data);
        setTotalCount((response as any).totalCount || response.data.length);
      } else {
        const errorMsg = response.error || t('hierarchy.loadError');
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = t('hierarchy.connectionError');
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('Failed to load hierarchy:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onError, t]);

  useEffect(() => {
    loadHierarchy();
  }, [loadHierarchy]);

  // Loading State
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('hierarchy.loading')}</Text>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadHierarchy}>
          <Text style={styles.retryButtonText}>{t('hierarchy.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty State
  if (treeData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyText}>{t('hierarchy.noManagers')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with stats */}
      <View style={styles.headerStats}>
        <View style={styles.statBadge}>
          <Ionicons name="people" size={16} color={colors.primary} />
          <Text style={styles.statText}>{t('hierarchy.managersCount', { count: totalCount })}</Text>
        </View>
      </View>

      {/* Tree */}
      <View style={styles.treeContainer}>
        {treeData.map((rootNode, index) => (
          <ManagerNodeComponent
            key={rootNode.id}
            node={rootNode}
            isLast={index === treeData.length - 1}
            depth={0}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>{t('hierarchy.roleSuperAdmin')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>{t('hierarchy.roleAdmin')}</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="chevron-down-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.legendText}>{t('hierarchy.expandHint')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: isMobileWeb ? 8 : 16,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: isMobileWeb ? 16 : 24,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statText: {
    fontSize: isMobileWeb ? 14 : 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  treeContainer: {
    width: '100%',
    maxWidth: isTablet ? 800 : '100%',
    alignSelf: 'center',
  },
  nodeContainer: {
    width: '100%',
    position: 'relative',
  },
  connectionLineContainer: {
    position: 'absolute',
    left: isMobileWeb ? 20 : 28,
    top: 0,
    bottom: 0,
    width: isMobileWeb ? 24 : 32,
    zIndex: 0,
  },
  connectionLineVertical: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2,
    backgroundColor: colors.borderSecondary,
  },
  connectionLineHorizontal: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: isMobileWeb ? 24 : 32,
    height: 2,
    backgroundColor: colors.borderSecondary,
    marginTop: -1,
  },
  managerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: isMobileWeb ? 12 : 16,
    padding: isMobileWeb ? 12 : 16,
    marginLeft: isMobileWeb ? 44 : 60,
    marginBottom: isMobileWeb ? 8 : 12,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    gap: isMobileWeb ? 10 : 14,
  },
  superAdminCard: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.white,
    shadowColor: colors.accent,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  rootCard: {
    marginLeft: 0,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: isMobileWeb ? 40 : 52,
    height: isMobileWeb ? 40 : 52,
    borderRadius: isMobileWeb ? 20 : 26,
    borderWidth: 2,
    borderColor: colors.borderSecondary,
  },
  avatarPlaceholder: {
    width: isMobileWeb ? 40 : 52,
    height: isMobileWeb ? 40 : 52,
    borderRadius: isMobileWeb ? 20 : 26,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderSecondary,
  },
  superAdminAvatarPlaceholder: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  crownBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: isMobileWeb ? 18 : 22,
    height: isMobileWeb ? 18 : 22,
    borderRadius: isMobileWeb ? 9 : 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  crownEmoji: {
    fontSize: isMobileWeb ? 10 : 12,
  },
  infoContainer: {
    flex: 1,
    gap: 2,
  },
  managerName: {
    fontSize: isMobileWeb ? 14 : 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  superAdminName: {
    color: colors.accent,
  },
  managerEmail: {
    fontSize: isMobileWeb ? 11 : 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  roleBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  roleText: {
    fontSize: isMobileWeb ? 10 : 11,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  infoText: {
    fontSize: isMobileWeb ? 10 : 11,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  expandIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
    gap: 2,
  },
  childrenCount: {
    fontSize: isMobileWeb ? 10 : 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  childrenContainer: {
    marginLeft: isMobileWeb ? 20 : 28,
    paddingTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    fontSize: isMobileWeb ? 14 : 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  errorText: {
    fontSize: isMobileWeb ? 14 : 16,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: isMobileWeb ? 14 : 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: isMobileWeb ? 14 : 16,
    color: colors.textTertiary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isMobileWeb ? 12 : 20,
    marginTop: isMobileWeb ? 20 : 32,
    paddingTop: isMobileWeb ? 16 : 24,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: isMobileWeb ? 11 : 13,
    color: colors.textSecondary,
  },
});

export default AdminHierarchyTree;



