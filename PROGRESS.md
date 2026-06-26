# What I Need — 진행 상황 & 로드맵

> 작업 재개용 핸드오프 노트. 새 세션이든 기존 세션이든
> **이 파일 + `DESIGN.md` + `.polly/registry.json` + `git log`** 를 보면 바로 이어서 작업할 수 있습니다.

---

## 1. 프로젝트 개요
- **이름**: What I Need (WID) — 크롬 확장 프로그램 (Manifest V3)
- **컨셉**: 페이지 오른쪽 가장자리의 얇은 레일 → 클릭하면 슬라이드 아웃 → 도구 아이콘 실행 ("맥가이버 칼" 도구함)
- **저장소**: https://github.com/Git-Mere/What-I-Need (작업은 `main`에 직접 푸시)
- **기능 5종**: Marker(M) · Brush(B) · Memo(N) · Calculator(C) · Multi-search(S)

## 2. 기술 스택
| 항목 | 선택 |
|---|---|
| 언어 | TypeScript (strict) |
| 빌드 | Vite + @crxjs/vite-plugin |
| UI | Preact — **패널 콘텐츠 전용**, 동적 import |
| 스타일 | Shadow DOM + 평범한 CSS (사이트와 격리) |
| 저장 | chrome.storage.local |
| 매니페스트 | MV3 |

**핵심 패턴**: 항상 떠 있는 얇은 레일은 vanilla TS로 경량 유지, 펼쳤을 때 뜨는 패널 내용만 Preact를 `import()` 로 동적 로드.

**빌드/실행**
```bash
npm install
npm run build      # dist/ 생성
npm run typecheck
```
크롬: `chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램 로드" → `dist/` 선택.
코드 변경 후에는 반드시 **확장 ↻ 새로고침 + 페이지 F5** (안 하면 옛 버전이 돌아감).

## 3. 폴더 구조 (요약)
```
src/content/rail.ts              레일 + 모든 패널 CSS (Shadow DOM <style>)
src/content/shadow-root.ts       Shadow host 생성
src/content/features/panel.tsx   확장 패널 chrome (상단 아이콘 바 + 콘텐츠 라우팅)
src/content/features/registry.ts 기능 5종 목록
src/content/features/memo.tsx    메모 기능
src/content/features/calc.tsx    계산기 기능
src/shared/storage.ts            타입 저장 래퍼 (get/set/remove)
src/shared/types.ts              저장 스키마 + 타입
src/background/service-worker.ts stub
```

---

## 4. 완료된 작업 (main 반영됨)
| 기능 | 내용 | 커밋 |
|---|---|---|
| scaffold | Vite+CRXjs+TS+MV3 뼈대, 오른쪽 레일 stub (Shadow DOM 격리) | `0a01328` |
| memo | 확장 패널 + 메모(textarea, `wid:memo` 복원, 400ms 디바운스 저장) | `6676dd8` |
| calc | 윈도우식 표준 계산기 + 기록(최대 10개 FIFO, `wid:calc:history`) | `fd75655` |
| ui-refine | 연산자 표시 라인, history 토글 버튼, 아이콘 바 상단 이동, min/max-height 버그 수정 | `2b2ade1` |
| panel-anchor | 확장 패널 **상단 고정**(top:10vh) → history 열면 아래로만 확장 | `afcba6e` |
| history-format | 기록 행 = `계산식 결과` (왼쪽) ......... `시간` (오른쪽, 연회색) | `13c0fac` |
| rail-pos | 시간색 진하게(`#94a3b8`), 레일 위치 `top:25%` 로 올림 | `8b51885` |

### 현재 동작 상태
- **레일**: 오른쪽 가장자리 `top:25%`, 클릭하면 슬라이드 아웃 → 5개 아이콘
- **확장 패널**: 아이콘 클릭 → `top:10vh` 상단 고정으로 펼쳐짐, 상단에 `[아이콘들 .... ×]` 바, 그 아래 기능 화면
- **메모**: 전역 1개 텍스트, 자동 저장/복원
- **계산기**: `0-9 . + - x / = % CE C ← +/- 1/x x² √`, 메모리 버튼 없음. 연산자 누르면 숫자 위에 `5 +` 표시. History 버튼 누르면 아래로 펼쳐짐(스크롤)

