# What I Need (WID) — 설계 문서

웹 서핑 중 "있으면 좋겠다" 싶은 도구들을 한데 모은 맥가이버 칼 같은 크롬 확장.

---

## 1. 컨셉 & 동작 방식

- 모든 일반 웹페이지의 **오른쪽 가장자리에 아주 얇은 레일(bar)** 이 떠 있다.
- 레일을 클릭/호버하면 왼쪽으로 **슬라이드 아웃**되어 기능 아이콘들이 나타난다.
- 아이콘을 누르면 해당 기능이 실행된다 (계산기/메모는 패널로, 마커/brush/검색은 페이지 위에서 동작).
- 팝업 방식은 쓰지 않는다. 확장 아이콘 클릭은 "레일 전역 on/off" 정도의 보조 역할만.

### 핵심 성능 원칙: 지연 활성화(lazy activation)
- 모든 페이지에 상주하는 것은 **극도로 가벼운 레일 stub** 뿐 (vanilla TS).
- 무거운 UI(계산기/메모/검색 엔진/brush 캔버스)는 **아이콘을 눌러 실제로 켤 때 동적 import**.
- 결과: 평소 페이지 로딩/성능에 미치는 영향은 사실상 0.

---

## 2. 기술 스택

| 항목 | 선택 |
|---|---|
| 언어 | TypeScript |
| 빌드 | Vite + @crxjs/vite-plugin |
| UI | Preact (패널 UI 한정, 동적 로드) / 레일 stub은 vanilla TS |
| 스타일 | Shadow DOM + 평범한 CSS (사이트와 격리) |
| 저장 | chrome.storage.local |
| 매니페스트 | Manifest V3 |

---

## 3. 아키텍처

```
[Service Worker (background)]
   - 단축키 명령(commands) 수신, content script에 메시지 전달
   - 전역 설정 관리 (storage 중계)

[Content Script]  ← 모든 일반 페이지에 주입
   - 레일 stub 렌더 (Shadow DOM 루트 1개)
   - 아이콘 클릭 시 해당 기능 모듈을 동적 import
   - 마커 / brush / 검색은 여기서 페이지와 직접 상호작용
   - 계산기 / 메모 패널도 이 Shadow DOM 안에서 렌더

[chrome.storage.local]
   - 메모 본문, 계산 기록(최대 10), 사용자 설정(단축키/색상/사이트별 on-off)
```

- 휘발성 기능(마커·brush): content script 메모리(변수/캔버스)에만 존재. 페이지 unload 시 자동 소멸. storage 미사용.
- 영속 기능(메모·계산기록): storage.local 사용.
- 검색: 무상태. storage 미사용.

---

## 4. 폴더 구조 (초안)

```
WID/
├─ manifest.config.ts        # @crxjs용 manifest 정의
├─ vite.config.ts
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ background/
│  │  └─ service-worker.ts
│  ├─ content/
│  │  ├─ index.ts            # 진입점: 레일 stub 부팅
│  │  ├─ rail.ts             # 얇은 바 + 슬라이드 아웃 (vanilla, 경량)
│  │  ├─ shadow-root.ts      # Shadow DOM 컨테이너 생성
│  │  └─ features/           # 동적 import 대상 (켤 때만 로드)
│  │     ├─ marker/          # 스크롤바 마커
│  │     ├─ brush/           # 드로잉 오버레이
│  │     ├─ search/          # 다중 검색
│  │     ├─ memo/            # 메모장 패널 (Preact)
│  │     └─ calculator/      # 계산기 패널 (Preact)
│  ├─ shared/
│  │  ├─ storage.ts          # storage.local 래퍼 (타입 안전)
│  │  └─ types.ts
│  └─ styles/
└─ DESIGN.md
```

---

## 5. 기능별 명세

