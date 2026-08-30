import { MediaLeaning } from '@/domain/MediaLeaning';

/**
 * 언론 관점의 노출·편집 순서.
 * 프롬프트의 성향별 기사 묶음과 검수 폼의 슬롯이 같은 순서를 쓴다.
 */
export const MEDIA_LEANING_ORDER: MediaLeaning[] = [
  MediaLeaning.PROGRESSIVE,
  MediaLeaning.CENTRIST,
  MediaLeaning.CONSERVATIVE,
];
