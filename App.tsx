import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// screens
import VerseDisplay from './src/screens/VerseDisplay';
import AuthScreen from './src/screens/AuthScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import PrayerBoard from './src/screens/PrayerBoard';
import ProfileSetup from './src/screens/ProfileSetup';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import ReceiptViewer from './src/screens/ReceiptViewer';

// providers
import { useFirebase, FirebaseProvider } from './src/context/FirebaseContext';
import { ThemeProvider, useTheme } from './src/context/ThemeProvider';
import ErrorBoundary from './src/components/common/ErrorBoundary';

// mock notifications
import { 
  registerForPushNotificationsAsync, 
  scheduleDailyVerseReminder,
  setupNotificationListener,
  setupNotificationResponseListener,
  cancelAllScheduledNotifications
} from './src/services/notifications';

const Stack = createStackNavigator();

const AppContent = () => {
  const { firebaseInstance, user, userProfile, isLoading } = useFirebase();
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // setup notification listeners
  useEffect(() => {
    if (user) {
      // register for notifications
      registerForPushNotificationsAsync().then(token => {
        console.log('Push token:', token);
      });

      // set up notification listeners
      notificationListener.current = setupNotificationListener(notification => {
        console.log('Notification received:', notification);
      });

      responseListener.current = setupNotificationResponseListener(response => {
        console.log('Notification response received:', response);
        // handle nav if needed based on notification content
      });

      // schedule daily reminder if user has enabled it
      scheduleDailyVerseReminder(user.uid);
    }

    return () => {
      //clean listeners when component unmounts
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user, userProfile?.preferences?.reminders, userProfile?.preferences?.reminderTime]);

  //listen for app state changes to reschedule notifications
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active" && 
        user
      ) {
        console.log("App has come to the foreground!");
        //re-schedule notifications when app comes to foreground
        scheduleDailyVerseReminder(user.uid);
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  //firebase initialization check
  useEffect(() => {
    if (firebaseInstance.isAppInitialized()) {
      console.log("Firebase initialized successfully");
    } else {
      console.log("Waiting for Firebase to initialize...");
      const timeoutId = setTimeout(() => {
        setError("Firebase initialization timeout");
      }, 10000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [firebaseInstance]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={{ color: theme.colors.text, marginTop: 10 }}>Loading Application...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>{error}</Text>
      </View>
    );
  }

//define the navigation theme based on our custom theme
const navigationTheme = {
    dark: theme.name === 'dark',
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
    //using exact string literals for fontWeight as required by the Theme type
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: 'normal' as const, // Must be one of the allowed string literals
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500' as const, // Must be one of the allowed string literals
      },
      bold: {
        fontFamily: 'System',
        fontWeight: 'bold' as const, // Must be one of the allowed string literals
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '900' as const, // Must be one of the allowed string literals
      },
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontSize: theme.fontSize.lg,
          },
        }}
      >
        {user ? (
          <>
            <Stack.Screen 
              name="VerseDisplay" 
              component={VerseDisplay} 
              options={{ title: "Daily Verse" }}
            />
            <Stack.Screen 
              name="Favorites" 
              component={FavoritesScreen} 
              options={{ title: "My Favorites" }}
            />
            <Stack.Screen 
              name="PrayerBoard" 
              component={PrayerBoard} 
              options={{ title: "Prayer Board" }}
            />
            <Stack.Screen 
              name="ProfileSetup" 
              component={ProfileSetup} 
              options={{ title: "Profile Settings" }}
            />
            <Stack.Screen 
              name="Subscription" 
              component={SubscriptionScreen} 
              options={{ title: "Premium Subscription" }}
            />
            <Stack.Screen 
              name="ReceiptViewer" 
              component={ReceiptViewer} 
              options={{ title: "Receipt" }}
            />
          </>
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
            options={{ title: "Sign In" }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;