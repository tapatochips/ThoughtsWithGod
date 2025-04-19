// src/components/debug/ConfigTest.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

/**
 * Debug component to verify that environment variables are correctly loaded
 * NOTE: Remove this in production or add authentication to prevent exposing config
 */
const ConfigTest: React.FC = () => {
  const extra = Constants.expoConfig?.extra || {};
  
  // Filter out any sensitive keys that should not be shown 
  // (even though we're only showing partial values)
  const safeExtra = Object.keys(extra).reduce((acc, key) => {
    const value = extra[key];
    if (typeof value === 'string' && value.length > 8) {
      // Only show first few characters of long strings
      acc[key] = `${value.substring(0, 8)}...`;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Configuration Test</Text>
      <Text style={styles.subtitle}>Environment Variables</Text>
      
      <View style={styles.configContainer}>
        {Object.keys(safeExtra).map(key => (
          <View key={key} style={styles.configRow}>
            <Text style={styles.configKey}>{key}:</Text>
            <Text style={styles.configValue}>{JSON.stringify(safeExtra[key])}</Text>
          </View>
        ))}
      </View>
      
      <Text style={styles.note}>
        Note: This is a debug component. Remove it in production builds.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  configContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  configRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  configKey: {
    fontWeight: 'bold',
    width: '40%',
  },
  configValue: {
    width: '60%',
  },
  note: {
    fontStyle: 'italic',
    color: 'red',
    marginTop: 20,
  }
});

export default ConfigTest;