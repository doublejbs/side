/** 조건부 className 을 공백으로 이어 붙인다. false·null·undefined 는 무시한다. */
export const joinClassNames = (...names: Array<string | false | null | undefined>): string =>
  names.filter(Boolean).join(' ');
