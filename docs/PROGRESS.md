# 진행 상황

> Claude Code는 작업을 마칠 때마다 이 파일을 갱신한다. 짧게 유지할 것: 완료 항목이 많아지면 단계별로 한 줄 요약으로 접는다.

## 현재 위치

**1단계 — 공과 선수 1명** / 다음 작업: **1.1 공 시뮬레이션(z축, 바운드, 굴러감)과 테스트, 그림자, 클릭으로 공 발사**

(0단계 완료 조건 중 "배포 URL에서 백틱 오버레이"는 0.4를 push한 뒤 배포판에서 확인)

배포 URL: <https://davidkmbaek.github.io/fc/>

## 완료

- **0.1 프로젝트 세팅** (2026-11-22)
  - Vite 8 + TypeScript 6.0(strict, `noUncheckedIndexedAccess`) + Phaser 4.2.1 + ESLint 10 + Prettier 3 + Vitest 5
  - `npm run check` = typecheck → lint → format:check → test
  - ESLint: `any` 금지, `src/sim/**`에서 `phaser` import와 `Math.random` 금지 (위반 시 오류 나는 것 확인함)
  - `vite.config.ts` `base: '/fc/'`, `Scale.FIT` 1280×720 `MatchScene` 자리 표시 화면
  - `src/sim/rng.ts` 시드 RNG(mulberry32)와 테스트 5개
- **0.2 경기장 그리기** (2026-11-22)
  - `config.ts`에 `PITCH` 규격, `PITCH_STYLE`, `RENDER.PX_PER_M`(32)·`Z_SCREEN_SCALE`·`DEPTH`
  - `src/sim/pitch.ts` 규격에서 위치 계산(페널티 아크 반각 등)과 테스트 4개
  - `src/render/PitchRenderer.ts`: 잔디 줄무늬 + 라인을 한 번 그려 `'pitch'` 텍스처(3744×2560)로 저장. 골대는 back(바닥·먼 옆그물·뒷그물) / front(지붕·가까운 옆그물·포스트·크로스바) 두 레이어
  - 월드 전체가 한 화면에 보이는 배율. 개발 빌드에서만 휠 확대·드래그 이동(`devCameraControls.ts`, 1.3에서 대체)
- **0.3 Pages 배포** (2026-11-22)
  - `.github/workflows/deploy.yml`: `main` push → `npm ci` → `npm run check` → build → Pages 배포. check 실패 시 배포 안 함
  - 저장소 Settings → Pages → Source = GitHub Actions (사용자가 설정)
  - 첫 배포 성공, 배포 URL에서 경기장 표시 확인
