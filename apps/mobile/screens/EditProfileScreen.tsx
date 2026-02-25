import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform, Image, ActivityIndicator } from 'react-native';
import { logger } from '../utils/loggerService';
import ScrollContainer from '../components/ScrollContainer';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { useUser } from '../stores/userStore';
import { useTranslation } from 'react-i18next';
import { pickImage, takePhoto } from '../utils/fileService';
import { enhancedDB } from '../utils/enhancedDatabaseService';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { selectedUser, setSelectedUserWithMode } = useUser();
  const { t } = useTranslation(['profile', 'common']);

  // Core fields
  const [firstName, setFirstName] = useState((selectedUser?.name || '').split(' ')[0] || '');
  const [lastName, setLastName] = useState((selectedUser?.name || '').split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(selectedUser?.email || '');
  const [phone, setPhone] = useState(selectedUser?.phone || '');
  const [gender, setGender] = useState<'male'|'female'|'other'|''>('');
  const [birthDate, setBirthDate] = useState('');
  const [avatar, setAvatar] = useState(selectedUser?.avatar || '');
  const [city, setCity] = useState(selectedUser?.location?.city || '');
  const [country, setCountry] = useState(selectedUser?.location?.country || '');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [bio, setBio] = useState(selectedUser?.bio || '');
  const [interests, setInterests] = useState((selectedUser?.interests || []).join(', '));
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [language, setLanguage] = useState<'he'|'en'|''>((selectedUser?.settings?.language as any) || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName || !email.trim() || !avatar.trim() || !city.trim() || !country.trim()) {
      Alert.alert(t('common:errorTitle'), t('common:genericTryAgain'));
      return;
    }

    setIsSaving(true);
    try {
      // Prepare data for API (convert interests string to array)
      const interestsArray = interests.trim() 
        ? interests.split(',').map(i => i.trim()).filter(i => i.length > 0)
        : [];

      const updateData = {
        name: fullName,
        avatar_url: avatar.trim(), // API expects avatar_url
        bio: bio.trim(),
        phone: phone.trim(),
        city: city.trim(),
        country: country.trim(),
        interests: interestsArray,
        settings: {
          ...(selectedUser?.settings || {}),
          language: language || (selectedUser?.settings?.language as any) || 'he',
        },
      };

      // Save to database via API
      if (selectedUser?.id) {
        logger.info('EditProfileScreen', 'Saving profile', { userId: selectedUser.id, updateData });
        const response = await enhancedDB.updateUserProfile(selectedUser.id, updateData);
        logger.info('EditProfileScreen', 'Save response', { success: response.success, hasData: !!response.data, error: response.error });
        
        if (response.success && response.data) {
          // Update local state with the response from server (includes all computed fields)
          // Map server response fields to client User interface
          const updatedUser = {
            id: response.data.id,
            name: response.data.name || fullName,
            email: email.trim(), // Keep the email from form (not updated via API)
            phone: response.data.phone || phone.trim(),
            avatar: response.data.avatar_url || response.data.avatar || avatar.trim(),
            bio: response.data.bio || bio.trim(),
            karmaPoints: response.data.karma_points || response.data.karmaPoints || selectedUser?.karmaPoints || 0,
            joinDate: response.data.join_date || response.data.joinDate || selectedUser?.joinDate || new Date().toISOString(),
            isActive: response.data.is_active !== false,
            lastActive: response.data.last_active || response.data.lastActive || new Date().toISOString(),
            location: {
              city: response.data.city || city.trim(),
              country: response.data.country || country.trim(),
            },
            interests: response.data.interests || interestsArray,
            roles: response.data.roles || selectedUser?.roles || ['user'],
            postsCount: response.data.posts_count || response.data.postsCount || selectedUser?.postsCount || 0,
            followersCount: response.data.followers_count || response.data.followersCount || selectedUser?.followersCount || 0,
            followingCount: response.data.following_count || response.data.followingCount || selectedUser?.followingCount || 0,
            notifications: selectedUser?.notifications || [],
            settings: response.data.settings || {
              ...(selectedUser?.settings || {}),
              language: language || (selectedUser?.settings?.language as any) || 'he',
            },
          };
          logger.info('EditProfileScreen', 'Updating user state', { 
            userId: updatedUser.id, 
            bio: updatedUser.bio,
            city: updatedUser.location.city,
            country: updatedUser.location.country 
          });
          await setSelectedUserWithMode(updatedUser as any, 'real');
          
          // Also save to AsyncStorage with 'current_user' key (used by login flow)
          try {
            const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
            await AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
            logger.info('EditProfileScreen', 'Saved user to AsyncStorage', { userId: updatedUser.id });
          } catch (storageError) {
            logger.error('EditProfileScreen', 'Failed to save to AsyncStorage', { error: storageError });
          }
          
          // Show success message - use alert() for web, Alert.alert() for native
          const successMessage = t('profile:edit.saveSuccess', 'הפרופיל נשמר בהצלחה');
          if (Platform.OS === 'web') {
            alert(successMessage);
          } else {
            Alert.alert(t('common:success', 'הצלחה'), successMessage);
          }
          navigation.goBack();
        } else {
          const errorMessage = response.error || t('common:genericTryAgain', 'אירעה שגיאה, נסה שוב');
          logger.error('EditProfileScreen', 'Save failed', { error: response.error, response });
          if (Platform.OS === 'web') {
            alert(t('common:errorTitle', 'שגיאה') + ': ' + errorMessage);
          } else {
            Alert.alert(
              t('common:errorTitle', 'שגיאה'),
              errorMessage
            );
          }
        }
      } else {
        const errorMsg = 'משתמש לא מזוהה';
        logger.error('EditProfileScreen', 'No user ID', { selectedUser });
        if (Platform.OS === 'web') {
          alert(t('common:errorTitle', 'שגיאה') + ': ' + errorMsg);
        } else {
          Alert.alert(t('common:errorTitle', 'שגיאה'), errorMsg);
        }
      }
    } catch (error) {
      logger.error('EditProfileScreen', 'Save exception', { error });
      console.error('Error saving profile:', error);
      const errorMsg = t('common:genericTryAgain', 'אירעה שגיאה בשמירת הפרופיל, נסה שוב');
      if (Platform.OS === 'web') {
        alert(t('common:errorTitle', 'שגיאה') + ': ' + errorMsg);
      } else {
        Alert.alert(
          t('common:errorTitle', 'שגיאה'),
          errorMsg
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async () => {
    const result = await pickImage();
    if (result.success && result.fileData) {
      setAvatar(result.fileData.uri);
    } else if (result.error) {
      Alert.alert(t('common:errorTitle'), result.error);
    }
  };

  const handleTakePhoto = async () => {
    const result = await takePhoto();
    if (result.success && result.fileData) {
      setAvatar(result.fileData.uri);
    } else if (result.error) {
      Alert.alert(t('common:errorTitle'), result.error);
    }
  };

  return (
    <View style={styles.pageWrapper}>
      {/* Top bar back button */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          <Text style={styles.backText}>{t('common:back')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollContainer
        style={styles.container}
        contentStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={Platform.OS === 'ios'}
      >
      <Text style={styles.header}>{t('profile:banner.editTitle')}</Text>

      {/* Profile image picker */}
      <View style={styles.avatarRow}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person-outline" size={28} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.avatarButtons}>
          <TouchableOpacity style={styles.smallButton} onPress={handlePickImage}>
            <Ionicons name="image-outline" size={16} color={colors.white} />
            <Text style={styles.smallButtonText}>{t('profile:edit.gallery')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallButton, { backgroundColor: colors.primary }]} onPress={handleTakePhoto}>
            <Ionicons name="camera-outline" size={16} color={colors.white} />
            <Text style={styles.smallButtonText}>{t('profile:edit.camera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButtonFixed, isSaving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={colors.white} />
                <Text style={styles.saveText}>{t('common:done')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Name */}
      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t('profile:edit.firstName')}</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder={t('profile:edit.firstName')} />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
          <Text style={styles.label}>{t('profile:edit.lastName')}</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder={t('profile:edit.lastName')} />
        </View>
      </View>

      {/* Contact */}
      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t('profile:edit.email')}</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={'email@example.com'} keyboardType="email-address" autoCapitalize="none" />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
          <Text style={styles.label}>{t('profile:edit.phone')}</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={'+9725XXXXXXXX'} keyboardType="phone-pad" />
        </View>
      </View>

      {/* Location */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('profile:banner.fields.avatar')}</Text>
        <TextInput style={styles.input} value={avatar} onChangeText={setAvatar} placeholder={t('profile:banner.fields.avatar')} />
      </View>
      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t('profile:edit.city')}</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder={t('profile:edit.city')} />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
          <Text style={styles.label}>{t('profile:edit.country')}</Text>
          <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder={t('profile:edit.country')} />
        </View>
      </View>
      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t('profile:edit.street')}</Text>
          <TextInput style={styles.input} value={street} onChangeText={setStreet} placeholder={t('profile:edit.street')} />
        </View>
        <View style={[styles.fieldGroup, { width: 120, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
          <Text style={styles.label}>{t('profile:edit.houseNumber')}</Text>
          <TextInput style={styles.input} value={houseNumber} onChangeText={setHouseNumber} placeholder={t('profile:edit.houseNumber')} />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
          <Text style={styles.label}>{t('profile:edit.zipcode')}</Text>
          <TextInput style={styles.input} value={zipcode} onChangeText={setZipcode} placeholder={t('profile:edit.zipcode')} />
        </View>
      </View>

      {/* Personal */}
      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t('profile:edit.gender')}</Text>
          <TextInput style={styles.input} value={gender} onChangeText={(v)=>setGender(v as any)} placeholder={t('profile:edit.genderPlaceholder')} />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
          <Text style={styles.label}>{t('profile:edit.birthDate')}</Text>
          <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder={t('profile:edit.birthDatePlaceholder')} />
        </View>
      </View>

      {/* Social */}
      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t('profile:edit.website')}</Text>
          <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder={'https://example.com'} autoCapitalize="none" />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
          <Text style={styles.label}>{t('profile:edit.linkedin')}</Text>
          <TextInput style={styles.input} value={linkedin} onChangeText={setLinkedin} placeholder={'https://linkedin.com/in/...'} autoCapitalize="none" />
        </View>
      </View>
      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t('profile:edit.facebook')}</Text>
          <TextInput style={styles.input} value={facebook} onChangeText={setFacebook} placeholder={'https://facebook.com/...'} autoCapitalize="none" />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
          <Text style={styles.label}>{t('profile:edit.instagram')}</Text>
          <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} placeholder={'https://instagram.com/...'} autoCapitalize="none" />
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t('profile:edit.preferredLanguage')}</Text>
          <TextInput style={styles.input} value={language} onChangeText={(v)=>setLanguage(v as any)} placeholder={t('profile:edit.preferredLanguagePlaceholder')} autoCapitalize="none" />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
          <Text style={styles.label}>{t('profile:edit.interests')}</Text>
          <TextInput style={styles.input} value={interests} onChangeText={setInterests} placeholder={t('profile:edit.interestsPlaceholder')} />
        </View>
      </View>

      <View style={[styles.fieldRow]}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
        <Text style={styles.label}>{t('profile:banner.fields.city')}</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder={t('profile:banner.fields.city')} />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginLeft: LAYOUT_CONSTANTS.SPACING.SM }]}>
        <Text style={styles.label}>{t('profile:banner.fields.country')}</Text>
        <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder={t('profile:banner.fields.country')} />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('profile:banner.fields.bio')}</Text>
        <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} placeholder={t('profile:banner.fields.bio')} multiline />
      </View>
      </ScrollContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  pageWrapper: { flex: 1, backgroundColor: colors.background },
  topBar: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  backText: { color: colors.textPrimary, fontSize: FontSizes.body },
  container: { flex: 1 },
  content: { padding: LAYOUT_CONSTANTS.SPACING.LG },
  header: { fontSize: FontSizes.heading3, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: LAYOUT_CONSTANTS.SPACING.LG },
  fieldGroup: { marginBottom: LAYOUT_CONSTANTS.SPACING.MD },
  fieldRow: { flexDirection: 'row-reverse', gap: LAYOUT_CONSTANTS.SPACING.SM },
  label: { fontSize: FontSizes.small, color: colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8, textAlign: 'right' },
  avatarRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: LAYOUT_CONSTANTS.SPACING.MD, marginBottom: LAYOUT_CONSTANTS.SPACING.LG },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.backgroundSecondary },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarButtons: { flexDirection: 'row-reverse', gap: LAYOUT_CONSTANTS.SPACING.SM, flexWrap: 'wrap', alignItems: 'center' },
  smallButton: { backgroundColor: colors.secondary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  smallButtonText: { color: colors.white, fontSize: FontSizes.small, fontWeight: '600' },
  saveButtonFixed: { backgroundColor: colors.secondary, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: FontSizes.body, fontWeight: '600' },
});


