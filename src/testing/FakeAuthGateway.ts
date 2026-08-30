import type { AuthGateway, ExchangedSession } from '@/lib/auth/AuthGateway';

interface FakeAuthGatewayOptions {
  /** 교환에 성공했을 때 돌려줄 사용자 id. 없으면 교환이 실패한 것으로 다룬다. */
  userId?: string | null;
  /** true 면 `exchangeCode`·`signOut` 이 예외를 던진다. */
  shouldThrow?: boolean;
}

/**
 * 테스트 전용 `AuthGateway` 대역. 프로덕션 코드는 이 모듈을 import 하지 않는다
 * (`src/testing/**` 는 `*.test.ts` 에서만 참조 — 번들에 포함되지 않는다).
 */
export class FakeAuthGateway implements AuthGateway {
  readonly exchangedCodes: string[] = [];
  signOutCount = 0;

  private readonly userId: string | null;
  private readonly shouldThrow: boolean;

  constructor({ userId = 'user-1', shouldThrow = false }: FakeAuthGatewayOptions = {}) {
    this.userId = userId;
    this.shouldThrow = shouldThrow;
  }

  async exchangeCode(code: string): Promise<ExchangedSession | null> {
    this.exchangedCodes.push(code);

    if (this.shouldThrow) {
      throw new Error('교환 실패');
    }

    return this.userId ? { userId: this.userId } : null;
  }

  async signOut(): Promise<void> {
    this.signOutCount += 1;

    if (this.shouldThrow) {
      throw new Error('로그아웃 실패');
    }
  }
}
