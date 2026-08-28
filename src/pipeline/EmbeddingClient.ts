/**
 * 텍스트 임베딩 인터페이스. 실제 호출(OpenAI)은 구현체 뒤에 두고
 * 테스트에서는 결정적인 가짜 구현으로 대체한다. 근거: docs/PipelineSpec.md 4.2.
 */
export interface EmbeddingClient {
  /** 입력 순서와 같은 순서로 벡터를 돌려준다. */
  embed(texts: string[]): Promise<number[][]>;
}