---

## 5. 확정된 UX / 설계 결정
- 레일 펼침: **클릭** (호버 아님)
- 메모: **전역 1개** (사이트별 아님)
- 저장: **local 만** (sync 안 씀 — sync는 100KB/8KB 제한)
- 마커 / brush: **휘발성** (메모리에만, 페이지 떠나면 소멸)
- 계산기: **메모리 버튼 없음**, 기록 10개 FIFO
- 패널: 상단 고정 + 아래로 확장 / 아이콘 바: 패널 상단

---

## 6. 앞으로 개발할 것 (로드맵)

### A. 검색 (Multi-search) — 다음 작업 1순위
- 무상태 (저장 불필요)
- **시작 전 스펙 합의 필요**: 동작 정의가 아직 모호함
  - 여러 검색엔진에 동시 검색? / 여러 탭으로 열기? / 페이지 내 선택 텍스트로 검색? 등

### B. 마커 (Marker) — 휘발성
- 페이지 특정 위치에 마커 표시, 페이지 떠나면 소멸 (메모리만)
- **UI 주의**: 스크롤바에 직접 못 붙임(브라우저 차단) → 스크롤바 옆에 **미니맵 형태의 자체 레일**로 구현
- **SPA 주의**: URL이 바뀌어도 리로드 안 되는 사이트(유튜브 등)에선 마커가 남을 수 있음 → history API 변경 감지해서 정리할지 추후 결정 (기본은 "휘발")

### C. Brush — 휘발성
- 페이지 위 자유 그리기 (canvas), 페이지 떠나면 소멸
- brush 설정(색/굵기/단축키) 타입은 `wid:settings.brush` 에 이미 정의돼 있음

### D. 레일 on/off 토글 (전역 + 사이트별)
- `wid:settings.railEnabled`, `disabledHosts` 타입 이미 존재 (구현만 남음)
- 사이트 우측 위젯(채팅/맨위로 버튼 등)과 겹칠 때 끄기용 — 사용성상 필요

### E. 그 외 고려사항
- 전체화면 자동 숨김 (유튜브 전체화면 등에서 레일 가리기)
- content script 주입 안 되는 페이지(`chrome://`, 크롬 웹스토어, PDF 뷰어)는 정상적으로 동작 안 함 (어쩔 수 없음)

---

## 7. 자잘한 Follow-up (리뷰에서 나온 것, 모두 비차단)

### 메모
- [ ] 닫을 때 디바운스 **flush** — 400ms 안에 패널 닫으면 마지막 입력이 유실됨
- [ ] 중첩된 `.wid-expanded` 클래스(레일 outer + Preact inner) 정리

### 계산기
- [ ] 반복 `=` 가 마지막 연산을 반복하도록 (윈도우: `5 + 3 =` → 8, `=` → 11). 현재는 두 번째 `=` 가 무시됨
- [ ] `persistHistoryItem` 의 부작용(setHistory + 저장)을 `setState` 업데이터 밖(`useEffect`)으로 이동
- [ ] 단독 `%` → `0` 반환 (윈도우 동작). 현재는 `value/100`
- [ ] 지수 표기 시 끝자리 0 제거 (아주 큰/작은 수에서만, 표시상)
- [ ] 사소: `%` 직후 숫자 입력 시 결과에 append됨 / `+/-` 가 waitingForEntry 무시 / 소수점 입력이 MAX_INPUT_LENGTH 제한 안 받음

---

## 8. 작업 방식 (polly 오케스트레이션)
- 코딩은 서브에이전트(`claude_code` / `codex`)에 위임 → **다른 벤더로 교차 리뷰** → `main` 직접 푸시 (PR 없이, 사용자 합의)
- 순수 시각/사소한 CSS 조정은 게이트(typecheck/build) 통과 시 리뷰 생략 가능
- `pi` 워커는 **API 키 미설정으로 현재 사용 불가** (쓰려면 pi CLI provider 로그인 필요)
- 작업 로그: `.polly/registry.json`
- `gh` CLI 미설치 → PR 자동 생성 불가 (현재 PR 없이 진행 중이라 무관)
