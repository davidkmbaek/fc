# 진행 상황

> Claude Code는 작업을 마칠 때마다 이 파일을 갱신한다. 짧게 유지할 것: 완료 항목이 많아지면 단계별로 한 줄 요약으로 접는다.

## 현재 위치

**0단계 — 기반** / 다음 작업: **0.2 경기장 그리기**

## 완료

- **0.1 프로젝트 세팅** (2026-11-22)
  - Vite 8 + TypeScript 6.0(strict, `noUncheckedIndexedAccess`) + Phaser 4.2.1 + ESLint 10 + Prettier 3 + Vitest 5
  - `npm run check` = typecheck → lint → format:check → test
  - ESLint: `any` 금지, `src/sim/**`에서 `phaser` import와 `Math.random` 금지 (위반 시 오류 나는 것 확인함)
  - `vite.config.ts` `base: '/fc/'`, `Scale.FIT` 1280×720 `MatchScene` 자리 표시 화면
  - `src/sim/rng.ts` 시드 RNG(mulberry32)와 테스트 5개

## 결정 기록

| 날짜 | 결정 | 이유 |
|---|---|---|
| 2026-11-22 | 2D 탑뷰, Phaser 4 + TypeScript + Vite | 3D는 애니메이션·에셋 부담이 커서 조작감과 AI에 집중하기 위해 |
| 2026-11-22 | 5:5로 시작 → 11:11 확장 | 작은 규모로 게임플레이를 먼저 완성 |
| 2026-11-22 | 공 높이(z축)는 직접 구현 | 로빙 패스, 크로스, 헤딩, 크로스바 판정에 필요 |
| 2026-11-22 | TypeScript는 7.0이 아닌 `~6.0.3`으로 고정 | typescript-eslint 8.x가 `<6.1`만 지원. 지원되면 올린다 |
| 2026-11-22 | Prettier는 `*.md`를 건드리지 않음 | 손으로 쓴 문서 형식(한글 표 정렬)을 유지하기 위해 |
| 2026-11-22 | 시드 RNG는 mulberry32 | 상태가 32비트 정수 하나라 저장·복원(리플레이)이 쉬움 |

## 알려진 문제

- 프로덕션 번들이 약 1.37MB(gzip 358KB)로 Vite의 500KB 경고가 뜬다. Phaser 자체 크기라서 지금은 무시한다. 필요하면 나중에 `chunkSizeWarningLimit`을 조정하거나 Phaser를 별도 청크로 분리한다.
