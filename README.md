# ThoughtsWithGod 📖✨

A beautiful React Native app that provides daily Bible verses, prayer management, and spiritual reflection tools. Built with Firebase backend and designed with accessibility in mind.

## 🌟 Features

### Core Features
- **Daily Bible Verses**: Random verses from the complete Bible database
- **Favorites Management**: Save and organize your favorite verses
- **Prayer Board**: Community prayer requests and personal prayer tracking
- **User Profiles**: Personalized spiritual journey tracking
- **Premium Subscriptions**: Can support the app by subscribing through Stripe

### Accessibility Features
- **Dynamic Font Sizing**: Three font size options (Small, Medium, Large) with real-time updates
- **Theme Support**: Light, Dark, and Sepia themes for comfortable reading
- **Screen Reader Support**: Full accessibility labels and ARIA support
- **Touch-Friendly**: Minimum 44px touch targets following accessibility guidelines

### Technical Features
- **Offline Capability**: Cached verses for offline reading
- **Real-time Sync**: Firebase Firestore for instant data synchronization
- **Push Notifications**: Daily verse reminders and prayer notifications
- **Cross-Platform**: Runs on iOS, Android, and Web

## 🚀 Getting Started

### Prerequisites
- Node.js (16.x or higher)
- npm or yarn
- Expo CLI
- React Native development environment

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tapatochips/ThoughtsWithGod.git
   cd ThoughtsWithGod
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

### Running on Different Platforms
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 🏗️ Project Structure

```
ThoughtsWithGod/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   └── common/         # Common UI elements
│   ├── context/            # React Context providers
│   │   ├── FirebaseContext.tsx
│   │   └── ThemeProvider.tsx
│   ├── screens/            # App screens
│   │   ├── AuthScreen.tsx
│   │   ├── VerseDisplay.tsx
│   │   ├── FavoritesScreen.tsx
│   │   ├── PrayerBoard.tsx
│   │   ├── ProfileSetup.tsx
│   │   └── SubscriptionScreen.tsx
│   ├── services/           # External service integrations
│   │   ├── firebase/       # Firebase configuration
│   │   ├── notifications.tsx
│   │   └── payment/        # Stripe/RevenueCat integration
│   └── data/              # Static data and JSON files
├── BibleJSON/             # Complete Bible database
├── functions/             # Firebase Cloud Functions
└── assets/               # Images and static assets
```

## 🎨 Themes and Accessibility

### Available Themes
- **Light Theme**: Clean, bright interface for daytime reading
- **Dark Theme**: Easy on the eyes for low-light environments
- **Sepia Theme**: Warm, paper-like appearance for extended reading

### Font Size Options
- **Small**: 14-24px range - Compact text for smaller screens
- **Medium**: 16-30px range - Default comfortable reading size
- **Large**: 18-36px range - Enhanced readability for accessibility

### Accessibility Features
- Screen reader compatibility with proper ARIA labels
- High contrast color schemes
- Keyboard navigation support
- Minimum touch target sizes (44px)
- Dynamic font scaling
- Real-time preference updates

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication, Firestore, and Cloud Functions
3. Add your configuration to the environment variables
4. Deploy security rules from `functions/firestore.rules`

### Stripe Setup (for Premium Features)
1. Create account at [Stripe](https://www.Stripe.com)
2. Configure subscription products
3. Add Stripe API keys to environment variables

## 📱 Key Components

### FontSizeControl
```tsx
import FontSizeControl from './src/components/common/FontSizeControl';

// Usage
<FontSizeControl style={customStyles} />
```
Provides real-time font size adjustment with accessibility support.

### ThemeProvider
```tsx
import { ThemeProvider, useTheme } from './src/context/ThemeProvider';

// Access theme and font preferences
const { theme, setThemePreference, setFontSizePreference } = useTheme();
```

### FirebaseContext
```tsx
import { useFirebase } from './src/context/FirebaseContext';

// Access user data and Firebase services
const { user, userProfile, firebaseInstance } = useFirebase();
```

## 🛠️ Development

### Code Quality
```bash
# Type checking
npx tsc --noEmit

# Linting (if configured)
npm run lint
```

### Database Structure
```
users/{userId}/
├── profile/              # User profile information
├── favorites/           # Saved favorite verses
├── prayers/            # Personal prayers
└── preferences/        # Theme and accessibility settings
```

## 🚀 Deployment

### Web Deployment
```bash
npm run web
# Build for production deployment
```

### Mobile App Store
1. Configure app.json with store metadata
2. Build production versions:
   ```bash
   expo build:ios
   expo build:android
   ```
3. Submit to respective app stores

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow React Native best practices
- Maintain accessibility standards (WCAG 2.1 AA)
- Test on multiple devices and screen sizes
- Ensure proper TypeScript typing
- Include accessibility labels for all interactive elements

## 🙏 Acknowledgments

- Bible text provided by [Bible JSON source]
- Icons by [Expo Vector Icons](https://docs.expo.dev/guides/icons/)
- Firebase for backend infrastructure
- RevenueCat for subscription management

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for spiritual growth and community**