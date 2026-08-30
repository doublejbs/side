/** CLI 인자와 `PipelineRun.step` 에 쓰는 파이프라인 단계 이름. */
export enum PipelineStep {
  COLLECT = 'COLLECT',
  CLUSTER = 'CLUSTER',
  CLASSIFY = 'CLASSIFY',
  SUMMARIZE = 'SUMMARIZE',
  EXTRACT = 'EXTRACT',
  VERIFY = 'VERIFY',
  LINK = 'LINK',
  ALL = 'ALL',
}
