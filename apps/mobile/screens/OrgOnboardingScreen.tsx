import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import ScrollContainer from '../components/ScrollContainer';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useNavigation } from '@react-navigation/native';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';

type OrgApplication = {
  id: string;
  orgName: string;
  orgType: 'עמותה' | 'מלכ"ר' | 'חברה לתועלת הציבור' | 'יוזמה קהילתית' | 'אחר';
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
  files?: Array<{ name: string; uri: string; type?: string }>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
};

const generateId = () => `orgapp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function OrgOnboardingScreen() {
  const { t } = useTranslation(['auth','common']);
  const navigation = useNavigation();
  const { selectedUser } = useUser();
  const [form, setForm] = useState<Partial<OrgApplication>>({
    orgType: 'עמותה',
    activityAreas: [],
  });
  const ownerUserId = useMemo(() => (
    (form.contactEmail?.toLowerCase() || selectedUser?.email?.toLowerCase() || 'guest')
  ), [form.contactEmail, selectedUser?.email]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return !!form.orgName && !!form.contactName && !!form.contactEmail && !!form.contactPhone && !!form.description;
  }, [form]);

  const toggleArea = (area: string) => {
    setForm((prev) => {
      const exists = prev.activityAreas?.includes(area);
      const nextAreas = exists ? (prev.activityAreas || []).filter((a) => a !== area) : [...(prev.activityAreas || []), area];
      return { ...prev, activityAreas: nextAreas };
    });
  };

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert(t('auth:org.errorTitle') || 'שגיאה', t('auth:org.errorFill') || 'אנא מלאו את כל השדות החיוניים המסומנים');
      return;
    }
    try {
      setIsSubmitting(true);
      const id = generateId();
      const now = new Date().toISOString();
      const application: OrgApplication = {
        id,
        orgName: form.orgName!,
        orgType: (form.orgType as OrgApplication['orgType']) || 'עמותה',
        registrationNumber: form.registrationNumber,
        contactName: form.contactName!,
        contactEmail: form.contactEmail!,
        contactPhone: form.contactPhone!,
        website: form.website,
        city: form.city,
        activityAreas: form.activityAreas || [],
        needs: form.needs || '',
        offering: form.offering || '',
        description: form.description!,
        files: form.files || [],
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      await db.createOrgApplication(ownerUserId, id, application);
      // Also store in admin queue for centralized moderation
      await db.createOrgApplication('admin_org_queue', id, { ...application, _ownerPartition: ownerUserId });
      if (Platform.OS === 'web') {
        alert(t('auth:org.sentMessage') || 'הבקשה נשלחה! לאחר אישור תקבלו גישה מורחבת.');
      } else {
        Alert.alert(t('auth:org.sentTitle') || 'נשלח', t('auth:org.sentMessage') || 'הבקשה נשלחה! לאחר אישור תקבלו גישה מורחבת.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('auth:org.errorTitle') || 'שגיאה', t('auth:org.errorSend') || 'שליחת הבקשה נכשלה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const areas = (t('auth:org.areas', { returnObjects: true }) as string[]) || ['חינוך','בריאות','רווחה','סביבה','בעלי חיים','קהילה','נוער בסיכון','קשישים'];
  const orgTypes: OrgApplication['orgType'][] = (t('auth:org.types', { returnObjects: true }) as OrgApplication['orgType'][]) || ['עמותה','מלכ"ר','חברה לתועלת הציבור','יוזמה קהילתית','אחר'];

  const Content = (
    <>
      {/* Header with back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          <Text style={styles.backText}>{t('common:back') || 'חזרה'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{t('auth:org.title') || 'רישום ארגון / עמותה'}</Text>
      <Text style={styles.subtitle}>{t('auth:org.subtitle') || 'מלאו את הפרטים, נבדוק ונאשר. לאחר אישור תקבלו הרשאות ותצוגת תפעול ייעודית.'}</Text>

      <Text style={styles.label}>{t('auth:org.fields.orgName') || 'שם הארגון*'}</Text>
      <TextInput style={styles.input} value={form.orgName || ''} onChangeText={(v) => setForm({ ...form, orgName: v })} placeholder={t('auth:org.placeholders.orgName') || 'לדוגמה: עמותת ידידים'} />

      <Text style={styles.label}>{t('auth:org.fields.orgType') || 'סוג הארגון*'}</Text>
      <View style={styles.tagsRow}>
        {orgTypes.map((type) => (
          <TouchableOpacity key={type} style={[styles.tag, form.orgType === type && styles.tagSelected]} onPress={() => setForm({ ...form, orgType: type })}>
            <Text style={[styles.tagText, form.orgType === type && styles.tagTextSelected]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('auth:org.fields.registrationNumber') || 'מספר עמותה / ח.פ.'}</Text>
      <TextInput style={styles.input} value={form.registrationNumber || ''} onChangeText={(v) => setForm({ ...form, registrationNumber: v })} placeholder={t('auth:org.placeholders.registrationNumber') || 'לדוגמה: 580000000'} />

      <Text style={styles.sectionHeader}>{t('auth:org.fields.contactName') || 'פרטי איש קשר'}</Text>
      <Text style={styles.label}>{t('auth:org.fields.contactName') || 'שם מלא*'}</Text>
      <TextInput style={styles.input} value={form.contactName || ''} onChangeText={(v) => setForm({ ...form, contactName: v })} placeholder={t('auth:org.placeholders.contactName') || 'שם'} />
      <Text style={styles.label}>{t('auth:org.fields.contactEmail') || 'אימייל*'}</Text>
      <TextInput style={styles.input} value={form.contactEmail || ''} onChangeText={(v) => setForm({ ...form, contactEmail: v })} placeholder={t('auth:org.placeholders.contactEmail') || 'email@example.org'} keyboardType="email-address" />
      <Text style={styles.label}>{t('auth:org.fields.contactPhone') || 'טלפון*'}</Text>
      <TextInput style={styles.input} value={form.contactPhone || ''} onChangeText={(v) => setForm({ ...form, contactPhone: v })} placeholder={t('auth:org.placeholders.contactPhone') || '050-0000000'} keyboardType="phone-pad" />

      <Text style={styles.sectionHeader}>{t('auth:org.subtitle') || 'מידע נוסף'}</Text>
      <Text style={styles.label}>{t('auth:org.fields.website') || 'אתר אינטרנט'}</Text>
      <TextInput style={styles.input} value={form.website || ''} onChangeText={(v) => setForm({ ...form, website: v })} placeholder={t('auth:org.placeholders.website') || 'https://'} autoCapitalize="none" />
      <Text style={styles.label}>{t('auth:org.fields.city') || 'עיר'}</Text>
      <TextInput style={styles.input} value={form.city || ''} onChangeText={(v) => setForm({ ...form, city: v })} placeholder={t('auth:org.placeholders.city') || 'עיר'} />

      <Text style={styles.label}>{t('auth:org.fields.activityAreas') || 'תחומי פעילות'}</Text>
      <View style={styles.tagsRow}>
        {areas.map((a) => (
          <TouchableOpacity key={a} style={[styles.tag, form.activityAreas?.includes(a) && styles.tagSelected]} onPress={() => toggleArea(a)}>
            <Text style={[styles.tagText, form.activityAreas?.includes(a) && styles.tagTextSelected]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('auth:org.fields.needs') || 'מה אתם צריכים מאיתנו?'}</Text>
      <TextInput style={[styles.input, styles.multiline]} value={form.needs || ''} onChangeText={(v) => setForm({ ...form, needs: v })} placeholder={t('auth:org.placeholders.needs') || 'לדוגמה: מתנדבים לאיסוף מזון, תרומות, שיתופי פעולה'} multiline />

      <Text style={styles.label}>{t('auth:org.fields.offering') || 'מה אתם מציעים לקהילה?'}</Text>
      <TextInput style={[styles.input, styles.multiline]} value={form.offering || ''} onChangeText={(v) => setForm({ ...form, offering: v })} placeholder={t('auth:org.placeholders.offering') || 'לדוגמה: חלוקת מזון, קורסים, סדנאות'} multiline />

      <Text style={styles.label}>{t('auth:org.fields.description') || 'תיאור הארגון*'}</Text>
      <TextInput style={[styles.input, styles.multiline]} value={form.description || ''} onChangeText={(v) => setForm({ ...form, description: v })} placeholder={t('auth:org.placeholders.description') || 'ספרו על הארגון, מטרות ופעילות'} multiline />

      <TouchableOpacity disabled={!canSubmit || isSubmitting} style={[styles.submitBtn, (!canSubmit || isSubmitting) && styles.submitBtnDisabled]} onPress={submit}>
        <Text style={styles.submitText}>{isSubmitting ? (t('auth:org.sending') || 'שולח...') : (t('auth:org.submit') || 'שליחת בקשה לאישור')}</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>{t('auth:org.hint') || 'לאחר האישור תקבלו גישה לאפליקציה עם הרשאות ניהול ותצוגת תפעול ייעודית.'}</Text>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webScrollContainer}>
        <View style={styles.webScrollContent}>{Content}</View>
      </View>
    );
  }

  return (
    <ScrollContainer
      style={styles.container}
      contentStyle={styles.content}
      showsVerticalScrollIndicator
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {Content}
    </ScrollContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  // Web scroll wrappers
  webScrollContainer: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      overflow: 'auto' as any,
      WebkitOverflowScrolling: 'touch' as any,
      overscrollBehavior: 'contain' as any,
      height: '100vh' as any,
      maxHeight: '100vh' as any,
      width: '100%' as any,
      touchAction: 'auto' as any,
      position: 'relative' as any,
    }),
  } as any,
  webScrollContent: {
    padding: 16,
    paddingBottom: 80,
    width: '100%',
    minHeight: '100%',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
  backText: { color: colors.textPrimary, fontSize: FontSizes.small, fontWeight: '600' },
  title: { fontSize: FontSizes.heading1, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: FontSizes.body, color: colors.textSecondary, textAlign: 'center', marginVertical: 8 },
  sectionHeader: { fontSize: FontSizes.medium, color: colors.textPrimary, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  label: { fontSize: FontSizes.small, color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.backgroundSecondary, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
  tagSelected: { borderColor: colors.primary, backgroundColor: colors.pinkLight },
  tagText: { color: colors.textSecondary },
  tagTextSelected: { color: colors.primary, fontWeight: '700' },
  submitBtn: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontSize: FontSizes.body, fontWeight: '700' },
  hint: { color: colors.textSecondary, fontSize: FontSizes.small, textAlign: 'center', marginTop: 8 },
});


