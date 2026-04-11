/**
 * Task Types
 *
 * General-purpose task system for businesses.
 * Tasks can be standalone or linked to orders, deliveries, or invoices.
 */

// ========== Enums (matching Prisma schema) ==========

export type TaskType = 'GENERAL' | 'DELIVERY' | 'ORDER' | 'INVOICE' | 'INVENTORY';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TaskPriority = 'LOW' | 'NORMAL' | 'URGENT';

// ========== Task Entity ==========

export interface Task {
  id: string;
  businessId: string;
  locationId?: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId?: string;
  assignedByUserId?: string;
  createdByUserId: string;
  dueDate?: string; // ISO datetime
  completedAt?: string; // ISO datetime
  linkedOrderId?: string;
  linkedDeliveryId?: string;
  linkedInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched user info (returned by API)
  assignedToUser?: { id: string; name: string; avatarUrl?: string };
  assignedByUser?: { id: string; name: string; avatarUrl?: string };
  createdByUser?: { id: string; name: string; avatarUrl?: string };
  // Included when fetching personal tasks
  business?: { id: string; name: string; logoUrl?: string };
}

// ========== DTOs ==========

export interface CreateTaskDTO {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  assignedToUserId?: string;
  dueDate?: string;
  locationId?: string;
  linkedOrderId?: string;
  linkedDeliveryId?: string;
  linkedInvoiceId?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  assignedToUserId?: string;
  dueDate?: string;
  locationId?: string;
}

// ========== Filters ==========

export interface TaskFilters {
  status?: TaskStatus;
  assignedToUserId?: string;
  priority?: TaskPriority;
  type?: TaskType;
}

// ========== Status Transitions ==========

/**
 * Valid status transitions for tasks.
 * Used on both frontend (for UI gating) and backend (for validation).
 */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'TODO'],
  COMPLETED: ['TODO'],
  CANCELLED: ['TODO'],
};

/**
 * Check if a status transition is valid
 */
export function isValidTaskTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ========== Display Helpers ==========

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  URGENT: 'Urgent',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  GENERAL: 'General',
  DELIVERY: 'Delivery',
  ORDER: 'Order',
  INVOICE: 'Invoice',
  INVENTORY: 'Inventory',
};
