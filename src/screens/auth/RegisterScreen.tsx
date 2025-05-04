import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useStore } from '../../store';
import { authAPI } from '../../services/api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword || !businessName) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await authAPI.register({
        name,
        email,
        password,
        businessName,
      });
      setCurrentUser(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1">
        <View className="p-6">
          <Text className="text-3xl font-bold text-center mb-8">Create Account</Text>

          {error ? (
            <Text className="text-red-500 text-center mb-4">{error}</Text>
          ) : null}

          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 mb-2">Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                className="bg-gray-100 px-4 py-3 rounded-lg"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-gray-100 px-4 py-3 rounded-lg"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2">Business Name</Text>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Enter your business name"
                className="bg-gray-100 px-4 py-3 rounded-lg"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                className="bg-gray-100 px-4 py-3 rounded-lg"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2">Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                className="bg-gray-100 px-4 py-3 rounded-lg"
              />
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              className="bg-primary py-3 rounded-lg mt-4"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold">
                  Register
                </Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4">
              <Text className="text-gray-600">Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text className="text-primary font-semibold">Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 