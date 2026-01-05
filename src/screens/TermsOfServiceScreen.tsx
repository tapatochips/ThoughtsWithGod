// src/screens/TermsOfServiceScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeProvider';

const TermsOfServiceScreen: React.FC = () => {
  const { theme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, ...getShadowStyle(theme) }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Terms of Service</Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>Last Updated: January 4, 2026</Text>

        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Please read these Terms of Service ("Terms") carefully before using this App (the "App"). By accessing or using the App, you agree to be bound by these Terms.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          By creating an account or using the App, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not use the App.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>2. Description of Service</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          The App provides daily devotional content, Bible study resources, and community features including prayer requests and theological discussion forums. The App offers both free and premium subscription tiers.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>3. User Accounts and Subscriptions</Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>3.1 Account Creation</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          • You must provide accurate and complete information when creating an account{'\n'}
          • You are responsible for maintaining the confidentiality of your account credentials{'\n'}
          • You must be at least 13 years of age to use this App{'\n'}
          • You agree to notify us immediately of any unauthorized use of your account
        </Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>3.2 Subscription Terms</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          • Subscription tiers are offered at $5, $10, and $80 per month{'\n'}
          • Subscriptions automatically renew unless cancelled before the renewal date{'\n'}
          • You may cancel your subscription at any time through your account settings{'\n'}
          • Refunds are handled on a case-by-case basis and are not guaranteed{'\n'}
          • Payment processing is handled securely through Stripe
        </Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>3.3 Changes to Pricing</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We reserve the right to modify subscription pricing with 30 days' notice to active subscribers. Current subscribers will maintain their pricing for the duration of their current billing cycle.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>4. User-Generated Content</Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>4.1 Content Guidelines</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Users may post prayer requests and participate in theological discussions. All user-generated content must comply with the following rules:
        </Text>

        <Text style={[styles.boldText, { color: theme.colors.text }]}>Prohibited Content:</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          • Harassment, bullying, or intimidation of any kind{'\n'}
          • Racist, sexist, homophobic, or otherwise discriminatory language{'\n'}
          • Hate speech or content that promotes violence{'\n'}
          • Sexually explicit or inappropriate content{'\n'}
          • Spam, advertising, or promotional material{'\n'}
          • Misinformation or content that could cause harm{'\n'}
          • Personal attacks or inflammatory remarks{'\n'}
          • Content that violates any applicable laws{'\n'}
          • Impersonation of others{'\n'}
          • Private information about others without consent
        </Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>4.2 Content Ownership and License</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          • You retain ownership of content you post{'\n'}
          • By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content within the App{'\n'}
          • We reserve the right to remove any content that violates these Terms{'\n'}
          • We are not responsible for user-generated content and do not endorse any opinions expressed by users
        </Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>4.3 Monitoring and Moderation</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          • We reserve the right to monitor, review, and moderate all user-generated content{'\n'}
          • We may remove content or suspend/terminate accounts that violate these Terms{'\n'}
          • We are not obligated to monitor all content but reserve the right to do so{'\n'}
          • Content moderation decisions are at our sole discretion
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>5. Important Disclaimers</Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>5.1 Not Professional Advice</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          The App provides devotional and spiritual content for informational and educational purposes only. The App does not provide:{'\n'}
          • Professional counseling or therapy services{'\n'}
          • Medical advice or mental health treatment{'\n'}
          • Legal, financial, or professional advice{'\n'}
          • Crisis intervention services
        </Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>5.2 Emergency Situations</Text>
        <Text style={[styles.boldText, { color: theme.colors.warning }]}>
          If you are experiencing a mental health crisis or emergency, please:
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          • Call 911 (US) or your local emergency number{'\n'}
          • Contact the National Suicide Prevention Lifeline: 988{'\n'}
          • Reach out to a qualified mental health professional{'\n'}
          • Contact a trusted family member or friend
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          The App is not a substitute for professional help and should not be relied upon in crisis situations.
        </Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>5.3 Prayer Requests</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Prayer requests and discussions are shared between users for mutual support and encouragement. However:{'\n'}
          • We cannot guarantee the quality, accuracy, or appropriateness of responses{'\n'}
          • Users should not share sensitive personal information publicly{'\n'}
          • We are not responsible for advice or support provided by other users{'\n'}
          • Users share information at their own risk
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>6. Intellectual Property</Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>6.1 Bible Content</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          The App uses Bible translations that are either in the public domain (King James Version, World English Bible, American Standard Version) or properly licensed. All Bible content remains subject to its original copyright or public domain status.
        </Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>6.2 App Content</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          All devotional content, design elements, software, and other materials created by us are protected by copyright and may not be reproduced without permission.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>7. Privacy and Data</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the App, you consent to our collection and use of personal information as described in the Privacy Policy.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>8. Termination</Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>8.1 Termination by You</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          You may terminate your account at any time by contacting us or using the account deletion feature in the App.
        </Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>8.2 Termination by Us</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We reserve the right to suspend or terminate your account and access to the App at any time, with or without notice, for:{'\n'}
          • Violation of these Terms{'\n'}
          • Fraudulent, abusive, or illegal activity{'\n'}
          • Extended periods of inactivity{'\n'}
          • Any reason at our sole discretion
        </Text>

        <Text style={[styles.subheading, { color: theme.colors.text }]}>8.3 Effect of Termination</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Upon termination, your right to use the App will immediately cease. We may delete your account and any content associated with it. Paid subscriptions will be handled according to our refund policy.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>9. Limitation of Liability</Text>
        <Text style={[styles.boldText, { color: theme.colors.text }]}>
          TO THE FULLEST EXTENT PERMITTED BY LAW:
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          • THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND{'\n'}
          • WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES{'\n'}
          • OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE APP IN THE PAST 12 MONTHS{'\n'}
          • WE ARE NOT RESPONSIBLE FOR USER-GENERATED CONTENT OR INTERACTIONS BETWEEN USERS{'\n'}
          • WE DO NOT GUARANTEE THE APP WILL BE AVAILABLE, ERROR-FREE, OR SECURE AT ALL TIMES
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>10. Indemnification</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          You agree to indemnify and hold harmless the App, its operators, and affiliates from any claims, damages, losses, or expenses (including legal fees) arising from:{'\n'}
          • Your use of the App{'\n'}
          • Your violation of these Terms{'\n'}
          • Your violation of any rights of another person or entity{'\n'}
          • Content you post to the App
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>11. Changes to Terms</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We reserve the right to modify these Terms at any time. We will provide notice of material changes by:{'\n'}
          • Updating the "Last Updated" date at the top of these Terms{'\n'}
          • Posting a notice in the App{'\n'}
          • Sending an email to registered users (for significant changes)
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Your continued use of the App after changes constitutes acceptance of the modified Terms.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>12. Governing Law</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          These Terms shall be governed by and construed in accordance with the laws of the State of Illinois, United States, without regard to its conflict of law provisions.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>13. Dispute Resolution</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Any disputes arising from these Terms or your use of the App shall be resolved through:{'\n'}
          1. Good faith negotiation{'\n'}
          2. Binding arbitration if negotiation fails (except where prohibited by law){'\n'}
          3. Small claims court for qualifying claims
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>14. Severability</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
        </Text>

        <Text style={[styles.heading, { color: theme.colors.text }]}>15. Entire Agreement</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the App and supersede all prior agreements and understandings.
        </Text>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <Text style={[styles.acknowledgment, { color: theme.colors.text }]}>
          By using this App, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
        </Text>
      </View>
    </ScrollView>
  );
};

// Helper function for consistent shadow styling
const getShadowStyle = (theme: any) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 3,
    };
  } else {
    return {
      elevation: 3,
    };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  date: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  boldText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  acknowledgment: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    fontWeight: '600',
  },
});

export default TermsOfServiceScreen;
