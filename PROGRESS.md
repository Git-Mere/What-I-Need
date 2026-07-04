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
| brush-ux | 그리기 모드 커서 링(브러시=굵기, 지우개=고정 24px) + 지우개 고정 반경(보이는 원=지워지는 범위) + 레일/패널 수직 드래그 이동(3핸들, 버튼은 클릭 유지, 빈 영역만 드래그) + 위치 전역 저장 `wid:settings.railTop` | `afcf1cf` (impl claude_code / review codex) |
| marker | 스크롤 위치 북마크 패널(휘발성, 최대 10개): 현재 스크롤 저장, 목록(Mark N + %) 클릭 시 이동, 행별 × 삭제 + rename(✎) | `619d534` / v2 `abc0453` (impl claude_code / review codex) |
| eyedropper | 네이티브 EyeDropper 색 채집(6번째 기능): 스와치+HEX(복사)+RGB, 마지막 색 지속(`wid:eyedropper`), feature-detect | `69a5ca8` (impl claude_code / review codex) |
| toolbar-color | 레일 바 배경 반투명 슬레이트(`rgba(100,116,139,0.6)` + backdrop blur) — 밝은/어두운 배경 모두 가시 | `94d0d92` (impl codex / review claude_code) |
| brush | 문서 전체 캔버스(스크롤 따라감, 휘발성) + 패널 툴바(HSV 컬러 휠+밝기 / 굵기 / 지우개 / 일괄 지우기 / 단축키 리바인드), `` ` ``(Backquote) hold-to-draw, stroke-object 지우개(획 일부만 닿아도 전체 삭제), pointer-events 통과 | `7acdce8` (impl claude_code / review codex) |
| multi-search | 검색어 여러 행(+버튼으로 추가), 엔터/검색 버튼 실행, 검색어별 색 하이라이트(CSS Custom Highlight API), 행별 매치수 + × 삭제, 무상태(닫으면 하이라이트 제거) | `8122225` |

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

> **6개 기능 전부 구현 완료** (Marker `619d534`+v2 `abc0453`, Brush·brush-ux `afcf1cf`, Memo/Calc, Multi-search, Eyedropper `69a5ca8`).
> 다음 후보(미확정, 사용자 확인 필요): **D. 레일 on/off 토글**(전역+사이트별) — 아래 D 항목 참고. 그 외 §7 follow-up들.

### A. 검색 (Multi-search) — ✅ 완료/종료 (v1 `8122225`, v2 nav/10색/10개제한, 자동검색 `e855fc1`, 팔레트 `93005b5`, follow-up 수정 `4e6e7e0`/`a8f6d02`)
- 확정 동작: Ctrl+F 유사. S 탭 → 검색어 입력 행(기본 1행, **최대 10행**), 아래 + 버튼으로 행 추가(10행 도달 시 disabled). 각 행 `[색점][입력칸][현재/전체 카운트][▲][▼][×]`.
- **자동 검색(기본)**: 입력을 멈추면 250ms 디바운스 후 자동 검색(Search 버튼 없음). Enter는 디바운스 건너뛰고 즉시 검색. 검색어별 다른 색 하이라이트, 대소문자 무시, 무상태.
- 구현: `src/content/features/search.tsx`. CSS Custom Highlight API(`CSS.highlights`/`Highlight`/`Range`)로 DOM 무변형 하이라이트. `::highlight()` 스타일은 호스트 문서 head에 주입, 언마운트 시 하이라이트+스타일+pending 디바운스 타이머 제거.
- 색 팔레트 **10색(순환 없음, 행 index와 1:1)** — hue 전체 색상환 ~36도 간격으로 배치, 전 색 #17202a 대비 WCAG AA(>=4.5:1). 자기 UI(`#wid-shadow-host`)와 SCRIPT/STYLE/TEXTAREA/NOSCRIPT는 검색 제외.
- **행별 ▲▼ 이동**: 그 행 매치 순회(래핑). 전역 활성 매치 1개만 강조(`wid-search-active`, 진한 배경 `#ff6a00` priority=1) + `scrollIntoView` 중앙. 활성 행은 `현재/전체`, 비활성 `전체`. 매치 0이면 ▲▼ disabled.

