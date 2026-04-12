import { get, post } from '@/shared/services/api';
import { Payment, CheckoutResult, SubscriptionDetails } from '@/shared/types/payment';
import { SubscriptionPlan, BillingPeriod } from '@/shared/types/subscription';

export async function createSubscriptionCheckout(params: {
  businessId: string;
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
}): Promise<CheckoutResult> {
  return post<CheckoutResult>('/payments/create-checkout', params);
}

export async function createInvoiceCheckout(params: {
  businessId: string;
  invoiceId: string;
}): Promise<CheckoutResult> {
  return post<CheckoutResult>('/payments/invoice-checkout', params);
}

export async function getCheckoutResult(checkoutId: string): Promise<{
  status: string;
  payment: Payment;
}> {
  return get(`/payments/checkout-result/${checkoutId}`);
}

export async function getPaymentHistory(
  businessId: string,
  params?: { page?: number; limit?: number; type?: string }
): Promise<{ payments: Payment[]; total: number; page: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.type) query.set('type', params.type);
  const qs = query.toString();
  return get(`/businesses/${businessId}/payments${qs ? `?${qs}` : ''}`);
}

export async function getSubscriptionStatus(businessId: string): Promise<SubscriptionDetails> {
  return get<SubscriptionDetails>(`/businesses/${businessId}/subscription-status`);
}
