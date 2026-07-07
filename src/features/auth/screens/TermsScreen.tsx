/**
 * TermsScreen — Terms of Service.
 *
 * Operational copy as of July 2026. Two items need Arnaud + counsel before
 * public launch: (1) confirm the governing-law jurisdiction in the "Governing
 * Law" section, (2) confirm the legal entity name in "Contact". Keep in sync
 * with the hosted copy at backend/public/legal/terms.html.
 */
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import LegalScreen, { LegalSection } from '../components/LegalScreen';

const LAST_UPDATED = 'July 2, 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Acceptance of Terms',
    body: 'By creating an account or using NouPro, you agree to these Terms of Service and to our Privacy Policy. If you do not agree, do not use the app. These terms apply to all users — distributors, wholesalers, retailers, and their team members.',
  },
  {
    heading: 'Eligibility',
    body: 'You must be at least 18 years old and authorized to act on behalf of your business. You are responsible for the accuracy of the information you provide and for keeping it up to date.',
  },
  {
    heading: 'Your Account & Team',
    body: 'You are responsible for safeguarding your credentials and for all activity under your account. Business owners and admins control who joins their workspace and what roles they hold; adding a team member gives that person access according to their role. Notify us immediately of any unauthorized use. You can enable two-factor authentication in Security Settings.',
  },
  {
    heading: 'Transactions Between Businesses',
    body: 'NouPro is a platform: orders, invoices, deliveries, prices, and chat happen directly between independent businesses. Each business is solely responsible for the products it sells, the accuracy of its catalog and invoices, its compliance with commercial and tax law, and the fulfilment of its orders. NouPro is not a party to those transactions and does not guarantee payment, delivery, or product quality between users.',
  },
  {
    heading: 'Acceptable Use',
    body: 'You agree not to misuse the platform, including: attempting to access data that is not yours, probing or disrupting the service, uploading unlawful or infringing content, misrepresenting your identity or business, sending spam, or using NouPro for fraudulent or illegal activity. We may remove content or suspend accounts that break these rules.',
  },
  {
    heading: 'Subscriptions & Billing',
    body: 'Some features require a paid subscription (plan tiers, limits, and prices are shown in the app). Payments are processed by Peach Payments. Subscriptions renew automatically at the end of each billing period using your stored payment method, and you will be notified before renewal. You can cancel at any time, effective at the end of the current period. Fees already paid are non-refundable except where the law requires otherwise. If a renewal payment fails, we will retry and notify you before restricting paid features.',
  },
  {
    heading: 'Your Content & Data',
    body: 'You retain ownership of the business data and content you upload. You grant NouPro a limited licence to host and process it solely to provide the service. You can export your personal data and delete your account at any time from Security Settings; business records shared with other companies (their invoices and orders) remain part of their legal records.',
  },
  {
    heading: 'Intellectual Property',
    body: 'NouPro, its logo, design, and software are owned by us or our licensors and protected by intellectual-property law. You may not copy, modify, or create derivative works from the platform except as permitted by law.',
  },
  {
    heading: 'Termination',
    body: 'You may stop using NouPro and delete your account at any time. We may suspend or terminate access for breach of these terms, or where necessary for security, legal, or operational reasons; where reasonable, we will give you notice and a chance to export your data.',
  },
  {
    heading: 'Disclaimers & Limitation of Liability',
    body: 'NouPro is provided “as is” and “as available”, without warranties of any kind. To the maximum extent permitted by law, our total liability for any claim related to the service is limited to the subscription fees you paid in the twelve months before the claim, and we are not liable for indirect, incidental, or consequential damages, including lost profits or lost data, or for the acts of other businesses on the platform.',
  },
  {
    heading: 'Governing Law',
    body: 'These terms are governed by the laws of the jurisdiction in which the NouPro operating entity is established, and disputes are subject to the competent courts of that jurisdiction, without prejudice to mandatory consumer or business protections that apply in your country.',
  },
  {
    heading: 'Changes to These Terms',
    body: 'We may update these terms from time to time. We will notify you of material changes within the app before they take effect. Continued use after changes take effect constitutes acceptance.',
  },
  {
    heading: 'Contact',
    body: 'Questions about these Terms of Service: support@nou.pro.',
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
