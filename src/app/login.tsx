import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  colors,
  fonts,
  inputStyle,
  primaryButtonStyle,
  primaryButtonTextStyle,
} from '@/lib/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mobile port of mayo-fe's welcome screen (minus the christmas decoration). */
export default function LoginScreen() {
  const { requestLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (submitting) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email jest wymagany.');
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('Podaj poprawny adres email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestLogin(trimmed);
      router.replace('/check-email');
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 0
            ? 'Brak połączenia z serwerem. Sprawdź internet.'
            : e.message
          : 'Coś poszło nie tak. Spróbuj ponownie.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Image
            source={require('../../assets/images/mayo-logo.svg')}
            style={styles.logo}
            contentFit="contain"
          />
          <Image
            source={require('../../assets/images/sosik.png')}
            style={styles.sosik}
            contentFit="contain"
          />
          <Image
            source={require('../../assets/images/clothes.png')}
            style={styles.clothes}
            contentFit="contain"
          />

          <Text style={styles.title}>¡hola!</Text>
          <Text style={styles.subtitle}>
            jaaak miło, że tu jesteś 😌{'\n'}
            wbijaj do mojej przestrzeni{'\n'}i łap polecenia vinted i inspiracje
          </Text>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                focused && styles.inputFocused,
                error != null && styles.inputInvalid,
              ]}
              placeholder="example@gmail.com"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (error) setError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!submitting}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={colors.fontWhite} />
              ) : (
                <View style={styles.buttonContent}>
                  <Image
                    source={require('../../assets/images/magic-link.svg')}
                    style={styles.buttonIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.buttonText}>
                    Wyślij magic link do logowania
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 12, paddingBottom: 32 },
  logo: {
    alignSelf: 'center',
    width: 160,
    height: 160 * (98 / 255),
    marginBottom: 16,
  },
  sosik: { width: '100%', aspectRatio: 1111 / 232 },
  clothes: { width: '100%', aspectRatio: 780 / 377, marginTop: 12 },
  title: {
    marginTop: 32,
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.heading,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  form: { marginTop: 24, marginHorizontal: 20, gap: 12 },
  input: inputStyle,
  inputFocused: { borderColor: colors.inputBorderFocus },
  inputInvalid: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 15, fontFamily: fonts.regular },
  button: primaryButtonStyle,
  buttonDisabled: { opacity: 0.7 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonIcon: { width: 13, height: 13 },
  buttonText: primaryButtonTextStyle,
});
