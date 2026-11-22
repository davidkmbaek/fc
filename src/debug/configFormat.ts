/** 튜닝 패널 값의 부동소수 잡음(1.5000000001 등)을 지우는 유효 자릿수 */
const SIGNIFICANT_DIGITS = 6;

/**
 * 튜닝 섹션들을 config.ts에 그대로 붙여 넣을 수 있는 TS 코드로 만든다.
 * (주석은 복사되지 않으므로 값만 바꿔 넣는 용도)
 */
export function formatTunables(sections: Record<string, Record<string, number>>): string {
  return Object.entries(sections)
    .map(([name, section]) => {
      const lines = Object.entries(section).map(
        ([key, value]) => `  ${key}: ${Number(value.toPrecision(SIGNIFICANT_DIGITS))},`,
      );
      return `export const ${name} = {\n${lines.join('\n')}\n};`;
    })
    .join('\n\n');
}
