/**
 * useProfileSections Hook
 *
 * Fetches all professional profile sections (experiences, education,
 * certifications, skills) plus profile completeness for the given user.
 *
 * If the userId matches the logged-in user, also fetches completeness data.
 * Follows the useInvoices pattern: local state, auto-fetch on mount, refetch.
 */

import { useState, useEffect, useCallback } from 'react';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import type {
  WorkExperience,
  Education,
  Certification,
  UserSkill,
  ProfileCompleteness,
} from '@/shared/types/profile';
import {
  getExperiences,
  getEducation,
  getCertifications,
  getUserSkills,
  getProfileCompleteness,
} from '../services/profile.service';

interface UseProfileSectionsResult {
  experiences: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  skills: UserSkill[];
  completeness: ProfileCompleteness | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseProfileSectionsOptions {
  autoFetch?: boolean;
}

export function useProfileSections(
  userId: string,
  options: UseProfileSectionsOptions = {},
): UseProfileSectionsResult {
  const { autoFetch = true } = options;

  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if viewing own profile (for completeness)
  const currentUserId = useProfileStore((state) => state.currentUser?.id);
  const isOwnProfile = userId === currentUserId;

  const fetchAll = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all sections in parallel
      const promises: [
        Promise<WorkExperience[]>,
        Promise<Education[]>,
        Promise<Certification[]>,
        Promise<UserSkill[]>,
        Promise<ProfileCompleteness | null>,
      ] = [
        getExperiences(userId),
        getEducation(userId),
        getCertifications(userId),
        getUserSkills(userId),
        isOwnProfile ? getProfileCompleteness() : Promise.resolve(null),
      ];

      const [exp, edu, cert, sk, comp] = await Promise.all(promises);

      setExperiences(exp);
      setEducation(edu);
      setCertifications(cert);
      setSkills(sk);
      setCompleteness(comp);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load profile sections';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (autoFetch) {
      fetchAll();
    }
  }, [fetchAll, autoFetch]);

  return {
    experiences,
    education,
    certifications,
    skills,
    completeness,
    loading,
    error,
    refetch: fetchAll,
  };
}

export default useProfileSections;
