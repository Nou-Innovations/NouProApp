/**
 * Demo Mode Badge
 * 
 * Displays a subtle "Demo Mode" indicator when the app is running in demo environment.
 * Only visible when IS_DEMO = true (preview builds via EAS).
 */

import React from 'react';
import { View, Text } from 'react-native';
import { IS_DEMO } from '@/config/env';

export const DemoModeBadge: React.FC = () => {
  // Only render in demo mode
  if (!IS_DEMO) {
    return null;
  }

  return (
    <View className="bg-amber-500/20 border border-amber-500/40 rounded-lg px-3 py-2 mb-4">
      <View className="flex-row items-center gap-2">
        <View className="w-2 h-2 rounded-full bg-amber-500" />
        <Text className="text-amber-500 font-semibold text-sm">
          Demo Mode
        </Text>
      </View>
      <Text className="text-amber-400/80 text-xs mt-1">
        This is a preview build for testing and demos only.
      </Text>
    </View>
  );
};

export default DemoModeBadge;
