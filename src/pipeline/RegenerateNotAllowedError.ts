/**
 * 승인·반려가 끝난 이슈를 다시 생성하려 할 때 던진다.
 * 이미 공개된 이슈의 주장·근거를 말없이 갈아 끼우지 않기 위한 방어선이다.
 * 근거: `docs/PipelineSpec.md` 5장.
 */
export class RegenerateNotAllowedError extends Error {
  constructor(readonly status: string) {
    super(`${status} 상태의 이슈는 다시 생성할 수 없습니다. 초안·검수 상태에서만 가능합니다.`);

    this.name = 'RegenerateNotAllowedError';
  }
}
