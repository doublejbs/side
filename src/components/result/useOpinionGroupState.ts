'use client';

import { useCallback, useState } from 'react';

interface UseOpinionGroupStateResult {
  expandedGroupId: string | null;
  handleToggle: (groupId: string) => void;
}

export const useOpinionGroupState = (): UseOpinionGroupStateResult => {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const handleToggle = useCallback((groupId: string) => {
    setExpandedGroupId((current) => (current === groupId ? null : groupId));
  }, []);

  return { expandedGroupId, handleToggle };
};
