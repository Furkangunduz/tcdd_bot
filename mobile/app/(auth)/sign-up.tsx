import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetView } from '@gorhom/bottom-sheet';
import { Link } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useColorScheme } from '~/lib/useColorScheme';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { PrivacyPolicy } from '../../components/profile/PrivacyPolicy';
import { TermsOfService } from '../../components/profile/TermsOfService';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useAuth } from '../../lib/auth';

export default function SignUp() {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [activeSheet, setActiveSheet] = useState<'privacyPolicy' | 'termsOfService' | null>(null);
  const { t } = useTranslation();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.5}
      />
    ),
    []
  );

  const showPrivacyPolicy = () => {
    setActiveSheet('privacyPolicy');
    bottomSheetRef.current?.expand();
  };

  const showTermsOfService = () => {
    setActiveSheet('termsOfService');
    bottomSheetRef.current?.expand();
  };

  const renderBottomSheetContent = () => {
    switch (activeSheet) {
      case 'privacyPolicy':
        return <PrivacyPolicy onClose={() => bottomSheetRef.current?.close()} />;
      case 'termsOfService':
        return <TermsOfService onClose={() => bottomSheetRef.current?.close()} />;
      default:
        return null;
    }
  };

  async function handleSignUp() {
    if (!name.trim()) {
      setError(t('auth.errors.nameRequired'));
      return;
    }
    
    if (!lastName.trim()) {
      setError(t('auth.errors.lastNameRequired'));
      return;
    }

    if (!email.trim()) {
      setError(t('auth.errors.emailRequired'));
      return;
    }

    if (!password.trim()) {
      setError(t('auth.errors.passwordRequired'));
      return;
    }
    
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      setError('');
      await signUp(email, password, name, lastName);
    } catch (err: any) {
      if (err?.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(t('auth.errors.registrationFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      key="sign-up-screen"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <View className="absolute top-28 right-10 z-10 flex-row items-center gap-4">
        <LanguageSwitch />
        <ThemeToggle />
      </View>

      <View className="flex-1 px-6">
        <Animated.View 
          entering={FadeInUp.delay(200).duration(1000)}
          className="flex-1 justify-center"
        >
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-foreground">Bilet Buldum</Text>
            <Text className="text-base text-muted-foreground mt-1">{t('auth.createAccount')}</Text>
          </View>

          {error ? (
            <Animated.View 
              entering={FadeInDown.duration(400)}
              className="bg-destructive/10 p-3 rounded-lg mb-4"
            >
              <Text className="text-destructive text-center">{error}</Text>
            </Animated.View>
          ) : null}

          <View className="gap-5">
            <Animated.View 
              entering={FadeInDown.delay(400).duration(1000)}
              className="gap-2"
            >
              <Text className="text-sm font-medium text-foreground ml-1">{t('auth.firstName')}</Text>
              <TextInput
                placeholder={t('auth.enterFirstName')}
                value={name}
                onChangeText={setName}
                className="bg-card text-foreground px-4 py-3 rounded-lg border border-border"
                placeholderTextColor="#666"
                editable={!isLoading}
              />
            </Animated.View>

            <Animated.View 
              entering={FadeInDown.delay(600).duration(1000)}
              className="gap-2"
            >
              <Text className="text-sm font-medium text-foreground ml-1">{t('auth.lastName')}</Text>
              <TextInput
                placeholder={t('auth.enterLastName')}
                value={lastName}
                onChangeText={setLastName}
                className="bg-card text-foreground px-4 py-3 rounded-lg border border-border"
                placeholderTextColor="#666"
                editable={!isLoading}
              />
            </Animated.View>

            <Animated.View 
              entering={FadeInDown.delay(800).duration(1000)}
              className="gap-2"
            >
              <Text className="text-sm font-medium text-foreground ml-1">{t('auth.email')}</Text>
              <TextInput
                placeholder={t('auth.enterEmail')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-card text-foreground px-4 py-3 rounded-lg border border-border"
                placeholderTextColor="#666"
                editable={!isLoading}
              />
            </Animated.View>

            <Animated.View 
              entering={FadeInDown.delay(1000).duration(1000)}
              className="gap-2"
            >
              <Text className="text-sm font-medium text-foreground ml-1">{t('auth.password')}</Text>
              <TextInput
                placeholder={t('auth.createPassword')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                className="bg-card text-foreground px-4 py-3 rounded-lg border border-border"
                placeholderTextColor="#666"
                editable={!isLoading}
              />
            </Animated.View>

            <Animated.View 
              entering={FadeInDown.delay(1200).duration(1000)}
              className="mt-4"
            >
              <Text className="text-sm text-muted-foreground text-center mb-4">
                {t('auth.agreeToTerms')}{' '}
                <TouchableWithoutFeedback
                 className='p-0 m-0' onPress={showTermsOfService} disabled={isLoading}>
                  <Text className="text-primary font-medium">{t('auth.termsOfService')}</Text>
                </TouchableWithoutFeedback>
                {' '}{t('auth.and')}{' '}
                <TouchableWithoutFeedback
                 onPress={showPrivacyPolicy} disabled={isLoading}>
                  <Text className="text-primary font-medium">{t('auth.privacyPolicy')}</Text>
                </TouchableWithoutFeedback>
              </Text>

              <TouchableOpacity
                onPress={handleSignUp}
                disabled={isLoading}
                className={`bg-primary h-12 rounded-lg items-center justify-center flex-row ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator color={isDark ? '#000' : '#fff'} size="small" />
                    <Text className="text-primary-foreground text-lg font-semibold ml-2">{t('auth.creatingAccount')}</Text>
                  </>
                ) : (
                  <Text className="text-primary-foreground text-lg font-semibold">{t('auth.createAccount')}</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View 
              entering={FadeInDown.delay(1400).duration(1000)}
              className="flex-row justify-center mt-4"
            >
              <Text className="text-muted-foreground">{t('auth.haveAccount')}</Text>
              <Link href="/sign-in" asChild>
                <TouchableOpacity disabled={isLoading}>
                  <Text className={`text-primary font-semibold ml-1 ${isLoading ? 'opacity-50' : ''}`}>{t('auth.signIn')}</Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['80%']}
        index={-1}
        enablePanDownToClose={true}
        onClose={() => {
          setActiveSheet(null);
          setError('');
        }}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: isDark ? 'hsl(224 71% 4%)' : 'hsl(0 0% 100%)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderTopColor: isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)',
          shadowColor: isDark ? 'hsl(240 3.7% 15.9%)' : '#000',
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: isDark ? 0.5 : 0.1,
          shadowRadius: 8,
          elevation: 16,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)',
          width: 32,
          height: 4,
          borderRadius: 2,
        }}
      >
        <BottomSheetView className="flex-1 bg-background">
          {renderBottomSheetContent()}
        </BottomSheetView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
} 