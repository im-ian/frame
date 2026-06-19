# Frame — 멀티뷰포트 / 멀티엔진 브라우저 설계

**날짜:** 2026-06-19
**상태:** 설계 승인됨, 구현 계획 대기

## 1. 개요

`Frame`은 하나의 URL을 입력하면 여러 뷰포트(PC·태블릿·모바일 등)를 한 화면에서 동시에 보여주는 데스크탑 브라우저 도구다. 사용자는 뷰를 직접 추가/삭제/커스텀하고, 뷰마다 렌더링 엔진을 선택할 수 있다. 네비게이션·스크롤·입력이 전 뷰에 동기화되고, 세션(로그인 쿠키 등)도 공유된다.

기존 도구(Responsively App, Polypane, Sizzy)와의 차별점: **하이브리드 엔진**. 기본은 빠른 Chromium 에뮬레이션, 필요하면 특정 뷰만 실제 WebKit/Firefox 엔진으로 전환해 엔진 고유 렌더링 차이까지 검증한다.

## 2. 목표 / 비목표

### 목표
- 한 주소 → 다중 뷰포트 동시 렌더링
- 뷰 추가/삭제/크기 커스텀, 디바이스 프리셋 제공
- 뷰별 렌더링 엔진 선택 (Chromium / 실제 WebKit / 실제 Firefox)
- URL 네비게이션 + 스크롤 + 입력 미러링 동기화
- 세션 공유 (같은 엔진 뷰들 간 쿠키/스토리지 공유)
- macOS + Windows 지원

### 비목표 (현 스코프 밖)
- 모바일/웹 버전 (데스크탑 전용 — 세션 공유·CORS 우회·엔진 제어가 데스크탑에서만 가능)
- 완전한 cross-browser 자동화 테스트 러너 (시각 검증 도구지 CI 러너 아님)
- 엔진 간 100% 동일 세션 보장 (아래 한계 참조)

## 3. 사용자 / 핵심 시나리오

- 프론트엔드 개발자가 반응형 레이아웃을 여러 사이즈에서 동시에 확인
- 로그인 후 페이지를 모든 뷰포트에서 한 번에 검증 (세션 공유 덕에 재로그인 불필요)
- Chromium에선 정상인데 Safari/WebKit에서 깨지는 CSS 버그를 실제 엔진 뷰로 잡아냄

## 4. 기술 스택 / 접근법

**셸: Electron**
- Chromium 내장 → 기본 뷰는 네이티브 `WebContentsView`(Electron 30+, `<webview>`/`BrowserView`는 deprecated)로 지연 없이 완전 상호작용.
- Node.js 내장 → Playwright로 실제 엔진(WebKit/Firefox) 오케스트레이션.
- macOS + Windows 단일 코드베이스.
- **Tauri 기각 사유:** OS마다 시스템 웹뷰 엔진이 달라(Mac=WebKit, Win=WebView2) "기본 엔진"이 플랫폼별로 달라지고, Playwright용 Node 사이드카가 별도로 필요해진다. MVP에 마찰이 크다.

**렌더러 UI:** React + TypeScript + Vite (electron-vite).

**실제 엔진 뷰 임베드:** Playwright로 실제 브라우저를 띄우고 화면을 **screencast로 스트리밍 → 렌더러 canvas에 그리고 입력을 역전달**한다. 단일 창 UX를 유지하되 약간의 지연을 감수한다.
- **대안(기각):** 실제 OS 창을 띄워 타일링 → 통합 창 느낌이 깨지고 device frame을 씌울 수 없으며 스크롤/오버레이 동기화가 어렵다. 향후 "뷰 팝아웃" 옵션으로만 고려.

## 5. 아키텍처

두 종류의 렌더링 경로를 하나의 추상 인터페이스 뒤에 숨긴다.