### B. 마커 (Marker) — ✅ 완료/머지 (`619d534`, impl claude_code / review codex 0 blocking)
- 확정/구현 스펙: **스크롤 위치 북마크**(텍스트 하이라이트 아님), 휘발성(메모리만, 페이지 떠나면 소멸)
- 패널 리스트 방식으로 구현 (초기 "미니맵 레일" 아이디어 대신 사용자 확정 스펙): 패널에 `+ 마커 추가` 버튼 → 현재 `window.scrollY` 저장. 목록에 `마커 N` + 전체 스크롤 높이 대비 `%` 표시, 항목 클릭 시 `scrollTo({behavior:'smooth'})`로 이동, 행별 `×` 삭제, **최대 10개**(도달 시 add disabled)
- 구현 파일: `src/content/features/marker.tsx`(Preact state, 저장소 없음) + `panel.tsx` 라우팅 + `rail.ts` `.wid-marker*` CSS. `registry.ts`의 `Marker`/`M` 엔트리는 기존에 있어 그대로 사용
- %는 `scrollY / (scrollHeight - innerHeight)` 렌더 시 계산, unscrollable 페이지 0% 가드 + [0,100] 클램프
- v2(`abc0453`/merge `ddd276b`, impl claude_code / review codex): **UI 문구 영어화**(`+ Add mark` / `Max 10` / `Mark N` 등) + **마커 rename**(행별 ✎ 버튼 → 인라인 input, Enter/blur 커밋, Esc 취소, 빈값이면 기본 `Mark N` 복귀; `name` 필드가 라벨 구동 → 삭제해도 재번호 안 됨, monotonic id=기본 번호; rename 중엔 goto 버튼을 input으로 교체해 클릭 스크롤 방지)
- 미확정(추후): SPA URL 변경 시 정리 여부(현재는 "휘발")

