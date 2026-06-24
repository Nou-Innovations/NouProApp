/**
 * CreateGroupChatScreen
 * Allows users to set a group name, pick a group avatar, review selected members,
 * and create a new group chat.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import { ListItemCard } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { createChat, createUserChat, searchContacts, uploadAttachment, ContactSearchResult } from '../inbox.service';
import { useProfileStore } from '@/shared/store/profileStore';
import { RootStackParamList } from '@/shared/types/navigation';

type CreateGroupChatRouteProp = RouteProp<RootStackParamList, 'CreateGroupChat'>;

export default function CreateGroupChatScreen() {
  const { theme: appTheme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<CreateGroupChatRouteProp>();
  const { selectedContactIds, companyId } = route.params;

  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [contacts, setContacts] = useState<ContactSearchResult[]>([]);
  const currentUser = useProfileStore((state) => state.currentUser);

  // Fetch contact details for selected IDs
  useEffect(() => {
    if (!currentUser?.id) return;

    searchContacts(currentUser.id)
      .then((allContacts) => {
        const selected = allContacts.filter(c => selectedContactIds.includes(c.id));
        setContacts(selected);
      })
      .catch((err) => {
        console.error('[CreateGroupChat] Failed to load contacts:', err);
      });
  }, [currentUser?.id, selectedContactIds]);

  const handlePickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library to set a group picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setGroupAvatar(result.assets[0].uri);
    }
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      Alert.alert('Group name required', 'Please enter a name for the group.');
      return;
    }

    setIsCreating(true);
    try {
      // Upload group avatar if one was selected
      let avatarUrl: string | undefined;
      if (groupAvatar) {
        try {
          avatarUrl = await uploadAttachment(groupAvatar, 'group-avatar.jpg');
        } catch (err) {
          console.warn('[CreateGroupChat] Avatar upload failed, creating group without avatar:', err);
        }
      }

      if (companyId) {
        const newChat = await createChat({
          companyId,
          type: 'internal',
          name: groupName.trim(),
          participants: selectedContactIds,
          avatar: avatarUrl,
        });

        (navigation as any).navigate('Chat', {
          id: newChat.id,
          name: newChat.name,
          isGroup: true,
          avatar: newChat.avatar || avatarUrl,
          partnerId: newChat.id,
          partnerType: 'group',
          unreadCount: 0,
        });
      } else if (currentUser?.id) {
        const newChat = await createUserChat({
          userId: currentUser.id,
          type: 'group',
          name: groupName.trim(),
          participants: selectedContactIds,
          avatar: avatarUrl,
        });

        (navigation as any).navigate('Chat', {
          id: newChat.id,
          name: newChat.name,
          isGroup: true,
          avatar: newChat.avatar || avatarUrl,
          partnerId: newChat.id,
          partnerType: 'group',
          unreadCount: 0,
        });
      } else {
        Alert.alert('Error', 'No user context available. Please log in again.');
      }
    } catch (error) {
      console.error('Failed to create group chat:', error);
      Alert.alert('Error', 'Failed to create group chat. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [groupName, groupAvatar, selectedContactIds, companyId, currentUser?.id, navigation]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top', 'bottom']}>
      <SecondaryHeader
        title="New group"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <KeyboardAwareScreen
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
      >
          {/* Group Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={[styles.avatarPlaceholder, { backgroundColor: appTheme.colors.inputBackground, borderColor: appTheme.colors.borderColor }]}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              {groupAvatar ? (
                <Image source={{ uri: groupAvatar }} style={styles.avatarImage} />
              ) : (
                <Camera size={32} color={appTheme.colors.textMuted} />
              )}
            </TouchableOpacity>
            <Text style={[styles.avatarLabel, { color: appTheme.colors.textSecondary }]}>
              Add group photo
            </Text>
          </View>

          {/* Group Name Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: appTheme.colors.text }]}>
              Group name
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: appTheme.colors.inputBackground,
                  borderColor: appTheme.colors.borderColor,
                  color: appTheme.colors.text,
                },
              ]}
              placeholder="Enter group name..."
              placeholderTextColor={appTheme.colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
              autoFocus
            />
          </View>

          {/* Members List */}
          <View style={styles.membersSection}>
            <Text style={[styles.label, styles.membersSectionLabel, { color: appTheme.colors.text }]}>
              Members ({contacts.length})
            </Text>
            {contacts.map((contact, index) => (
              <ListItemCard
                key={contact.id}
                avatar={
                  contact.avatar
                    ? { type: 'image', imageUri: contact.avatar, userId: contact.id, userName: contact.name }
                    : {
                        type: 'icon',
                        icon: contact.type === 'business' ? 'business' : 'person',
                        iconColor: appTheme.colors.textSecondary,
                        backgroundColor: appTheme.colors.inputBackground,
                      }
                }
                title={contact.name}
                subtitle={contact.type === 'business' ? 'Business' : (contact.role || contact.email || '')}
                showDivider={index < contacts.length - 1}
              />
            ))}
          </View>
      </KeyboardAwareScreen>

      {/* Create Button */}
      <View style={[styles.bottomButton, { paddingBottom: 16, backgroundColor: appTheme.colors.background, borderTopColor: appTheme.colors.surface }]}>
        <AppButton
          title="Create group"
          onPress={handleCreateGroup}
          variant={groupName.trim() ? 'primary' : 'disabled'}
          disabled={!groupName.trim() || isCreating}
          loading={isCreating}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  avatarLabel: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 8,
  },
  inputSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  membersSection: {
    paddingHorizontal: 0,
  },
  membersSectionLabel: {
    paddingHorizontal: 16,
  },
  bottomButton: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
