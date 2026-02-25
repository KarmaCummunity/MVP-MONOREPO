import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';

type OrgApplication = {
  id: string;
  orgName: string;
  orgType: string;
  registrationNumber?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  city?: string;
  activityAreas: string[];
  needs: string;
  offering: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  _ownerPartition?: string; // for admin queue
};

export default function AdminOrgApprovalsScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { selectedUser } = useUser();
  const [items, setItems] = useState<OrgApplication[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = (selectedUser?.roles || []).includes('admin');

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await db.listOrgApplications('admin_org_queue');
      setItems((data as any[]) as OrgApplication[]);
    } catch (e) {
       
      console.error('admin load error', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (app: OrgApplication, status: 'approved' | 'rejected') => {
    try {
      const owner = app._ownerPartition || app.contactEmail.toLowerCase();
      await db.updateOrgApplication(owner, app.id, { status, updatedAt: new Date().toISOString() });
      await db.updateOrgApplication('admin_org_queue', app.id, { status, updatedAt: new Date().toISOString() });
      if (status === 'approved') {
        // create organization record keyed by owner partition
        await db.createOrganization(owner, app.id, {
          id: app.id,
          name: app.orgName,
          type: app.orgType,
          registrationNumber: app.registrationNumber,
          contactName: app.contactName,
          contactEmail: app.contactEmail,
          contactPhone: app.contactPhone,
          website: app.website,
          city: app.city,
          activityAreas: app.activityAreas,
          createdAt: app.createdAt,
          updatedAt: new Date().toISOString(),
          status: 'active',
        });
      }
      Alert.alert(
        status === 'approved' ? (t('common:confirm') || 'אישור') : (t('common:done') || 'סיום'),
        status === 'approved' ? 'הבקשה אושרה' : 'הבקשה נדחתה'
      );
      load();
    } catch (e) {
      Alert.alert('שגיאה', 'עדכון הסטטוס נכשל');
    }
  };

  const renderItem = ({ item }: { item: OrgApplication }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{item.orgName}</Text>
        <Text style={[styles.status, item.status === 'pending' ? styles.pending : item.status === 'approved' ? styles.approved : styles.rejected]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.sub}>{item.orgType}{item.city ? ` · ${item.city}` : ''}</Text>
      <Text style={styles.body}>{item.description}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.reject]} onPress={() => updateStatus(item, 'rejected')}>
          <Text style={styles.btnText}>דחייה</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.approve]} onPress={() => updateStatus(item, 'approved')}>
          <Text style={styles.btnText}>אישור</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>אין לך הרשאות לצפות בדף זה</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{
        padding: 16,
        flexGrow: 1,
        minHeight: '150%' // Ensure content is always scrollable
      }}
      data={items}
      keyExtractor={(it) => it.id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.backgroundSecondary, padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: FontSizes.medium, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: FontSizes.small, color: colors.textSecondary, marginBottom: 6 },
  body: { fontSize: FontSizes.body, color: colors.textPrimary },
  status: { fontSize: FontSizes.small, fontWeight: '700' },
  pending: { color: colors.warning },
  approved: { color: colors.success },
  rejected: { color: colors.error },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  approve: { backgroundColor: colors.primary },
  reject: { backgroundColor: colors.error },
  btnText: { color: colors.white, fontWeight: '700' },
});


