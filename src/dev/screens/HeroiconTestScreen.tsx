import React from 'react';
import { View, Text } from 'react-native';
import { HomeIcon as HomeSolid } from 'react-native-heroicons/solid';
import { HomeIcon as HomeOutline } from 'react-native-heroicons/outline';

export default function HeroiconTestScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Heroicons Test</Text>
      <HomeSolid color="#000" size={48} />
      <HomeOutline color="#000" size={48} />
    </View>
  );
} 