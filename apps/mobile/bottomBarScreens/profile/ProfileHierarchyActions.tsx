import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../globals/types';
import colors from '../../globals/colors';
import { apiService } from '../../utils/apiService';
import { createConversation, conversationExists } from '../../utils/chatService';
import { navigateToChatDetail } from '../../navigations/chatDetailNavigation';
import { styles } from './profileScreen.styles';
import type { CharacterType } from './profileScreenTypes';

type Props = Readonly<{
  navigation: NavigationProp<RootStackParamList>;
  selectedUser: CharacterType;
  displayUser: CharacterType;
  setViewingUser: React.Dispatch<React.SetStateAction<CharacterType | null>>;
}>;

async function openChatForTaskRequest(
  navigation: NavigationProp<RootStackParamList>,
  selectedUserId: string,
  displayUser: CharacterType,
): Promise<void> {
  const existingConvId = await conversationExists(selectedUserId, displayUser.id);
  let conversationId = existingConvId;
  if (!conversationId) {
    conversationId = await createConversation([selectedUserId, displayUser.id]);
  }
  navigateToChatDetail(navigation, {
    conversationId,
    otherUserId: displayUser.id,
    userName: displayUser.name,
    userAvatar: displayUser.avatar,
  });
}

function scheduleTaskRequestChat(
  navigation: NavigationProp<RootStackParamList>,
  selectedUserId: string,
  displayUser: CharacterType,
): void {
  void openChatForTaskRequest(navigation, selectedUserId, displayUser).catch((e) =>
    console.error('ProfileHierarchyActions: task request chat failed', e),
  );
}

async function runHierarchyMutation(
  displayUserId: string,
  managerUserId: string,
  action: 'add' | 'remove',
  setViewingUser: Props['setViewingUser'],
): Promise<void> {
  try {
    const res = await apiService.manageHierarchy(displayUserId, action, managerUserId);
    if (res.success) {
      Alert.alert('הצלחה', res.message);
      setViewingUser((prev) =>
        prev ? { ...prev, parentManagerId: action === 'add' ? managerUserId : null } : null,
      );
      return;
    }
    Alert.alert('שגיאה', res.error || 'פעולה נכשלה');
  } catch (err) {
    console.error(err);
    Alert.alert('שגיאה', 'שגיאה בתקשורת');
  }
}

export function ProfileHierarchyActions({ navigation, selectedUser, displayUser, setViewingUser }: Props) {
  const isSubordinate = displayUser.parentManagerId === selectedUser.id;
  const isMyManager = selectedUser.parentManagerId === displayUser.id;

  if (isMyManager) {
    return (
      <TouchableOpacity
        style={[styles.messageButton, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}
        onPress={() => {
          Alert.alert('בקשת משימה', 'האם לשלוח בקשת משימה למנהל זה?', [
            { text: 'ביטול', style: 'cancel' },
            {
              text: 'שלח',
              onPress: () => scheduleTaskRequestChat(navigation, selectedUser.id, displayUser),
            },
          ]);
        }}
      >
        <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
        <Text style={[styles.messageButtonText, { color: colors.primary }]}>בקש משימה</Text>
      </TouchableOpacity>
    );
  }

  const action = isSubordinate ? 'remove' : 'add';
  const title = isSubordinate ? 'הסר מנהל' : 'הפוך למנהל בצוות';
  const msg = isSubordinate
    ? 'האם אתה בטוח שברצונך להסיר משתמש זה מניהול תחתיך? המשימות יועברו אליך.'
    : 'האם אתה בטוח שברצונך להפוך משתמש זה למנהל תחתיך?';

  return (
    <TouchableOpacity
      style={[
        styles.messageButton,
        isSubordinate
          ? { backgroundColor: `${colors.error}10`, borderColor: colors.error }
          : { backgroundColor: `${colors.secondary}10`, borderColor: colors.secondary },
      ]}
      onPress={() => {
        Alert.alert(title, msg, [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'אישור',
            style: isSubordinate ? 'destructive' : 'default',
            onPress: () =>
              void runHierarchyMutation(displayUser.id, selectedUser.id, action, setViewingUser),
          },
        ]);
      }}
    >
      <Ionicons
        name={isSubordinate ? 'person-remove-outline' : 'person-add-outline'}
        size={20}
        color={isSubordinate ? colors.error : colors.secondary}
      />
      <Text style={[styles.messageButtonText, { color: isSubordinate ? colors.error : colors.secondary }]}>
        {isSubordinate ? 'הסר מנהל' : 'הפוך למנהל'}
      </Text>
    </TouchableOpacity>
  );
}
