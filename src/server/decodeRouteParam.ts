/**
 * 라우트 파라미터로 들어온 slug 를 디코드한다.
 *
 * 한글이 섞인 slug 는 브라우저가 퍼센트 인코딩해서 보내는데, 런타임에 따라
 * `params` 가 인코딩된 상태 그대로 들어와 저장된 slug 와 어긋난다(404).
 * 이미 디코드된 값은 그대로 두고, 깨진 인코딩(`URIError`)이면 원문을 돌려준다.
 */
export const decodeSlugParam = (value: string): string => {
  if (!value.includes('%')) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (error instanceof URIError) {
      return value;
    }

    throw error;
  }
};
