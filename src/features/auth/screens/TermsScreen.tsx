/**
 * TermsScreen — Terms of Service.
 *
 * NOTE: The copy below is placeholder boilerplate so the link works and the app
 * meets store requirements. Replace it with the final Terms of Service reviewed
 * by legal counsel before public launch.
 */
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import LegalScreen, { LegalSection } from '../components/LegalScreen';

const LAST_UPDATED = 'June 24, 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Acceptance of Terms',
    body: 'By creating an account or using NouPro, you agree to be bound by these Terms of Service. If you do not agree, do not use the app. These terms apply to all users, including distributors, wholesalers, and retailers.',
  },
  {
    heading: 'Eligibility',
    body: 'You must be at least 18 years old and authorized to act on behalf of your business to use NouPro. You are responsible for ensuring the information you provide is accurate and kept up to date.',
  },
  {
    heading: 'Your Account',
    body: 'You are responsible for safeguarding your login credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use. We may suspend or terminate accounts that violate these terms.',
  },
  {
    heading: 'Acceptable Use',
    body: 'You agree not to misuse the platform, including attempting to access data that is not yours, disrupting the service, uploading unlawful content, or using NouPro for any fraudulent or illegal activity.',
  },
  {
    heading: 'Subscriptions & Billing',
    body: 'Some features require a paid subscription. Plan tiers, limits, and pricing are described in the app. Fees are billed in advance and are non-refundable except where required by law. You may cancel at any time, effective at the end of the current billing period.',
  },
  {
    heading: 'Intellectual Property',
    body: 'NouPro and its content, logos, and software are owned by us or our licensors and are protected by intellectual property laws. You retain ownership of the business data you upload, and grant us a limited licence to process it to provide the service.',
  },
  {
    heading: 'Termination',
    body: 'You may stop using NouPro at any time. We may suspend or terminate your access if you breach these terms or if required for security, legal, or operational reasons.',
  },
  {
    heading: 'Disclaimers & Limitation of Liability',
    body: 'NouPro is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the service.',
  },
  {
    heading: 'Changes to These Terms',
    body: 'We may update these terms from time to time. We will notify you of material changes within the app. Continued use after changes take effect constitutes acceptance of the updated terms.',
  },
  {
    heading: 'Contact',
    body: 'Questions about these Terms of Service can be sent to support@nou.pro.',
  },
];

type Props = NativeStackScreenProps<AuthStackParamList, 'Terms'>;

export default function TermsScreen({ navigation }: Props) {
  return (
    <LegalScreen
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      sections={SECTIONS}
      onBack={() => navigation.goBack()}
    />
  );
}
