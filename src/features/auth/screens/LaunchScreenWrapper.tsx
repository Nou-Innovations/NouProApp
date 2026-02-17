/**
 * LaunchScreenWrapper
 * Wraps the LaunchScreen component to work with React Navigation
 */

import React, { useCallback } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import LaunchScreen from '@/shared/components/ui/LaunchScreen';

type Props = NativeStackScreenProps<AuthStackParamList, 'Launch'>;

export default function LaunchScreenWrapper({ navigation }: Props) {
  const handleJoin = useCallback(() => {
    navigation.navigate('CreateAccount');
  }, [navigation]);

  const handleSignIn = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  return (
    <LaunchScreen
      isSignedIn={false}
      onJoin={handleJoin}
      onSignIn={handleSignIn}
      onFinished={() => {}}
      backgroundImage={require('../../../../assets/launch/bg-earth.jpg')}
    />
  );
}
