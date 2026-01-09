import React from 'react';
import { View, Text, Image } from 'react-native';

type ChatMessageProps = {
  message: string;
  timestamp: string;
  isOutgoing: boolean;
  senderName?: string;
  senderAvatar?: string;
  type?: 'text' | 'image' | 'voice' | 'pdf' | 'invoice';
  attachmentUrl?: string;
};

export default function ChatMessage({
  message,
  timestamp,
  isOutgoing,
  senderName,
  senderAvatar,
  type = 'text',
  attachmentUrl,
}: ChatMessageProps) {
  return (
    <View className={`flex-row ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isOutgoing && senderAvatar && (
        <Image
          source={{ uri: senderAvatar }}
          className="w-8 h-8 rounded-full mr-2"
        />
      )}
      <View className={`max-w-[80%] ${isOutgoing ? 'bg-primary' : 'bg-gray-200'} rounded-lg p-3`}>
        {!isOutgoing && senderName && (
          <Text className="text-sm font-semibold text-gray-700 mb-1">{senderName}</Text>
        )}
        
        {type === 'text' && (
          <Text className={`text-base ${isOutgoing ? 'text-white' : 'text-gray-800'}`}>
            {message}
          </Text>
        )}
        
        {type === 'image' && attachmentUrl && (
          <Image
            source={{ uri: attachmentUrl }}
            className="w-48 h-48 rounded-lg"
            resizeMode="cover"
          />
        )}
        
        {type === 'voice' && (
          <View className="flex-row items-center">
            <View className="w-6 h-6 bg-white rounded-full mr-2" />
            <Text className={`text-sm ${isOutgoing ? 'text-white' : 'text-gray-800'}`}>
              Voice Message
            </Text>
          </View>
        )}
        
        {type === 'pdf' && (
          <View className="flex-row items-center">
            <View className="w-6 h-6 bg-white rounded mr-2" />
            <Text className={`text-sm ${isOutgoing ? 'text-white' : 'text-gray-800'}`}>
              PDF Document
            </Text>
          </View>
        )}
        
        {type === 'invoice' && (
          <View className="flex-row items-center">
            <View className="w-6 h-6 bg-white rounded mr-2" />
            <Text className={`text-sm ${isOutgoing ? 'text-white' : 'text-gray-800'}`}>
              Invoice
            </Text>
          </View>
        )}
        
        <Text className={`text-xs mt-1 ${isOutgoing ? 'text-white/80' : 'text-gray-500'}`}>
          {timestamp}
        </Text>
      </View>
    </View>
  );
} 