- **0.4 고정 스텝 루프와 디버그 도구** (2026-11-22)
  - `src/sim/loop.ts` `FixedStepClock`: 누적기, 프레임당 최대 5스텝(넘치면 버림), 배속, 일시정지, 한 스텝 예약. 테스트 9개
  - `src/sim/Simulation.ts`: `prev`/`curr` 두 상태를 두고 스텝마다 필드 복사(객체 생성 없음). 렌더는 `alpha`로 보간
  - 보간 확인용 **임시 점**(`PROBE`, 센터 서클 위를 돎) — 1.1에서 공으로 대체하며 삭제
  - `DebugOverlayScene`(HUD 씬): FPS, 스텝 처리 시간, tick, 시간, 배속, 일시정지. 배포판에서도 동작
  - `src/input/devKeys.ts`: `` ` `` / P / N / `[` `]`. 창 포커스를 잃으면 자동 일시정지
  - `src/debug/tuningPanel.ts`: Tweakpane(개발 빌드만, 동적 import — dist에 포함 안 됨 확인). `TUNABLES` 섹션을 실시간 조절, "config 형식으로 복사"
  - 헤드리스 Chrome + DevTools Protocol로 실제 키 입력을 보내 동작 확인(오버레이, 0.25×, 일시정지, N 3번 = 정확히 3스텝)

## 결정 기록

| 날짜 | 결정 | 이유 |
|---|---|---|
| 2026-11-22 | 2D 탑뷰, Phaser 4 + TypeScript + Vite | 3D는 애니메이션·에셋 부담이 커서 조작감과 AI에 집중하기 위해 |
| 2026-11-22 | 5:5로 시작 → 11:11 확장 | 작은 규모로 게임플레이를 먼저 완성 |
| 2026-11-22 | 공 높이(z축)는 직접 구현 | 로빙 패스, 크로스, 헤딩, 크로스바 판정에 필요 |
| 2026-11-22 | TypeScript는 7.0이 아닌 `~6.0.3`으로 고정 | typescript-eslint 8.x가 `<6.1`만 지원. 지원되면 올린다 |
| 2026-11-22 | Prettier는 `*.md`를 건드리지 않음 | 손으로 쓴 문서 형식(한글 표 정렬)을 유지하기 위해 |
| 2026-11-22 | 시드 RNG는 mulberry32 | 상태가 32비트 정수 하나라 저장·복원(리플레이)이 쉬움 |
| 2026-11-22 | 터치라인·골라인은 바깥 가장자리가 경계(±52.5, ±34)에 오도록 안쪽으로 그림. 나머지 라인은 중심선 기준 | 실제 규칙(라인은 구역에 포함)과 §3 판정식(공 전체가 52.5를 넘어야 아웃·골)에 맞춤 |
| 2026-11-22 | 시뮬레이션 1m = 월드 32px. Phaser 월드 원점 = 센터 스팟 | 40m 줌 기준 화면 1px ≈ 텍스처 1px, 텍스처가 4096 이내 |
| 2026-11-22 | 키 입력은 Phaser 키보드 이벤트 대신 DOM `keydown`/`keyup`을 직접 쓰고 `e.code`로 판별 | Phaser 4.2.1 KeyboardPlugin이 같은 keydown을 여러 번 내보내는 경우 확인(아래 알려진 문제). `e.code`는 한글 입력 상태에서도 물리 키로 들어옴. 1.3 선수 조작 입력도 같은 방식으로 |
| 2026-11-22 | Tweakpane 조절 대상은 `config.ts`의 `TUNABLES`에 등록, 해당 섹션은 `as const` 없이 | 실행 중 값 변경을 타입이 막지 않도록. 규격 등 고정값은 `as const` 유지 |
| 2026-11-22 | 디버그 오버레이와 P/N/`[` `]` 키는 배포판에서도 켬 | 0단계 완료 조건(배포 URL에서 오버레이), 배포판 성능 확인용. 4.4 일시정지 메뉴 때 재검토 |

## 알려진 문제

- 프로덕션 번들이 약 1.37MB(gzip 358KB)로 Vite의 500KB 경고가 뜬다. Phaser 자체 크기라서 지금은 무시한다. 필요하면 나중에 `chunkSizeWarningLimit`을 조정하거나 Phaser를 별도 청크로 분리한다.
- 골대가 납작해 보인다: 골문이 화면 좌우에 있고 높이는 화면 위쪽으로 표현해서, 포스트·크로스바가 골라인과 같은 세로줄에 겹친다. 대안(예: z에 x 방향 기울기 추가) 검토 필요 — DESIGN §8 변경 사항이라 승인 후 진행.
- (Claude Code 환경 한정) Git Bash에서 `cd /c/...` 후 `vitest`를 돌리면 Node의 현재 폴더가 소문자 `c:\`가 되어 모든 테스트가 `Cannot read properties of undefined (reading 'config')`로 실패한다. 경로 대소문자 차이로 vitest가 모듈을 두 번 불러오는 문제. `cd "C:/..."`(대문자)로 이동하거나 PowerShell에서 실행하면 정상. VS Code 터미널과 CI에는 영향 없음.
- Phaser 4.2.1 KeyboardPlugin: 키보드 큐를 `POST_STEP`에서만 비우는데 한 스텝 안에서 큐를 여러 번 처리할 수 있고, 중복 방지는 직전 이벤트 1개와만 비교한다. 그래서 keydown·keyup이 같은 큐에 있으면 같은 keydown이 2~4번 발생했다(N 3번 → 8스텝). Phaser 키보드 이벤트(`keydown-X`)는 쓰지 않는다.
