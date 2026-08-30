import { describe, expect, it } from 'vitest';

import { getUserInitial } from '@/components/auth/getUserInitial';
import type { SessionUser } from '@/domain/SessionUser';

const buildUser = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: 'user-1',
  email: null,
  name: null,
  avatarUrl: null,
  ...overrides,
});

describe('getUserInitial', () => {
  it('이름의 첫 글자를 쓴다', () => {
    expect(getUserInitial(buildUser({ name: '홍길동' }))).toBe('홍');
  });

  it('영문 이름은 대문자로 바꾼다', () => {
    expect(getUserInitial(buildUser({ name: 'jinyong' }))).toBe('J');
  });

  it('이름이 없으면 이메일의 첫 글자를 쓴다', () => {
    expect(getUserInitial(buildUser({ email: 'someone@example.com' }))).toBe('S');
  });

  it('이름도 이메일도 없으면 기본값을 쓴다', () => {
    expect(getUserInitial(buildUser())).toBe('나');
  });

  it('공백뿐인 이름은 이메일로 넘어간다', () => {
    expect(getUserInitial(buildUser({ name: '   ', email: 'a@b.com' }))).toBe('A');
  });
});
