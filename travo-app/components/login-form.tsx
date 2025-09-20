import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {
  const [touristId, setTouristId] = useState('T12345'); // Pre-fill with demo data
  const [password, setPassword] = useState('password123'); // Pre-fill with demo data
  const colorScheme = useColorScheme();
  const { login, loading } = useAuth();

  const handleLogin = async () => {
    if (!touristId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both Tourist ID and Password');
      return;
    }
    
    try {
      const success = await login(touristId, password);
      if (success) {
        Alert.alert('Success', `Welcome to Travo, ${touristId}!`);
      } else {
        Alert.alert('Error', 'Invalid credentials. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please check your connection and try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[
        styles.formContainer,
        {
          backgroundColor: Colors[colorScheme ?? 'light'].card,
          borderColor: Colors[colorScheme ?? 'light'].border,
          borderWidth: colorScheme === 'dark' ? 1 : 0,
        }
      ]}>
        <ThemedText type="title" style={styles.title}>
          Welcome to Travo
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Please login to continue
        </ThemedText>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Tourist ID</ThemedText>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: Colors[colorScheme ?? 'light'].surface,
                borderColor: Colors[colorScheme ?? 'light'].border,
                color: Colors[colorScheme ?? 'light'].text,
              }
            ]}
            value={touristId}
            onChangeText={setTouristId}
            placeholder="Enter your Tourist ID"
            placeholderTextColor={Colors[colorScheme ?? 'light'].secondary}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Password</ThemedText>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: Colors[colorScheme ?? 'light'].surface,
                borderColor: Colors[colorScheme ?? 'light'].border,
                color: Colors[colorScheme ?? 'light'].text,
              }
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={Colors[colorScheme ?? 'light'].secondary}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.loginButton,
            { 
              backgroundColor: loading 
                ? Colors[colorScheme ?? 'light'].secondary 
                : Colors[colorScheme ?? 'light'].primary 
            }
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <ThemedText style={styles.loginButtonText}>
            {loading ? 'Logging in...' : 'Login'}
          </ThemedText>
        </TouchableOpacity>

        <ThemedView style={[
          styles.demoInfoContainer,
          {
            backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant,
            borderColor: Colors[colorScheme ?? 'light'].border,
          }
        ]}>
          <ThemedText style={styles.demoInfo}>
            💡 Demo credentials: T12345 / password123
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    padding: 30,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 28,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 16,
    opacity: 0.7,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  loginButton: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoInfoContainer: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  demoInfo: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.8,
    fontStyle: 'italic',
  },
});