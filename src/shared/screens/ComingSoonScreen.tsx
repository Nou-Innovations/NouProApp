/**
 * ComingSoonScreen - Reusable placeholder for features that are part of the
 * Business Workspace navigation but not built yet.
 *
 * Navigated to as `ComingSoon` with a `title` param (the feature name), e.g.
 * navigation.navigate('ComingSoon', { title: 'Categories' }).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import SecondaryHeader from '@/shared/components/layout/headers/SecondaryHeader';
import { EmptyState } from '@/shared/components/ui';
import { RootStackParamList } from '@/shared/types/navigation';

export default function ComingSoonScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'ComingSoon'>>();
  const title = route.params?.title ?? 'This feature';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title={title}
        leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }}
      />
      <EmptyState
        iconName="sparkles-outline"
        title="Coming soon"
        subtitle={`${title} is on the way.`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
