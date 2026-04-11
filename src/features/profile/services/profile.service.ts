/**
 * Profile Service
 *
 * Domain service for professional profile operations:
 * work experience, education, certifications, skills, public profile, completeness.
 *
 * Backend endpoints:
 * - GET/POST/PATCH/DELETE  /api/users/:userId/experiences  &  /api/users/me/experiences
 * - GET/POST/PATCH/DELETE  /api/users/:userId/education    &  /api/users/me/education
 * - GET/POST/PATCH/DELETE  /api/users/:userId/certifications & /api/users/me/certifications
 * - GET/POST/DELETE/PATCH  /api/skills/search, /api/users/:userId/skills, /api/users/me/skills
 * - GET                    /api/profile/:slug
 * - GET                    /api/users/me/profile-completeness
 */

import { get, post, patch, del } from '@/shared/services/api';
import type {
  WorkExperience,
  CreateWorkExperienceDTO,
  UpdateWorkExperienceDTO,
  Education,
  CreateEducationDTO,
  UpdateEducationDTO,
  Certification,
  CreateCertificationDTO,
  UpdateCertificationDTO,
  Skill,
  UserSkill,
  ProfileCompleteness,
  ProfessionalProfile,
} from '@/shared/types/profile';

// ============================================================================
// Work Experience
// ============================================================================

export async function getExperiences(userId: string): Promise<WorkExperience[]> {
  return get<WorkExperience[]>(`/users/${userId}/experiences`);
}

export async function addExperience(data: CreateWorkExperienceDTO): Promise<WorkExperience> {
  return post<WorkExperience>('/users/me/experiences', data);
}

export async function updateExperience(id: string, data: UpdateWorkExperienceDTO): Promise<WorkExperience> {
  return patch<WorkExperience>(`/users/me/experiences/${id}`, data);
}

export async function deleteExperience(id: string): Promise<void> {
  return del(`/users/me/experiences/${id}`);
}

// ============================================================================
// Education
// ============================================================================

export async function getEducation(userId: string): Promise<Education[]> {
  return get<Education[]>(`/users/${userId}/education`);
}

export async function addEducation(data: CreateEducationDTO): Promise<Education> {
  return post<Education>('/users/me/education', data);
}

export async function updateEducation(id: string, data: UpdateEducationDTO): Promise<Education> {
  return patch<Education>(`/users/me/education/${id}`, data);
}

export async function deleteEducation(id: string): Promise<void> {
  return del(`/users/me/education/${id}`);
}

// ============================================================================
// Certifications
// ============================================================================

export async function getCertifications(userId: string): Promise<Certification[]> {
  return get<Certification[]>(`/users/${userId}/certifications`);
}

export async function addCertification(data: CreateCertificationDTO): Promise<Certification> {
  return post<Certification>('/users/me/certifications', data);
}

export async function updateCertification(id: string, data: UpdateCertificationDTO): Promise<Certification> {
  return patch<Certification>(`/users/me/certifications/${id}`, data);
}

export async function deleteCertification(id: string): Promise<void> {
  return del(`/users/me/certifications/${id}`);
}

// ============================================================================
// Skills
// ============================================================================

export async function searchSkills(query: string): Promise<Skill[]> {
  return get<Skill[]>('/skills/search', { q: query });
}

export async function getUserSkills(userId: string): Promise<UserSkill[]> {
  return get<UserSkill[]>(`/users/${userId}/skills`);
}

export async function addSkill(name: string): Promise<UserSkill> {
  return post<UserSkill>('/users/me/skills', { name });
}

export async function removeSkill(skillId: string): Promise<void> {
  return del(`/users/me/skills/${skillId}`);
}

export async function reorderSkills(skillIds: string[]): Promise<void> {
  return patch('/users/me/skills/reorder', { skillIds });
}

// ============================================================================
// Public Profile & Completeness
// ============================================================================

export async function getPublicProfile(slug: string): Promise<ProfessionalProfile> {
  return get<ProfessionalProfile>(`/profile/${slug}`);
}

export async function getProfileCompleteness(): Promise<ProfileCompleteness> {
  return get<ProfileCompleteness>('/users/me/profile-completeness');
}
