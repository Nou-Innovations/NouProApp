/**
 * LegalScreen
 * Shared presentational layout for the Terms of Service and Privacy Policy
 * screens: SecondaryHeader (back) + scrollable sections.
 */
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Text, SectionTitle } from '@/shared/components/ui';

export interface LegalSection {
  heading: string;
  body: string;
}

interface LegalScreenProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  onBack: () => void;
}

export default function LegalScreen({ title, lastUpdated, sections, onBack }: LegalScreenProps) {
  const { theme: appTheme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title={title}
        leftAction={{ icon: 'chevron-left', onPress: onBack, accessibilityLabel: 'Go back' }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: appTheme.colors.textMuted }]}>
          Last updated: {lastUpdated}
        </Text>

        {sections.map((section, idx) => (
          <View key={section.heading} style={idx === 0 ? undefined : styles.sectionSpacing}>
            <SectionTitle style={styles.heading}>{section.heading}</SectionTitle>
            <Text style={[styles.body, { color: appTheme.colors.textSecondary }]}>
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 20,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  heading: {
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 22,
  },
});
