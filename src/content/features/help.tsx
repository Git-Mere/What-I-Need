type HelpEntry = {
  label: string;
  name: string;
  desc: string;
};

const ENTRIES: HelpEntry[] = [
  {
    label: "M",
    name: "Marker",
    desc: "스크롤 위치 북마크. '+ Add mark'로 현재 스크롤 위치를 저장하고, 목록에서 클릭하면 그 위치로 이동. 이름 변경(연필)과 개별 삭제 가능, 최대 10개. 페이지를 떠나면 사라지는 휘발성."
  },
  {
    label: "B",
    name: "Brush",
    desc: "페이지 위에 자유롭게 그리는 펜. 색상/굵기 조절, 지우개, 일괄 지우기 지원. 단축키(기본 백틱 `)를 누르고 있는 동안만 그려짐. 휘발성(메모리만)."
  },
  {
    label: "N",
    name: "Memo",
    desc: "어느 사이트에서나 공유되는 전역 메모 1개. 입력하면 자동 저장됨."
  },
  {
    label: "C",
    name: "Calculator",
    desc: "윈도우 계산기 스타일의 기본 계산기. 최근 계산 기록을 남겨 다시 확인 가능."
  },
  {
    label: "S",
    name: "Multi-search",
    desc: "페이지 내 여러 검색어를 동시에 하이라이트(Ctrl+F 유사). 검색어별로 다른 색, ▲▼로 매치 간 이동, 최대 10개 검색어."
  }
];

export function Help() {
  return (
    <div class="wid-help">
      <p class="wid-help-intro">
        오른쪽 레일의 버튼을 눌러 각 도구를 열 수 있어요. Marker와 Brush는
        페이지를 떠나면 사라지는 휘발성 도구예요.
      </p>
      <ul class="wid-help-list">
        {ENTRIES.map((entry) => (
          <li key={entry.name} class="wid-help-item">
            <span class="wid-help-badge">{entry.label}</span>
            <div class="wid-help-body">
              <span class="wid-help-name">{entry.name}</span>
              <span class="wid-help-desc">{entry.desc}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
