/**
 * LaunchScreenWrapper
 * Wraps the LaunchScreen component to work with React Navigation
 */

import React, { useCallback, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import LaunchScreen from '@/shared/components/ui/LaunchScreen';

type Props = NativeStackScreenProps<AuthStackParamList, 'Launch'>;

export default function LaunchScreenWrapper({ navigation }: Props) {
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(undefined);

  // Handle "Join the club" button press - goes to registration
  const handleJoin = useCallback(() => {
    navigation.navigate('CreateAccount');
  }, [navigation]);

  // Handle "Sign In" link press - goes to login
  const handleSignIn = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  // Handle launch animation finished (for signed-in users)
  // This won't be called since isSignedIn is false
  const handleFinished = useCallback(() => {
    // Not used when isSignedIn is false
  }, []);

  return (
    <LaunchScreen
      isSignedIn={false}
      progress={loadingProgress}
      onJoin={handleJoin}
      onSignIn={handleSignIn}
      onFinished={handleFinished}
      backgroundImage={require('../../../../assets/launch/bg-earth.jpg')}
    />
  );
}
