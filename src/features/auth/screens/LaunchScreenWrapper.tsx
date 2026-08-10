/**
 * LaunchScreenWrapper
 * Wraps the LaunchScreen component to work with React Navigation
 */

import React, { useCallback, useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import LaunchScreen from '@/shared/components/ui/LaunchScreen';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppAlert } from '@/shared/services/appAlert';

type Props = NativeStackScreenProps<AuthStackParamList, 'Launch'>;

export default function LaunchScreenWrapper({ navigation }: Props) {
  // An involuntary logout used to dump the user here with no explanation at all — the
  // server's "your session has expired" message was never shown anywhere (audit A-5).
  const logoutReason = useProfileStore((state) => state.logoutReason);
  useEffect(() => {
    if (logoutReason !== 'session_expired') return;
    // Clear first so it can't fire twice on a re-render.
    useProfileStore.setState({ logoutReason: null });
    AppAlert.alert(
      'Signed out',
      'Your session expired. Please sign in again.',
      [{ text: 'OK' }],
    );
  }, [logoutReason]);

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
