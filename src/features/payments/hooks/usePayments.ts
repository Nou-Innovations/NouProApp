import { useState, useEffect, useCallback } from 'react';
import { Payment } from '@/shared/types/payment';
import { getPaymentHistory } from '../payments.service';

export function usePayments(businessId: string, type?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const result = await getPaymentHistory(businessId, { page: pageNum, limit: 20, type });
      if (pageNum === 1) {
        setPayments(result.payments);
      } else {
        setPayments(prev => [...prev, ...result.payments]);
      }
      setTotalPages(result.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, type]);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const loadMore = useCallback(() => {
    if (page < totalPages && !loading) {
      fetchPayments(page + 1);
    }
  }, [page, totalPages, loading, fetchPayments]);

  const refresh = useCallback(() => {
    fetchPayments(1, true);
  }, [fetchPayments]);

  return { payments, loading, refreshing, loadMore, refresh, hasMore: page < totalPages };
}
