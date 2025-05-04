import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useStore } from '../store';
import { chatService } from '../services/chat';
import ChatMessage from '../components/ChatMessage';
import { Feather as Icon } from '@expo/vector-icons';

export default function InboxScreen() {
  const [message, setMessage] = useState('');
  const { channels, messages, activeChannel, currentUser } = useStore();

  useEffect(() => {
    if (currentUser) {
      chatService.connect(currentUser.id);
    }
    return () => {
      chatService.disconnect();
    };
  }, [currentUser]);

  const handleSendMessage = () => {
    if (!message.trim() || !activeChannel) return;
    
    chatService.sendMessage(activeChannel, message.trim());
    setMessage('');
  };

  const renderChannelItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => chatService.joinChannel(item.id)}
      className={`p-4 border-b border-gray-200 ${
        activeChannel === item.id ? 'bg-gray-100' : ''
      }`}
    >
      <Text className="text-lg font-semibold">{item.name}</Text>
      {item.lastMessage && (
        <Text className="text-sm text-gray-500" numberOfLines={1}>
          {item.lastMessage.content}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item }) => (
    <ChatMessage
      message={item.content}
      timestamp={item.timestamp}
      isOutgoing={item.senderId === currentUser?.id}
      type={item.type}
      attachmentUrl={item.attachmentUrl}
    />
  );

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row border-b border-gray-200">
        <FlatList
          data={channels}
          renderItem={renderChannelItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
        />
      </View>

      {activeChannel ? (
        <>
          <FlatList
            data={messages[activeChannel] || []}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            className="flex-1 px-4"
            inverted
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="border-t border-gray-200 p-4"
          >
            <View className="flex-row items-center">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-2"
                multiline
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                className="bg-primary w-10 h-10 rounded-full items-center justify-center"
              >
                <Icon name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Select a channel to start chatting</Text>
        </View>
      )}
    </View>
  );
} 