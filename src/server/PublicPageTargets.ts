/** `revalidatePath` 로 다시 만들 공개 화면 하나. 라우트 문자열과 동적 여부만 담는다. */
export interface PublicPageTarget {
  path: string;
  /** `[issueId]` 같은 동적 경로는 Next 에 'page' 타입임을 알려야 무효화된다. */
  isDynamicPage: boolean;
}

/**
 * 승인·반려로 내용이 바뀌면 다시 만들어야 하는 공개 화면들.
 * 공개 페이지는 ISR(60초)로 굳어 있으므로 검수 결과가 바로 보이려면 이 경로들을 무효화해야 한다.
 * 근거: `docs/PipelineSpec.md` 6장.
 */
export const PUBLIC_PAGE_TARGETS: PublicPageTarget[] = [
  { path: '/', isDynamicPage: false },
  { path: '/discover', isDynamicPage: false },
  { path: '/issues/[issueId]', isDynamicPage: true },
  { path: '/issues/[issueId]/result', isDynamicPage: true },
  { path: '/issues/[issueId]/claims/[claimId]', isDynamicPage: true },
];
