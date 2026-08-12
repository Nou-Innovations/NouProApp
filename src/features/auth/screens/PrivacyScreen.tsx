/**
 * PrivacyScreen — Privacy Policy.
 *
 * This copy reflects NouPro's actual data practices (processors, retention,
 * in-app export/deletion). Keep this file in sync with the hosted copy at
 * backend/public/legal/privacy.html — that URL is what App Store Connect links to.
 *
 * STILL NEEDS ARNAUD + COUNSEL before public launch:
 *   1. The registered entity name, legal form and postal address for "Contact" —
 *      it currently says only "Data controller: NouPro", and there is no postal
 *      address anywhere, which most privacy regimes require of a controller.
 *   2. The governing-law jurisdiction, in TermsScreen.
 * The supervisory-authority wording below is deliberately jurisdiction-neutral
 * until (2) is settled — it used to name the CNIL (France) while every other
 * signal in this repo points to Mauritius.
 */
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import LegalScreen, { LegalSection } from '../components/LegalScreen';
import { BRAND_DOMAIN, SUPPORT_EMAIL } from '@/shared/config/urls';

const LAST_UPDATED = 'August 12, 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Overview',
    body: `NouPro is a business-to-business platform that connects distributors, wholesalers, and retailers. This Privacy Policy explains what information we collect, why, who processes it on our behalf, and the rights you can exercise directly inside the app. It applies to the NouPro mobile app and related services operated under the ${BRAND_DOMAIN} domain.`,
  },
  {
    heading: 'Information We Collect',
    body: 'Account data: your name, email address, phone number, password (stored only as a secure hash), and optional profile details such as photo, job title, bio, work experience, education, and skills.\n\nBusiness data: company profiles, product catalogs, prices and price lists, orders, invoices, deliveries, and team membership.\n\nContent you create: chat messages, shared photos and documents, feedback, and reviews.\n\nTechnical data: device push-notification tokens, app version, and diagnostic data when the app crashes.\n\nPayment data: subscription payments are processed by Peach Payments. Your card details are entered on their secure systems and never stored on NouPro servers — we keep only a payment reference and status.',
  },
  {
    heading: 'How We Use Your Information',
    body: 'We use your information to operate your account and your company workspace; to transmit orders, invoices, and messages between you and the businesses you work with; to process subscription payments; to send notifications you have enabled; to detect fraud and abuse; to fix crashes and improve reliability; and to meet legal obligations such as accounting rules. We do not sell your personal information, and we do not use it for third-party advertising.',
  },
  {
    heading: 'Legal Bases (GDPR)',
    body: 'Where the General Data Protection Regulation applies, we process your data on these bases: performance of a contract (running your account and transactions), legitimate interest (security, fraud prevention, service improvement), legal obligation (retaining invoices and transaction records), and consent (optional permissions such as camera, photos, contacts, and location — each is requested separately in the app and can be withdrawn in your device settings).',
  },
  {
    heading: 'Who Processes Your Data',
    body: 'We share data only with the service providers that run the platform, under data-processing agreements:\n\n• Supabase — database and file storage\n• Render — application hosting\n• Expo — push-notification delivery\n• Sentry — crash and error reporting\n• Peach Payments — subscription payment processing\n• Twilio — SMS verification codes\n\nBusinesses you transact with on NouPro see the information needed for those transactions (for example, your name on an order or a message). We may also disclose information where required by law.',
  },
  {
    heading: 'International Transfers',
    body: 'Our providers may store or process data outside your country. Where GDPR applies, transfers rely on safeguards such as the European Commission’s Standard Contractual Clauses implemented by our providers.',
  },
  {
    heading: 'Data Retention',
    body: 'We keep your data while your account is active. If you delete your account, your personal profile is removed and your remaining details are anonymised immediately (see Your Rights). Invoices, orders, and delivery records are retained for as long as commercial and tax law requires, because they are also the legal records of the other businesses involved. Crash diagnostics are retained by Sentry on a rolling basis.',
  },
  {
    heading: 'Your Rights & In-App Tools',
    body: 'You can exercise your key rights directly in the app, without contacting us:\n\n• Export your data: Settings → Security → Export My Data gives you a machine-readable copy of your personal data (right of access and portability).\n\n• Delete your account: Settings → Security → Delete Account removes your profile and anonymises your personal data after you confirm with your password (right to erasure). Your name, photo, contact details, profile content, and connections are deleted, and every device is signed out. Records other businesses are legally required to keep — their invoices, orders, and deliveries — are retained but no longer linked to you: your name shows as “Deleted user”.\n\nYou also have rights to correction, restriction, and objection, and the right to lodge a complaint with the data-protection authority in your country. For anything not covered in-app, contact us by email.',
  },
  {
    heading: 'Security',
    body: 'All traffic between the app and our servers is encrypted with TLS. Passwords are stored as bcrypt hashes and never in plain text. Two-factor authentication is available in Security Settings and we recommend enabling it. Access to production data is restricted. No system is completely secure, so we cannot guarantee absolute security.',
  },
  {
    heading: 'Children',
    body: 'NouPro is intended for business use and is not directed at children under 18. We do not knowingly collect personal information from children.',
  },
  {
    heading: 'Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of material changes within the app before they take effect. The “last updated” date at the top always reflects the current version.',
  },
  {
    heading: 'Contact',
    body: `Data controller: NouPro. Questions about this policy or your data: ${SUPPORT_EMAIL}.`,
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
