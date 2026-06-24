/**
 * PrivacyScreen — Privacy Policy.
 *
 * NOTE: The copy below is placeholder boilerplate so the link works and the app
 * meets store requirements. Replace it with the final Privacy Policy reviewed by
 * legal counsel before public launch.
 */
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import LegalScreen, { LegalSection } from '../components/LegalScreen';

const LAST_UPDATED = 'June 24, 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Overview',
    body: 'This Privacy Policy explains how NouPro collects, uses, and protects your personal and business information when you use the app. By using NouPro, you agree to the practices described here.',
  },
  {
    heading: 'Information We Collect',
    body: 'We collect information you provide directly — such as your name, phone number, email address, business details, and content you upload — as well as technical data like device information and usage activity needed to operate the service.',
  },
  {
    heading: 'How We Use Your Information',
    body: 'We use your information to create and manage your account, provide and improve the platform, process orders and payments, send important notifications, prevent fraud, and comply with legal obligations.',
  },
  {
    heading: 'Sharing Your Information',
    body: 'We do not sell your personal information. We share data only with service providers that help us run the platform (such as hosting, SMS verification, and payments), with other businesses you transact with on NouPro, or where required by law.',
  },
  {
    heading: 'Data Retention',
    body: 'We keep your information for as long as your account is active or as needed to provide the service and meet legal, accounting, or reporting requirements. You can request deletion of your account at any time.',
  },
  {
    heading: 'Security',
    body: 'We use technical and organizational measures to protect your data, including encryption in transit and access controls. No system is completely secure, so we cannot guarantee absolute security.',
  },
  {
    heading: 'Your Rights',
    body: 'Depending on your location, you may have the right to access, correct, export, or delete your personal information, and to object to or restrict certain processing. Contact us to exercise these rights.',
  },
  {
    heading: 'Children',
    body: 'NouPro is intended for business use and is not directed at children under 18. We do not knowingly collect personal information from children.',
  },
  {
    heading: 'Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of material changes within the app. Continued use after changes take effect constitutes acceptance of the updated policy.',
  },
  {
    heading: 'Contact',
    body: 'Questions about this Privacy Policy or your data can be sent to support@nou.pro.',
  },
];

type Props = NativeStackScreenProps<AuthStackParamList, 'Privacy'>;

export default function PrivacyScreen({ navigation }: Props) {
  return (
    <LegalScreen
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      sections={SECTIONS}
      onBack={() => navigation.goBack()}
    />
  );
}
