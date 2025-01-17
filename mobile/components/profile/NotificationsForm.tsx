import * as Haptics from 'expo-haptics';
import { Bell, Mail, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Text, TouchableOpacity, View } from 'react-native';

interface NotificationsFormProps {
  preferences: {
    email: boolean;
    push: boolean;
  };
  onClose: () => void;
  onSubmit: () => Promise<void>;
  onChangePreferences: (prefs: { email: boolean; push: boolean }) => void;
  isLoading: boolean;
  error: string | null;
}

export function NotificationsForm({
  preferences,
  onClose,
  onSubmit,
  onChangePreferences,
  isLoading,
  error
}: NotificationsFormProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleToggle = (type: 'email' | 'push') => {
    Haptics.impactAsync(
      preferences[type] 
        ? Haptics.ImpactFeedbackStyle.Light 
        : Haptics.ImpactFeedbackStyle.Medium
    );
    onChangePreferences({ 
      ...preferences, 
      [type]: !preferences[type] 
    });
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onSubmit();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Animated.View 
      style={{ 
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }]
      }} 
      className="p-4 bg-background"
    >
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-foreground">{t('profile.notifications.title')}</Text>
        <TouchableOpacity 
          onPress={handleClose}
          className="p-2 rounded-full bg-muted/10 active:bg-muted/20"
        >
          <X size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
        </TouchableOpacity>
      </View>

      <View>
        <TouchableOpacity
          onPress={() => handleToggle('email')}
          className="flex-row items-center justify-between p-4 bg-card border border-input rounded-xl active:bg-muted/5 mb-4"
        >
          <View className="flex-row items-center gap-5">
            <Mail size={20} color={isDark ? '#A1A1AA' : '#71717A'} className="mr-3" />
            <View>
              <Text className="text-foreground font-semibold">{t('profile.notifications.emailTitle')}</Text>
              <Text className="text-sm text-muted-foreground">{t('profile.notifications.emailDescription')}</Text>
            </View>
          </View>
          <View 
            className={`w-6 h-6 rounded-full items-center justify-center ${
              preferences.email ? 'bg-primary' : 'bg-muted'
            }`}
          >
            {preferences.email && (
              <View className="w-3 h-3 rounded-full bg-primary-foreground" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleToggle('push')}
          className="flex-row items-center justify-between p-4 bg-card border border-input rounded-xl active:bg-muted/5 mb-4"
        >
          <View className="flex-row items-center gap-5">
            <Bell size={20} color={isDark ? '#A1A1AA' : '#71717A'} className="mr-3" />
            <View>
              <Text className="text-foreground font-semibold">{t('profile.notifications.pushTitle')}</Text>
              <Text className="text-sm text-muted-foreground">{t('profile.notifications.pushDescription')}</Text>
            </View>
          </View>
          <View 
            className={`w-6 h-6 rounded-full items-center justify-center ${
              preferences.push ? 'bg-primary' : 'bg-muted'
            }`}
          >
            {preferences.push && (
              <View className="w-3 h-3 rounded-full bg-primary-foreground" />
            )}
          </View>
        </TouchableOpacity>

        {error && (
          <View className="bg-destructive/10 p-3 rounded-lg mb-4">
            <Text className="text-destructive text-sm">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className={`h-12 rounded-xl items-center justify-center ${
            isLoading ? 'bg-primary/70' : 'bg-primary active:bg-primary/90'
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color={isDark ? '#000' : '#fff'} />
          ) : (
            <Text className="text-primary-foreground font-semibold">{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
} 