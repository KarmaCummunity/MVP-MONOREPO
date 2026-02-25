import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useUser } from '../stores/userStore';
import { db } from '../utils/databaseService';

export default function OrgDashboardScreen() {
  const { t } = useTranslation(['auth','common']);
  const { selectedUser } = useUser();
  const [orgs, setOrgs] = useState<any[]>([]);
  const isOrgAdmin = (selectedUser?.roles || []).includes('org_admin');

  useEffect(() => {
    (async () => {
      if (!isOrgAdmin) return;
      const partition = (selectedUser?.email || '').toLowerCase();
      const data = await db.listOrganizations(partition);
      setOrgs(data as any[]);
    })();
  }, [isOrgAdmin, selectedUser?.email]);

  if (!isOrgAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>יישות זו מיועדת למנהלי ארגונים מאושרים</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>לוח בקרה לארגון</Text>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={orgs}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardText}>{item.city ? `${item.city} · ` : ''}{item.type}</Text>
            <Text style={styles.cardText}>תחומי פעילות: {(item.activityAreas || []).join(', ')}</Text>
            <Text style={styles.cardText}>סטטוס: {item.status || 'active'}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSizes.heading1, color: colors.textPrimary, fontWeight: '800', margin: 16 },
  body: { fontSize: FontSizes.body, color: colors.textPrimary },
  card: { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: FontSizes.medium, color: colors.textPrimary, fontWeight: '700' },
  cardText: { fontSize: FontSizes.small, color: colors.textSecondary },
});


