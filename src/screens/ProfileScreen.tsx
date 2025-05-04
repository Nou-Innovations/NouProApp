import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Workspace Card */}
        <View className="p-4 bg-card border-b border-gray-200">
          <View className="flex-row items-center">
            <Image
              className="w-12 h-12 rounded-full"
              source={{ uri: 'https://via.placeholder.com/48' }}
            />
            <View className="ml-3">
              <Text className="text-lg font-bold">Business Name</Text>
              <Text className="text-sm text-gray-500">Distributor</Text>
            </View>
          </View>
        </View>
        
        <ScrollView className="flex-1">
          {/* Staff Section */}
          <View className="p-4 border-b border-gray-200">
            <Text className="text-lg font-bold mb-2">Staff</Text>
            {/* Staff list will go here */}
          </View>
          
          {/* Settings Section */}
          <View className="p-4 border-b border-gray-200">
            <Text className="text-lg font-bold mb-2">Settings</Text>
            {/* Settings options will go here */}
          </View>
          
          {/* Community Section */}
          <View className="p-4">
            <Text className="text-lg font-bold mb-2">Help the Community Grow</Text>
            {/* Community features will go here */}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
} 