```
ViewController (인터페이스)
  navigate(url)            URL 이동
  setViewport(w, h, dpr)   뷰포트 크기/픽셀비
  forwardInput(evt)        정규화된 입력 주입
  getScroll() / setScroll(pos)
  captureState()           현재 URL/스크롤 등
  onNavigated(cb)          네비게이션 완료 콜백
   │
   ├─ ChromiumView         Electron WebContentsView + CDP device emulation (기본 뷰, 지연 0)
   └─ PlaywrightView       chromium | webkit | firefox, screencast (실제 엔진 뷰)
```

### 프로세스 분리
- **메인 프로세스**
  - 뷰 레지스트리 (열린 뷰 목록 + 각 ViewController)
  - 세션 파티션 관리 (Electron `session` partition, Playwright persistent context)
  - Playwright 브라우저 풀 (엔진별 1 인스턴스, 지연 기동)
  - 동기화 버스 (navigate/scroll/input 이벤트 브로드캐스트)
- **렌더러 프로세스**
  - 뷰포트 캔버스: 가로 스크롤되는 device frame 행 (Responsively식 레이아웃)
  - 툴바: URL바 · 디바이스 프리셋 드롭다운 · "뷰 추가" · 뷰별 엔진 셀렉터 · 미러링 ON/OFF 토글
  - 각 뷰 카드: HTML로 bezel/라벨만 그림. 실제 웹 콘텐츠는 네이티브 `WebContentsView`(기본 뷰) 또는 screencast canvas(실제 엔진 뷰)가 그 위에 떠 있음.

**네이티브 레이아웃 현실 (중요):** `WebContentsView`는 CSS 흐름에 안 들어감 — 위치는 메인 프로세스가 `setBounds(rect)`로 픽셀 단위 직접 지정. 그래서 **렌더러가 각 뷰포트 rect를 계산(스크롤/리사이즈 반영) → IPC로 메인에 전달 → 메인이 `setBounds`**. 뷰 제거/창 종료 시 `webContents.close()` 수동 호출 필수(자동 GC 안 됨). 에뮬 뷰엔 DevTools를 띄우지 않음(webContents당 CDP 디버거 1개 제약).

### 모듈 경계 (high cohesion, low coupling)
- `view/` — ViewController 인터페이스 + 두 구현체
- `sync/` — 동기화 버스, 이벤트 정규화/좌표 매핑
- `session/` — 파티션·컨텍스트 수명 관리
- `engine/` — Playwright 브라우저 풀, screencast 파이프
- `ui/` — React 컴포넌트 (toolbar, viewport-grid, device-frame, engine-selector)
- `presets/` — 디바이스 프리셋 데이터

## 6. 데이터 흐름

### 주소 입력 → 전 뷰 이동
```
URL바 입력
  → 메인: navigate(url) 브로드캐스트
  → 각 ViewController.navigate(url) 병렬 호출
  → onNavigated 콜백으로 URL바 동기화 (리다이렉트 반영)
```

### 입력 미러링 (미러링 ON)
```
뷰A에서 click / keydown / scroll 캡처
  → 정규화 이벤트 { type, 상대좌표(0~1), key, deltaY, synthetic:false } 생성
  → 동기화 버스 → 나머지 뷰에 forwardInput
       NativeChromiumView: CDP Input 도메인으로 디스패치
       PlaywrightView:     page.mouse / keyboard / wheel
  → 좌표는 뷰포트 CSS폭 기준 상대좌표로 스케일 (크기 다른 뷰 best-effort 매핑)
```
- 미러링 OFF → 포커스된 뷰만 조작.
- **무한루프 방지:** 미러링으로 주입된 이벤트엔 `synthetic: true` 플래그 → 재브로드캐스트하지 않음.

### 세션
- 네비게이션이 세션 파티션을 통해 일어나므로 쿠키가 자동으로 따라온다.
- 기본 Chromium 뷰들 → Electron `session` 파티션 **하나 공유** → 쿠키/localStorage 자동 공유. 로그인 한 번 = 전 뷰 로그인.
- Playwright 엔진별 → 엔진당 persistent context 하나를 모든 뷰포트가 공유 (WebKit 뷰들끼리, Firefox 뷰들끼리).