### 5.1 마커 (Marker) — 휘발성
- 스크롤바 옆(또는 위)에 마커를 부착. 긴 페이지에서 클릭하면 해당 위치로 즉시 스크롤 이동.
- 동작: 활성화 후 원하는 지점에서 마커 추가 → 페이지 높이 대비 비율로 위치 기록 → 사이드의 미니맵 형태로 표시.
- 저장 안 함. 새로고침/이탈 시 사라짐.
- 주의: SPA(history 변경)는 실제 리로드가 아니므로 기본은 "그대로 유지", 경로 변경 감지 후 초기화는 추후 옵션.

### 5.2 Brush — 휘발성
- 지정 키(기본 Alt) + 마우스 드래그로 페이지 위에 자유롭게 그리기.
- 전체 화면 덮는 투명 `<canvas>` 오버레이, pointer 이벤트로 선 그림.
- 색/굵기 설정(설정값은 storage.sync 또는 local에 저장 가능).
- 그림 데이터 자체는 저장 안 함. 페이지 이탈 시 소멸.

### 5.3 메모장 (Memo) — 영속
- 단순 텍스트 영역 1개. 입력 즉시(디바운스) storage.local에 저장.
- 페이지/사이트 무관 전역 메모 1개로 시작 (사이트별 메모는 추후 확장 여지).

### 5.4 계산기 (Calculator) — 영속(기록만)
- 윈도우 표준 계산기 기준. **메모리 버튼(MC/MR/M+/M-/MS) 제외.**
- 버튼: `%` `CE` `C` `←(backspace)` `1/x` `x²` `√` `÷` `×` `−` `+` `=` `+/-` `.` `0-9`
- 계산 기록 **최대 10개**, FIFO로 초과분 제거, storage.local 저장.
- 키보드 입력 지원(숫자/연산자/Enter=등호/Esc=C).

### 5.5 다중 검색 (Multi-search) — 무상태
- 자체 검색 UI를 띄워 **여러 검색어를 동시에** 하이라이트.
- 검색어별 색상 구분, 각 검색어의 매치 수 표시, 다음/이전 이동.
- 구현 난이도 최상: 기본 Ctrl+F는 브라우저가 가로채기 어려우므로 별도 UI + DOM 직접 하이라이트로 구현. 동적 페이지에서 하이라이트 유지가 까다로우니 마지막 단계로.

---

## 6. 저장 스키마 (chrome.storage.local)

```ts
{
  "wid:settings": {
    railEnabled: boolean,            // 전역 on/off
    disabledHosts: string[],         // 사이트별 off 목록
    brush: { key: "Alt"|"Ctrl"|..., color: string, width: number }
  },
  "wid:memo": { text: string, updatedAt: number },
  "wid:calc:history": Array<{ expr: string, result: string, at: number }> // 최대 10
}
```

---

## 7. 권한(permissions) 초안

- `storage` — 메모/기록/설정 저장
- `activeTab` / content script `matches: ["<all_urls>"]` — 레일 주입
- `commands` — 단축키(brush 토글, 검색 토글 등)
- (`unlimitedStorage`는 현재 계획상 불필요 — brush를 저장 안 하므로)

---

## 8. 단계별 로드맵

1. 뼈대: Vite+CRXjs+TS, MV3 manifest, Shadow DOM 레일 stub 부팅 → 빈 패널 열림 확인
2. 메모장 (가장 단순, storage 패턴 확립)
3. 계산기 (메모리 제외, 기록 10개)
4. 마커
5. brush
6. 다중 검색 (최난이도, 마지막)

각 단계는 독립 작업 단위 → 별도 브랜치/PR로 진행, 다른 벤더로 교차 리뷰.

---

## 9. 결정 사항 / 미해결 사항

확정:
- 레일 펼침 트리거: **클릭**
- 메모: **전역 1개**

미해결(프로토타입 후 결정):
- 마커 UI 형태(스크롤바 옆 미니맵) — 1차 구현 후 사용자 피드백 예정
- 전체화면 시 레일 자동 숨김 처리 방식
- SPA 경로 변경 시 마커/brush 초기화 여부
- 다중 검색의 동적 DOM 재하이라이트 전략
```
