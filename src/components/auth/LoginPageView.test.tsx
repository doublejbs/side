import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPageView } from '@/components/auth/LoginPageView';
import { createBrowserSupabaseClient } from '@/lib/supabase/createBrowserSupabaseClient';

vi.mock('@/lib/supabase/createBrowserSupabaseClient', () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

const DESCRIPTION =
  '의견을 남기려면 로그인이 필요해요. 어떤 정치적 입장도 저장하지 않으며, 투표 기록은 나에게만 보입니다.';

beforeEach(() => {
  vi.mocked(createBrowserSupabaseClient).mockReset();
});

describe('LoginPageView', () => {
  it('로고와 안내 문구, 공급자 버튼 2개를 보여준다', () => {
    render(<LoginPageView next="/" isAuthEnabled />);

    expect(screen.getByRole('heading', { name: 'SIDE' })).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('Google로 계속하기');
    expect(buttons[1]).toHaveTextContent('카카오로 계속하기');
  });

  it('약관·방침 동의 안내와 두 문서 링크를 보여준다', () => {
    render(<LoginPageView next="/" isAuthEnabled />);

    expect(screen.getByText(/동의하는 것으로 간주됩니다/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  it('로그인이 설정되지 않았어도 약관·방침 링크는 보여준다', () => {
    render(<LoginPageView next="/" isAuthEnabled={false} />);

    expect(screen.getByRole('link', { name: '이용약관' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toBeInTheDocument();
  });

  it('오류로 되돌아왔으면 안내 문구를 보여준다', () => {
    render(<LoginPageView next="/" hasError isAuthEnabled />);

    expect(screen.getByRole('alert')).toHaveTextContent('로그인에 실패했어요. 다시 시도해 주세요.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('로그인이 설정되지 않았어도 오류 안내는 보여준다', () => {
    render(<LoginPageView next="/" hasError isAuthEnabled={false} />);

    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('오류가 없으면 안내 문구를 보여주지 않는다', () => {
    render(<LoginPageView next="/" isAuthEnabled />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('로그인이 설정되지 않았으면 버튼 대신 안내만 보여준다', () => {
    render(<LoginPageView next="/" isAuthEnabled={false} />);

    expect(screen.getByText('로그인이 설정되지 않았습니다')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