### C. Brush — ✅ 완료/머지 (`7acdce8`, impl claude_code / review codex 0 blocking)
- 확정 스펙: 문서 전체 캔버스(스크롤 따라감), 휘발성(메모리만, 언로드 시 소멸)
- 발동: 리바인드 가능한 키 hold(기본 `` ` `` Backquote, `event.code` 기준), 누르는 동안만 커서 브러시 + pointer-events 잡음, 평소 통과. 입력창/우리 shadow host 포커스 시 발동 안 함
- 툴바(패널 안): HSV 컬러 휠 + 밝기 슬라이더 / 굵기 슬라이더 / 지우개 토글 / 일괄 지우기 / 단축키 리바인드
- 지우개 = stroke-object(획 = points+color+width 벡터 객체, 지우개가 닿으면 획 전체 삭제 후 redraw)
- 설정(색/굵기/키)만 `wid:settings.brush` 유지, 스키마 `brush.key` 를 modifier-only union → 임의 `KeyboardEvent.code` string 으로 확장
- 구현 파일: `src/content/features/brush-engine.ts`(엔진/캔버스/스트로크) + `brush.tsx`(패널 툴바)
- follow-up(비차단): shadow-root 내부 포커스 감지 보강 / z-index 공유 상수화 / 휠 캔버스 DPR 미적용 / 브러시 off 스위치 없음 / `<html>` position:static 가정
- brush-ux(`afcf1cf`) 추가 개선: 커서 링(브러시=굵기/지우개=고정 24px), 지우개 고정 반경(ERASER_RADIUS=12, 보이는 원=지워지는 범위, 이전 "굵기 연동" follow-up 해소), 레일/패널 수직 드래그 이동(`rail-position.ts`, 3핸들, 버튼 클릭 보존, 4px 임계, 클램프, 드래그 종료 시만 영속)
- brush-ux 추가 follow-up(비차단): 클릭 억제 `setTimeout(0)` 타이밍 의존 → 플래그화 / `persistRailTop` 설정 병합 deep-merge

### D. 레일 on/off 토글 (전역 + 사이트별)
- `wid:settings.railEnabled`, `disabledHosts` 타입 이미 존재 (구현만 남음)
- 사이트 우측 위젯(채팅/맨위로 버튼 등)과 겹칠 때 끄기용 — 사용성상 필요

### F. 스포이드 (Eyedropper) — ✅ 완료/머지 (`69a5ca8`, impl claude_code / review codex 0 blocking)
- 구현: 6번째 기능(label `E`). 네이티브 크로뮴 `EyeDropper` API로 화면 픽셀 채집(1회성, Esc 취소 시 조용히 무시), 패널에 스와치 + HEX(Copy 버튼) + RGB 읽기용. 마지막 채집 색만 `chrome.storage.local`(`wid:eyedropper`)에 지속, mount 시 로드. feature-detect(미지원 시 버튼 disable+안내). strict 타입은 최소 ambient decl(`declare global`)로 처리(any 없음)
- 구현 파일: `src/content/features/eyedropper.tsx` + `registry.ts`/`panel.tsx`/`rail.ts`/`types.ts`
- 미확정(추후): 히스토리(여러 개) / rgb·hsl 토글 / 미지원 브라우저 fallback — 현재는 마지막 1개·HEX+RGB·fallback 없음
- 목적: 웹사이트 화면에 있는 아무 색이나 스포이드로 클릭해서 색상 추출
- 확정 동작(사용자 설명):
  - 스포이드로 화면의 아무 색 클릭 → 그 색 채집
  - 툴바에 채집된 색을 네모냳게(스와치) 보여줌, 그 밑에 색상 코드(hex 등) + 복사 버튼
  - 한 번 채집하면 이후에는 일반 마우스로 돌아옴 (1회성 모드)
- 구현 힌트: 크로뮬 `EyeDropper` API (`new EyeDropper().open()` → `{ sRGBHex }` 반환, 화면 전체 픽셀 채집 네이티브 지원). 미지원 브라우저 대비 fallback은 추후 결정. 복사는 `navigator.clipboard.writeText`
- 신규 기능 탭 필요: `registry.ts`에 6번째 기능 추가 + `panel.tsx` 라우팅 + 새 `src/content/features/eyedropper.tsx`
- 미확정(스펙 시 확인): 채집 기록 여러 개 유지할지(히스토리) vs 마지막 1개만, 저장(설정 지속) vs 휘발, hex 외 rgb/hsl 표기 여부

### E. 그 외 고려사항
- 전체화면 자동 숨김 (유튜브 전체화면 등에서 레일 가리기)
- content script 주입 안 되는 페이지(`chrome://`, 크롬 웹스토어, PDF 뷰어)는 정상적으로 동작 안 함 (어쩔 수 없음)

---

## 7. 자잘한 Follow-up (리뷰에서 나온 것, 모두 비차단)

### Multi-search
- [x] **숨김 노드 검색 제외** (`a8f6d02`) — acceptNode에서 `getComputedStyle(parent).visibility` hidden/collapse 제외 + 텍스트 노드 Range `getClientRects().length===0` 제외. 버전 무관(105+), display:none/visibility:hidden/hidden속성/content-visibility 제외, display:contents+보이는텍스트는 포함.
- [x] **IME 조합 중 Enter 무시** (`4e6e7e0`) — `Enter && !event.isComposing`.
- [x] **detach 노드 scrollIntoView 가드** (`4e6e7e0`) — target이 Element일 때만 호출, 아니면 no-op.
- [ ] **알려진 한계(A안으로 출시)**: 인라인 태그로 쪼개진 텍스트 노드 경계를 넘는 매치는 못 찾음. 예: `가격은 <b>10,000</b>원` 에서 "10,000원", 코드 하이라이팅 페이지의 여러 span으로 쪼개진 토큰, 링크/볼드가 단어 중간에 낀 구절. 단일 단어의 일반 본문 검색은 정상. 필요하면 크로스-노드 Range 병합으로 개선(B안).
- [ ] (v2 리뷰 비차단) `scrollRangeIntoView`: 검색 후 동적 페이지가 DOM을 바꿔 text node가 detach되면 fallback 캐스트(`startContainer as Element`)가 Text에서 `scrollIntoView` 호출로 TypeError 가능. `target instanceof Element` 가드 1줄로 방어 가능.
- [ ] (교차리뷰 비차단) `runSearch`/`removeRow` 가 `rows` 를 클로저로 잡음 → `setRows(current => ...)` 함수형 업데이트가 더 안전

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
