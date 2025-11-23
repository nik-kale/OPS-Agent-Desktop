/**
 * Input validation schemas using Zod
 * Provides type-safe validation for API requests
 */
import { z } from 'zod';

// Mission schemas
export const createMissionSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(5000, 'Prompt must not exceed 5000 characters')
    .trim(),
  dashboardUrl: z.string().url().optional(),
  dashboardType: z
    .enum(['grafana', 'kibana', 'datadog', 'pagerduty', 'custom'])
    .optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
});

export const updateMissionStatusSchema = z.object({
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL', 'CANCELLED']),
});

export const getMissionSchema = z.object({
  id: z.string().uuid('Invalid mission ID'),
});

export const listMissionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: z
    .enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL', 'CANCELLED'])
    .optional(),
  userId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Authentication schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Approval schemas
export const createApprovalSchema = z.object({
  missionId: z.string().uuid(),
  actionType: z.string().min(1).max(100),
  actionDetails: z.record(z.unknown()),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export const respondToApprovalSchema = z.object({
  approvalId: z.string().uuid(),
  status: z.enum(['APPROVED', 'DENIED']),
  notes: z.string().max(1000).optional(),
});

// User schemas
export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
});

// Dashboard config schemas
export const createDashboardConfigSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['grafana', 'kibana', 'datadog', 'pagerduty', 'custom']),
  baseUrl: z.string().url(),
  config: z.record(z.unknown()).optional(),
  credentials: z
    .object({
      apiKey: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
});

// Mission template schemas
export const createMissionTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  category: z.string().min(1).max(50),
  promptTemplate: z.string().min(10).max(5000),
  dashboardType: z
    .enum(['grafana', 'kibana', 'datadog', 'pagerduty', 'custom'])
    .optional(),
  tags: z.array(z.string()).default([]),
});

// WebSocket event schemas
export const websocketEventSchema = z.object({
  event: z.enum(['mission.update', 'mission.step', 'approval.request']),
  data: z.record(z.unknown()),
});

// Export types
export type CreateMissionInput = z.infer<typeof createMissionSchema>;
export type UpdateMissionStatusInput = z.infer<typeof updateMissionStatusSchema>;
export type GetMissionInput = z.infer<typeof getMissionSchema>;
export type ListMissionsInput = z.infer<typeof listMissionsSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type RespondToApprovalInput = z.infer<typeof respondToApprovalSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateDashboardConfigInput = z.infer<typeof createDashboardConfigSchema>;
export type CreateMissionTemplateInput = z.infer<typeof createMissionTemplateSchema>;
