import { designTokens } from '@topems/tokens';
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Card, Title } from 'react-native-paper';
import { useAuthStore } from '@/store/authStore';
import type { LoginCredentials } from '@/types';
import { zh } from '../i18n/zh';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(zh['common.alertHint'], zh['login.enterCredentials']);
      return;
    }

    const credentials: LoginCredentials = {
      username: username.trim(),
      password: password.trim(),
    };

    await login(credentials);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>TOPEMS Mobile</Title>
          <Text style={styles.subtitle}>{zh['login.welcome']}</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            label={zh['login.username']}
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            mode="outlined"
            onFocus={clearError}
          />

          <TextInput
            label={zh['login.password']}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            mode="outlined"
            secureTextEntry
            onFocus={clearError}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? zh['login.loading'] : zh['login.submit']}
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: designTokens.colors.surface[100],
  },
  card: {
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: designTokens.colors.blue[900],
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    height: 50,
  },
  errorContainer: {
    backgroundColor: designTokens.colors.error[100],
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: designTokens.colors.error[600],
    fontSize: 14,
  },
});

export default LoginPage;
