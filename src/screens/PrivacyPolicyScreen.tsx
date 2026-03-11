import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useTheme } from '../context/ThemeProvider';

const PrivacyPolicyScreen: React.FC = () => {
  const { theme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.section, { backgroundColor: theme.colors.card, ...getShadowStyle(theme) }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Privacy Policy</Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>Last Updated: March 10, 2026</Text>

        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          This Privacy Policy explains how Thoughts With God ("we", "us", or "our") collects, uses, and protects your information when you use our mobile application (the "App").
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>1. Information We Collect</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We collect the following information when you use the App:
        </Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Email address (used for account creation and receipts)</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Username (chosen by you, displayed on the Prayer Board)</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Prayer requests and discussion posts you choose to share</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• App preferences (theme, font size, Bible translation)</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Payment information (processed securely by Stripe — we never store raw card data)</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Push notification token (only if you grant permission)</Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>2. How We Use Your Information</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We use the information we collect to:
        </Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Provide and maintain the App</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Process subscription payments via Stripe</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Send purchase receipts to your email address</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Send daily verse reminders (only if you opt in)</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Display your username on community features you participate in</Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>3. Data Storage and Security</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Your data is stored on Google Firebase (Firestore), a secure cloud database. Payment processing is handled exclusively by Stripe, which is PCI-DSS compliant. We do not store raw credit card data. All data is transmitted over HTTPS.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>4. Data Sharing</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We do not sell or rent your personal information to third parties. We share data only with:
        </Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Stripe — for payment processing</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Google Firebase — for data storage and authentication</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Google (push notifications via FCM)</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Apple (push notifications via APNs)</Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>5. Community Content</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Prayer requests and discussion posts you share publicly are visible to all authenticated users of the App. Anonymous posts hide your username but are still stored securely in our database. You may delete your own posts at any time from within the App.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>6. Your Rights and Account Deletion</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          You have the right to access, correct, or delete your personal data. You can:
        </Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Update your username and preferences in Profile Settings</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Delete your account and all associated data from Profile Settings → Delete Account</Text>
        <Text style={[styles.bullet, { color: theme.colors.text }]}>• Request a copy of your data by contacting us at support@thoughtswithgod.com</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          When you delete your account, all your personal data, posts, and subscription information are permanently removed. Any active subscription is cancelled immediately.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>7. Children's Privacy</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          The App is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact us and we will delete it.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>8. Changes to This Policy</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the "Last Updated" date at the top of this policy. Continued use of the App after changes constitutes acceptance of the updated policy.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>9. Contact Us</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          If you have questions or concerns about this Privacy Policy or your data, please contact us at:
        </Text>
        <Text style={[styles.contact, { color: theme.colors.primary }]}>support@thoughtswithgod.com</Text>
      </View>
    </ScrollView>
  );
};

const getShadowStyle = (theme: any) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 3,
    };
  }
  return { elevation: 3 };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    marginBottom: 20,
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 4,
  },
  contact: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default PrivacyPolicyScreen;