## 7. 엔진 처리 — 솔직한 한계

- **엔진 간 세션 자동 공유 불가.** Chromium·WebKit·Firefox는 각자 쿠키 jar가 분리돼 있다. 한 엔진에서 로그인해도 다른 엔진 뷰엔 자동 반영 안 됨. 로그인 후 쿠키 복사-주입으로 흉내는 가능하나 **Phase 3 stretch goal**.
- **WebKit ≠ 100% Safari.** Playwright WebKit은 실제 WebKit 엔진이라 WebKit 고유 레이아웃/CSS 동작을 잡아내지만, 애플 Safari의 독자 기능까지 동일하진 않다 (특히 Windows). UI에 "실제 WebKit 엔진 (Safari 근사)"로 명시.
- **screencast 지연.** 실제 엔진 뷰는 네이티브 뷰보다 반응이 느리다. 기본 뷰는 네이티브라 영향 없음.

## 8. 단계별 스코프

### Phase 1 — MVP (코어 동작)
- Electron 셸 + React UI
- 다중 Chromium device 뷰 (추가/삭제/크기 커스텀)
- 디바이스 프리셋 (iPhone, iPad, 데스크탑 등) + 커스텀 입력
- URL바 → 전 뷰 네비게이션 동기화
- 스크롤 동기화 + 입력 미러링 (Chromium 뷰들)
- 세션 공유 (Chromium 파티션 하나)
- 엔진 셀렉터 UI 존재, 단 Phase 1은 Chromium만 (Safari/Firefox 선택 시 "UA 흉내"로 표기)

### Phase 2 — 진짜 엔진
- Playwright 통합: 실제 WebKit · Firefox
- screencast 스트리밍 + 입력 역전달
- 뷰별 실제 엔진 전환
- 엔진별 세션 공유 (persistent context)

### Phase 3 — 다듬기
- 엔진 간 세션 동기화 (쿠키 복사-주입)
- 스크린샷/내보내기, 새로고침·뒤로가기 동기, 핫키
- 패키징·자동업데이트 (macOS + Windows)
- (선택) 통합 devtools, 뷰 팝아웃

## 9. 리스크 / 열린 질문

- **좌표 매핑 정확도:** 뷰포트 크기가 크게 다르면 상대좌표 매핑이 어긋날 수 있다. Phase 1에서 실측 후 element 기반 매핑 보강 검토.
- **screencast 성능:** 뷰 수가 많을 때 실제 엔진 뷰의 프레임률/CPU 부담. 비활성 뷰 프레임 throttle 필요할 수 있음.
- **X-Frame-Options / CSP:** 일부 사이트는 임베드를 막는다. `WebContentsView`는 독립 최상위 web content라 iframe 제약을 받지 않음(이게 데스크탑 앱인 이유). 헤더 스트립이 필요한 엣지 케이스는 Phase 1에서 확인.
- **Playwright 번들 크기:** 엔진 바이너리 동봉 시 패키지 용량 증가. 최초 실행 시 다운로드 vs 동봉 결정 (Phase 2).

## 10. 테스트 전략

- **단위:** 이벤트 정규화·좌표 매핑 로직, 프리셋 파싱, 세션 파티션 선택 로직.
- **통합:** ViewController 두 구현체가 동일 인터페이스 계약을 지키는지 (navigate/setViewport/forwardInput).
- **E2E:** Electron + Playwright로 앱 자체를 구동 — "주소 입력 → N개 뷰 동시 이동", "한 뷰 스크롤 → 전 뷰 동기화", "로그인 후 새 뷰 추가 시 세션 유지" 핵심 플로우.
- 시각 검증(스크린샷)은 보조 — 마크업 단언보다 신호가 강한 뷰 컴포넌트에 활용.
