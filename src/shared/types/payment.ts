import { SubscriptionPlan, BillingPeriod, SubscriptionStatus } from './subscription';

export type PaymentType = 'SUBSCRIPTION' | 'INVOICE_PAYMENT';

export type PaymentProcessingStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'REFUNDED';

export interface Payment {
  id: string;
  businessId: string;
  invoiceId?: string;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentProcessingStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDetails {
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  hasStoredCard: boolean;
}

export interface CheckoutResult {
  checkoutId: string;
  checkoutUrl: string;
  paymentId: string;
}
