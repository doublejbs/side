import { IssueStatus } from '@/domain/IssueStatus';

/**
 * "요약 다시 생성"을 허용하는 상태. 승인·반려가 끝난 이슈의 주장은 말없이 갈아 끼우지 않는다.
 * 파이프라인(`regenerateIssue`)과 화면(`IssueActionBarView`)이 같은 목록으로 판단한다.
 * 근거: `docs/PipelineSpec.md` 5장.
 */
export const REGENERATABLE_STATUSES: IssueStatus[] = [IssueStatus.DRAFT, IssueStatus.REVIEW];
