/** CLI 인자와 `PipelineRun.step` 에 쓰는 파이프라인 단계 이름. */
export enum PipelineStep {
  COLLECT = 'COLLECT',
  CLUSTER = 'CLUSTER',
  SUMMARIZE = 'SUMMARIZE',
  EXTRACT = 'EXTRACT',
  LINK = 'LINK',
  ALL = 'ALL',
}
