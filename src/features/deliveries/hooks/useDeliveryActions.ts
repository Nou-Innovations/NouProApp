/**
 * useDeliveryActions Hook
 * 
 * Centralizes all API mutation calls for delivery detail views.
 * Wraps the deliveries.service methods with error handling and state management.
 * 
 * Usage:
 *   const actions = useDeliveryActions(delivery.id);
 *   await actions.updateStatus('Scheduled');
 *   await actions.updatePayment('PAID');
 */

import { useState, useCallback } from 'react';
import { AppAlert } from '@/shared/services/appAlert';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  updateDelivery,
  updateDeliveryStatus,
  assignDelivery,
  assignDeliveryStaff,
  removeDeliveryStaff,
  updateDeliveryStaffRole,
  deleteDelivery as deleteDeliveryApi,
} from '../deliveries.service';
import { useDeliveriesStore } from '../deliveries.store';
import type { DeliveryStatus, PaymentStatus, DeliveryItem, DeliveryStaffRole } from '@/shared/types/delivery';

export function useDeliveryActions(deliveryId: string) {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withErrorHandling = useCallback(
    async <T>(fn: () => Promise<T>, errorMsg: string): Promise<T | null> => {
      if (!companyId) {
        AppAlert.alert('Error', 'No business selected. Please select a business first.');
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fn();
        return result;
      } catch (err: any) {
        const message = err?.message || errorMsg;
        setError(message);
        AppAlert.alert('Error', message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  // Helper to get store actions (avoids stale closures)
  const getStore = () => useDeliveriesStore.getState();

  const updateStatus = useCallback(
    async (status: DeliveryStatus) => {
      const result = await withErrorHandling(
        () => updateDeliveryStatus(companyId, deliveryId, status),
        'Failed to update delivery status'
      );
      if (result) {
        getStore().updateDeliveryStatus(deliveryId, status);
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const updatePayment = useCallback(
    async (status: PaymentStatus) => {
      const result = await withErrorHandling(
        () => updateDelivery(companyId, deliveryId, { paymentStatus: status }),
        'Failed to update payment status'
      );
      if (result) {
        getStore().updateDelivery(deliveryId, { paymentStatus: status });
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const updateSchedule = useCallback(
    async (date: Date) => {
      const result = await withErrorHandling(
        () =>
          updateDelivery(companyId, deliveryId, {
            expectedDeliveryDateTime: date.toISOString(),
          }),
        'Failed to update schedule'
      );
      if (result) {
        getStore().updateDelivery(deliveryId, { expectedDeliveryDateTime: date.toISOString() });
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const assignStaff = useCallback(
    async (staffId: string, staffName: string) => {
      const result = await withErrorHandling(
        () => assignDelivery(companyId, deliveryId, staffId, staffName),
        'Failed to assign staff'
      );
      if (result) {
        getStore().assignDelivery(deliveryId, staffId, staffName);
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const addStaff = useCallback(
    async (userId: string, userName: string, role: DeliveryStaffRole = 'driver') => {
      const result = await withErrorHandling(
        () => assignDeliveryStaff(companyId, deliveryId, userId, role),
        'Failed to assign staff'
      );
      if (result) {
        getStore().addStaffAssignment(deliveryId, result);
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const removeStaff = useCallback(
    async (userId: string) => {
      const result = await withErrorHandling(
        () => removeDeliveryStaff(companyId, deliveryId, userId),
        'Failed to remove staff'
      );
      if (result !== null) {
        getStore().removeStaffAssignment(deliveryId, userId);
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const updateStaffRole = useCallback(
    async (userId: string, role: DeliveryStaffRole) => {
      const result = await withErrorHandling(
        () => updateDeliveryStaffRole(companyId, deliveryId, userId, role),
        'Failed to update staff role'
      );
      if (result) {
        getStore().updateStaffRole(deliveryId, userId, role);
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const updateTransport = useCallback(
    async (transportMode: string) => {
      const result = await withErrorHandling(
        () => updateDelivery(companyId, deliveryId, { transportMode }),
        'Failed to update transport'
      );
      if (result) {
        getStore().updateDelivery(deliveryId, { transportMode });
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const addNote = useCallback(
    async (note: string) => {
      const result = await withErrorHandling(
        () => updateDelivery(companyId, deliveryId, { distributorNotes: note }),
        'Failed to add note'
      );
      if (result) {
        getStore().updateDelivery(deliveryId, { distributorNotes: note });
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const addClientNote = useCallback(
    async (note: string) => {
      const result = await withErrorHandling(
        () => updateDelivery(companyId, deliveryId, { clientNotes: note }),
        'Failed to add note'
      );
      if (result) {
        getStore().updateDelivery(deliveryId, { clientNotes: note });
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const updateItems = useCallback(
    async (items: DeliveryItem[]) => {
      const result = await withErrorHandling(
        () => updateDelivery(companyId, deliveryId, { items }),
        'Failed to update items'
      );
      if (result) {
        getStore().updateDelivery(deliveryId, { items });
      }
      return result;
    },
    [companyId, deliveryId, withErrorHandling]
  );

  const removeDelivery = useCallback(async () => {
    const result = await withErrorHandling(
      () => deleteDeliveryApi(companyId, deliveryId),
      'Failed to delete delivery'
    );
    if (result) {
      getStore().removeDelivery(deliveryId);
    }
    return result;
  }, [companyId, deliveryId, withErrorHandling]);

  return {
    loading,
    error,
    updateStatus,
    updatePayment,
    updateSchedule,
    assignStaff,
    addStaff,
    removeStaff,
    updateStaffRole,
    updateTransport,
    addNote,
    addClientNote,
    updateItems,
    removeDelivery,
  };
}

export default useDeliveryActions;
