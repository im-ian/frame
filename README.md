# Frame

여러 디바이스 뷰포트를 한 창에서 동시에 보는 하이브리드 엔진 브라우저입니다.
Phase 1은 Chromium 기반 멀티 뷰포트, URL/스크롤/입력 동기화, 공유 세션을 제공합니다.

## 개발

```bash
pnpm install
pnpm dev
```

## 검증

```bash
pnpm test:unit
pnpm test:e2e
```

`test:e2e`는 `pnpm build` 후 Playwright `_electron`으로 앱을 실행합니다. Linux CI에서는 디스플레이가 필요하므로 `xvfb-run -a pnpm test:e2e` 형태로 실행합니다.

## 빌드

```bash
pnpm build:mac
pnpm build:win
```

macOS 빌드는 unsigned `.dmg`, Windows 빌드는 NSIS installer를 생성합니다. 서명/공증은 배포 환경에서 별도 설정합니다.

## Phase 1 범위

- Chromium `WebContentsView` 기반 다중 디바이스 뷰포트
- 디바이스 프리셋과 커스텀 뷰 추가/삭제
- URL 네비게이션, 스크롤, 클릭/키보드 입력 동기화
- `persist:frame` 세션 파티션을 통한 Chromium 뷰 간 쿠키/스토리지 공유

다음 단계는 실제 WebKit/Firefox 엔진 통합, 엔진 간 세션 동기화, 자동 업데이트입니다.
