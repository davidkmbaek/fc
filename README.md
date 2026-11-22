# fc

브라우저에서 돌아가는 탑뷰 2D 축구 게임. "옛날 2D 축구 게임 화면 + FIFA 같은 조작감"이 목표다.

**▶ 플레이: <https://davidkmbaek.github.io/fc/>**

타이틀에서 우리 팀 색과 난이도를 고르고 경기를 시작한다. 5:5, 전·후반 각 3분(화면 시계 45분), 킥오프·스로인·코너킥·골킥이 있다.

## 조작 (키보드)

| 동작 | 키 |
|---|---|
| 이동 | 방향키 |
| 짧은 패스 / (수비) 스탠딩 태클 | S |
| 로빙 패스 / (수비) 슬라이딩 태클 | A |
| 스루패스 | W |
| 슛 (누른 시간 = 세기) | D |
| 스프린트 | E |
| 선수 전환 (방향키와 함께 누르면 그 방향) | Q |
| 일시정지 메뉴 | Esc |
| (개발용) 디버그 오버레이 / 일시정지 / 한 스텝 / 배속 | `` ` `` / P / N / `[` `]` |

우리 팀 세트피스(킥오프·스로인 등)에서는 키커를 조종하게 되고, 킥 버튼으로 시작한다.

## 시나리오

URL 뒤에 붙이면 타이틀을 건너뛰고 바로 시작한다.

- `?scenario=match` — 정식 경기 (타이틀의 "경기 시작"과 같음)
- `?scenario=team` — 규칙 없는 5:5 연습 (골·아웃 뒤 바로 킥오프 자리)
- `?scenario=freeplay` — 혼자 드리블·슛 연습
- `?scenario=penalty` — 페널티킥
- `?scenario=tackle` — 태클 연습
- `&difficulty=easy|normal|hard` — 상대 AI 난이도 (기본 normal)
- `&seed=123` — 난수 시드 (같은 시드 + 같은 입력 = 같은 결과)

예: <https://davidkmbaek.github.io/fc/?scenario=match&difficulty=easy>

## 개발

```bash
npm install
npm run dev     # 개발 서버 (http://localhost:5173/fc/)
npm run check   # 타입 체크 + 린트 + 포맷 + 테스트
npm run build   # 프로덕션 빌드
npm run sim -- --matches 20 --seed 1   # 브라우저 없이 AI 대 AI 경기(종료 휘슬까지) 통계
```

설계 문서는 [docs/DESIGN.md](docs/DESIGN.md), 진행 상황은 [docs/PROGRESS.md](docs/PROGRESS.md)에 있다.
`main`에 push하면 GitHub Actions가 검사 후 GitHub Pages에 배포한다.
