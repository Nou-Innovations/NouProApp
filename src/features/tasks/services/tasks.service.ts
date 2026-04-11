/**
 * Tasks Service
 *
 * Domain service for task operations.
 * Tasks are business-scoped (company context) with an additional
 * cross-business "my tasks" endpoint for the personal activity feed.
 *
 * Backend endpoints:
 * - GET    /api/companies/:companyId/tasks
 * - GET    /api/companies/:companyId/tasks/:taskId
 * - POST   /api/companies/:companyId/tasks
 * - PATCH  /api/companies/:companyId/tasks/:taskId
 * - PATCH  /api/companies/:companyId/tasks/:taskId/status
 * - DELETE /api/companies/:companyId/tasks/:taskId
 * - GET    /api/users/me/tasks
 */

import { get, post, patch, del } from '@/shared/services/api';
import type {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskFilters,
  TaskStatus,
} from '@/shared/types/task';

// ============================================================================
// Business-Scoped Task Operations
// ============================================================================

/**
 * List tasks for a business, with optional filters
 */
export async function getTasks(businessId: string, filters?: TaskFilters): Promise<Task[]> {
  const params: Record<string, string | undefined> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.assignedToUserId) params.assignedToUserId = filters.assignedToUserId;
  if (filters?.priority) params.priority = filters.priority;
  if (filters?.type) params.type = filters.type;

  return get<Task[]>(`/companies/${businessId}/tasks`, params);
}

/**
 * Get a single task by ID
 */
export async function getTask(businessId: string, taskId: string): Promise<Task> {
  return get<Task>(`/companies/${businessId}/tasks/${taskId}`);
}

/**
 * Create a new task
 */
export async function createTask(businessId: string, data: CreateTaskDTO): Promise<Task> {
  return post<Task>(`/companies/${businessId}/tasks`, data);
}

/**
 * Update task fields (not status — use updateTaskStatus for that)
 */
export async function updateTask(businessId: string, taskId: string, data: UpdateTaskDTO): Promise<Task> {
  return patch<Task>(`/companies/${businessId}/tasks/${taskId}`, data);
}

/**
 * Change task status (validates transition on backend)
 */
export async function updateTaskStatus(businessId: string, taskId: string, status: TaskStatus): Promise<Task> {
  return patch<Task>(`/companies/${businessId}/tasks/${taskId}/status`, { status });
}

/**
 * Delete a task
 */
export async function deleteTask(businessId: string, taskId: string): Promise<void> {
  return del(`/companies/${businessId}/tasks/${taskId}`);
}

// ============================================================================
// Personal (Cross-Business) Tasks
// ============================================================================

/**
 * Get all tasks assigned to the current user across all businesses
 */
export async function getMyTasks(): Promise<Task[]> {
  return get<Task[]>('/users/me/tasks');
}
