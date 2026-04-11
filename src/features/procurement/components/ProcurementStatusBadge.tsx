/**
 * ProcurementStatusBadge Component
 * A reusable status pill for procurement module statuses.
 * Supports PO, PR, GRN, Supplier, and Priority status types.
 */

import React from 'react';
import Pill from '@/shared/components/ui/Pill';
import {
  PO_STATUS_COLORS,
  PO_STATUS_LABELS,
  PR_STATUS_COLORS,
  PR_STATUS_LABELS,
  PR_PRIORITY_COLORS,
  PR_PRIORITY_LABELS,
  GRN_STATUS_COLORS,
  GRN_STATUS_LABELS,
  SUPPLIER_STATUS_COLORS,
  SUPPLIER_STATUS_LABELS,
  type PurchaseOrderStatus,
  type PurchaseRequestStatus,
  type PurchaseRequestPriority,
  type GoodsReceiptStatus,
  type SupplierStatus,
} from '@/shared/types/procurement';

interface ProcurementStatusBadgeProps {
  status: string;
  type: 'po' | 'pr' | 'grn' | 'supplier' | 'priority';
}

const COLOR_MAPS: Record<string, Record<string, string>> = {
  po: PO_STATUS_COLORS,
  pr: PR_STATUS_COLORS,
  grn: GRN_STATUS_COLORS,
  supplier: SUPPLIER_STATUS_COLORS,
  priority: PR_PRIORITY_COLORS,
};

const LABEL_MAPS: Record<string, Record<string, string>> = {
  po: PO_STATUS_LABELS,
  pr: PR_STATUS_LABELS,
  grn: GRN_STATUS_LABELS,
  supplier: SUPPLIER_STATUS_LABELS,
  priority: PR_PRIORITY_LABELS,
};

const FALLBACK_COLOR = '#A4AAB8';

const ProcurementStatusBadge: React.FC<ProcurementStatusBadgeProps> = ({ status, type }) => {
  const colorMap = COLOR_MAPS[type] || {};
  const labelMap = LABEL_MAPS[type] || {};

  const color = colorMap[status] || FALLBACK_COLOR;
  const label = labelMap[status] || status;

  return (
    <Pill
      text={label}
      color={color}
    />
  );
};

export default ProcurementStatusBadge;
