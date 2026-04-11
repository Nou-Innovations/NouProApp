/**
 * useGoodsReceipt Hook
 *
 * Handles creating a goods receipt for a purchase order.
 */

import { useState, useCallback } from 'react';
import { useProfileStore } from '@/shared/store/profileStore';
import * as procurementService from '../services/procurement.service';
import type { GoodsReceipt, CreateGoodsReceiptData } from '@/shared/types/procurement';
import { ApiError } from '@/shared/services/api';

export function useGoodsReceipt() {
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReceipt = useCallback(async (purchaseOrderId: string, data: CreateGoodsReceiptData): Promise<GoodsReceipt | null> => {
    if (!businessId) return null;

    setIsSubmitting(true);
    setError(null);

    try {
      const grn = await procurementService.createGoodsReceipt(businessId, purchaseOrderId, data);
      return grn;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to submit goods receipt';
      setError(msg);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId]);

  const fetchReceipt = useCallback(async (grnId: string): Promise<GoodsReceipt | null> => {
    if (!businessId) return null;

    try {
      return await procurementService.getGoodsReceipt(businessId, grnId);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load goods receipt';
      setError(msg);
      return null;
    }
  }, [businessId]);

  return {
    isSubmitting,
    error,
    submitReceipt,
    fetchReceipt,
  };
}
