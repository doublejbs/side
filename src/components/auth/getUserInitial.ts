import type { SessionUser } from '@/domain/SessionUser';

/** 아바타 이미지가 없을 때 원 안에 넣을 한 글자. 이름 → 이메일 순으로 찾는다. */
export const getUserInitial = (user: SessionUser): string => {
  const source = user.name?.trim() || user.email?.trim() || '';

  return Array.from(source)[0]?.toUpperCase() ?? '나';
};
