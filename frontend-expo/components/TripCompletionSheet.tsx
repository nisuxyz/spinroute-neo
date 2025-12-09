import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, useColorScheme, Keyboard } from 'react-native';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { THEME } from '@/lib/theme';

interface TripCompletionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, notes: string) => void;
}

const TripCompletionSheet: React.FC<TripCompletionSheetProps> = ({ visible, onClose, onSave }) => {
  const sheetRef = useRef<BaseSheetRef>(null);
  const colorScheme = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
      setTitle('');
      setNotes('');
    }
  }, [visible]);

  const handleSave = () => {
    Keyboard.dismiss();
    onSave(title.trim(), notes.trim());
    onClose();
  };

  const handleSkip = () => {
    Keyboard.dismiss();
    onSave('', '');
    onClose();
  };

  return (
    <BaseSheet
      ref={sheetRef}
      name="TripCompletionSheet"
      detents={['auto']}
      onDismiss={handleSkip}
      scrollable={false}
      grabberVisible={true}
    >
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-xl font-semibold">Trip Complete</Text>
          <Button variant="ghost" size="sm" onPress={handleSkip}>
            <Text className="text-base text-muted-foreground">Skip</Text>
          </Button>
        </View>

        {/* Title Input */}
        <View className="mb-6">
          <Text
            variant="small"
            className="text-muted-foreground mb-3 font-semibold uppercase tracking-wide"
          >
            Title (optional)
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Morning commute"
            placeholderTextColor={theme.mutedForeground}
            className="bg-muted px-4 py-3 rounded-lg text-foreground border border-border"
            style={{ fontSize: 16 }}
            returnKeyType="next"
          />
        </View>

        {/* Notes Input */}
        <View className="mb-6">
          <Text
            variant="small"
            className="text-muted-foreground mb-3 font-semibold uppercase tracking-wide"
          >
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="How was your ride?"
            placeholderTextColor={theme.mutedForeground}
            className="bg-muted px-4 py-3 rounded-lg text-foreground border border-border"
            style={{ fontSize: 16, minHeight: 100, textAlignVertical: 'top' }}
            multiline
            numberOfLines={4}
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
          />
        </View>

        {/* Action Buttons */}
        <View className="flex-col gap-3 mt-2 mb-4">
          <Button variant="outline" size="xl" className="flex-1" onPress={handleSkip}>
            <Text>Skip</Text>
          </Button>
          <Button size="xl" className="flex-1" onPress={handleSave}>
            <Text className="text-primary-foreground">Save Trip</Text>
          </Button>
        </View>
      </View>
    </BaseSheet>
  );
};

export default TripCompletionSheet;
