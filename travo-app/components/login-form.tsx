import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {
  const [touristId, setTouristId] = useState('');
  const [password, setPassword] = useState('');
  const colorScheme = useColorScheme();
  const { login } = useAuth();

  const handleLogin = () => {
    if (!touristId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both Tourist ID and Password');
      return;
    }
    
    const success = login(touristId, password);
    if (success) {
      Alert.alert('Success', `Welcome to Travo, ${touristId}!`);
    } else {
      Alert.alert('Error', 'Invalid credentials');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.formContainer}>
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
                backgroundColor: Colors[colorScheme ?? 'light'].background,
                borderColor: Colors[colorScheme ?? 'light'].tabIconDefault,
                color: Colors[colorScheme ?? 'light'].text,
              }
            ]}
            value={touristId}
            onChangeText={setTouristId}
            placeholder="Enter your Tourist ID"
            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Password</ThemedText>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: Colors[colorScheme ?? 'light'].background,
                borderColor: Colors[colorScheme ?? 'light'].tabIconDefault,
                color: Colors[colorScheme ?? 'light'].text,
              }
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.loginButton,
            { backgroundColor: Colors[colorScheme ?? 'light'].tint }
          ]}
          onPress={handleLogin}
        >
          <ThemedText style={styles.loginButtonText}>
            Login
          </ThemedText>
        </TouchableOpacity>
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
});