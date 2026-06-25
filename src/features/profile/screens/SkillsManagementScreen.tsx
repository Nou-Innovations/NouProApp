import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SectionTitle } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  searchSkills,
  getUserSkills,
  addSkill,
  removeSkill,
} from '../services/profile.service';
import type { Skill, UserSkill } from '@/shared/types/profile';

export default function SkillsManagementScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const currentUserId = useProfileStore((state) => state.currentUser?.id);

  // State
  const [mySkills, setMySkills] = useState<UserSkill[]>([]);
  const [searchResults, setSearchResults] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch user skills
  const fetchMySkills = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const skills = await getUserSkills(currentUserId);
      setMySkills(skills);
    } catch {
      // Silent fail — skills still render empty
    }
  }, [currentUserId]);

  useEffect(() => {
    (async () => {
      await fetchMySkills();
      setIsLoading(false);
    })();
  }, [fetchMySkills]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchSkills(searchQuery.trim());
        // Filter out skills the user already has
        const mySkillIds = new Set(mySkills.map((s) => s.skillId));
        setSearchResults(results.filter((s) => !mySkillIds.has(s.id)));
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, mySkills]);

  const handleAddSkill = async (skillName: string) => {
    if (mySkills.length >= 50) {
      AppAlert.alert('Limit Reached', 'You can add up to 50 skills');
      return;
    }
    setIsAdding(true);
    try {
      await addSkill(skillName);
      setSearchQuery('');
      setSearchResults([]);
      await fetchMySkills();
    } catch (error: any) {
      AppAlert.alert('Error', error?.message || 'Failed to add skill');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      await removeSkill(skillId);
      setMySkills((prev) => prev.filter((s) => s.skillId !== skillId));
    } catch (error: any) {
      AppAlert.alert('Error', error?.message || 'Failed to remove skill');
    }
  };

  const renderSearchResult = ({ item }: { item: Skill }) => (
    <TouchableOpacity
      style={[styles.searchItem, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() => handleAddSkill(item.name)}
      disabled={isAdding}
    >
      <Icon name="add-circle-outline" size={20} color={appTheme.colors.success} />
      <Text style={[styles.searchItemText, { color: appTheme.colors.text }]}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderMySkill = ({ item }: { item: UserSkill }) => (
    <View style={styles.skillPill}>
      <Text style={styles.skillPillText}>{item.skill.name}</Text>
      <TouchableOpacity onPress={() => handleRemoveSkill(item.skillId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="close-circle" size={18} color={appTheme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Manage Skills"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <View style={styles.content}>
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { borderColor: searchQuery ? appTheme.colors.text : appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]}>
            <Icon name="search-outline" size={20} color={appTheme.colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: appTheme.colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search skills to add..."
              placeholderTextColor={appTheme.colors.textMuted}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Icon name="close-circle" size={20} color={appTheme.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <View style={[styles.searchDropdown, { backgroundColor: appTheme.colors.background }]}>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchResult}
                keyboardShouldPersistTaps="handled"
                style={styles.searchList}
              />
            </View>
          )}

          {/* "Add custom" option when search has text but no exact match */}
          {searchQuery.trim() && !searchResults.some((s) => s.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
            <TouchableOpacity
              style={[styles.addCustomButton, { backgroundColor: appTheme.colors.buttonBackground }]}
              onPress={() => handleAddSkill(searchQuery.trim())}
              disabled={isAdding}
            >
              <Icon name="add-circle-outline" size={20} color={appTheme.colors.text} />
              <Text style={[styles.addCustomText, { color: appTheme.colors.text }]}>
                Add "{searchQuery.trim()}" as a new skill
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* My Skills */}
        <View style={styles.mySkillsSection}>
          <SectionTitle style={styles.sectionTitle}>
            My Skills ({mySkills.length}/50)
          </SectionTitle>
          {isLoading ? (
            <ActivityIndicator size="small" color={appTheme.colors.text} style={{ marginTop: 20 }} />
          ) : mySkills.length === 0 ? (
            <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
              Search above to add skills to your profile
            </Text>
          ) : (
            <View style={styles.skillsGrid}>
              {mySkills.map((item) => (
                <View key={item.id}>{renderMySkill({ item })}</View>
              ))}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 12 },
  searchContainer: { paddingTop: 16, zIndex: 1000 },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 8,
    height: 44,
  },
  searchDropdown: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECE6DF',
    maxHeight: 200,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  searchList: { maxHeight: 200 },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  searchItemText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    marginLeft: 10,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  addCustomText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginLeft: 8,
  },
  mySkillsSection: { marginTop: 24 },
  sectionTitle: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: 20,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 6,
  },
  skillPillText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    color: '#1C1917',
  },
});
