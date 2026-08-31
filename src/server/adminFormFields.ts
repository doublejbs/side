import { MEDIA_LEANING_ORDER } from '@/domain/mediaLeaningOrder';
import { OPINION_GROUP_LABELS } from '@/domain/opinionGroupPresenter';

/** 쟁점은 항상 4개를 편집한다. 근거: docs/PipelineSpec.md 5장. */
export const KEY_POINT_COUNT = 4;

/**
 * 검수 폼의 관점 축 필드 이름. 뷰와 서버 액션이 같은 값을 쓰도록 한곳에 모은다.
 * 근거: `docs/PerspectiveSpec.md` 1장.
 */

/** 축을 고르지 않은 칸의 값. `<select>` 는 빈 문자열만 "값 없음" 으로 보낼 수 있다. */
export const UNSET_AXIS_VALUE = '';

export const issueAxisAxisField = (index: number): string => `axis-${index}-axis`;

export const issueAxisDirectionField = (index: number): string => `axis-${index}-direction`;

/** 언론 관점·의견 그룹 칸 수는 파이프라인이 쓰는 목록과 같은 길이를 유지한다. */
export const MEDIA_PERSPECTIVE_COUNT = MEDIA_LEANING_ORDER.length;

export const OPINION_GROUP_COUNT = OPINION_GROUP_LABELS.length;

export const keyPointIdField = (index: number): string => `keyPoint-${index}-id`;

export const keyPointTitleField = (index: number): string => `keyPoint-${index}-title`;

export const keyPointQuestionField = (index: number): string => `keyPoint-${index}-question`;

export const mediaLeaningField = (index: number): string => `media-${index}-leaning`;

export const mediaArticleCountField = (index: number): string => `media-${index}-articleCount`;

export const mediaFrameField = (index: number): string => `media-${index}-frame`;

export const mediaKeywordsField = (index: number): string => `media-${index}-keywords`;

export const mediaTitleField = (index: number): string => `media-${index}-title`;

export const mediaSourceField = (index: number): string => `media-${index}-source`;

export const mediaUrlField = (index: number): string => `media-${index}-url`;

export const groupIdField = (index: number): string => `group-${index}-id`;

export const groupShareField = (index: number): string => `group-${index}-share`;

export const groupDescriptionField = (index: number): string => `group-${index}-description`;

export const claimTitleField = (claimId: string): string => `claim-${claimId}-title`;

export const claimDescriptionField = (claimId: string): string => `claim-${claimId}-description`;

export const evidenceTypeField = (evidenceId: string): string => `evidence-${evidenceId}-type`;
