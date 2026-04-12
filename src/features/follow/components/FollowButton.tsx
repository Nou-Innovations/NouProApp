import React from 'react';
import AppButton from '@/shared/components/ui/AppButton';
import { useFollowStatus } from '../hooks/useFollowStatus';

interface FollowButtonProps {
  businessId: string;
}

export default function FollowButton({ businessId }: FollowButtonProps) {
  const { isFollowing, toggleFollow, loading } = useFollowStatus(businessId);

  if (loading) return null;

  return (
    <AppButton
      title={isFollowing ? 'Following' : 'Follow'}
      variant={isFollowing ? 'outline' : 'primary'}
      size="small"
      onPress={toggleFollow}
    />
  );
}
