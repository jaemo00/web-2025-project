#  Web Music Player

> HTML, CSS, JavaScript로 구현한 웹 음악 플레이어  
> iTunes API 연동 + 사용자별 플레이리스트 저장(Firebase) + Web Audio EQ 지원   

---

##  주요 기능

- ⏯ 음악 재생 / 일시정지 / 이전곡 / 다음곡
-  iTunes 외부 음악 검색 (미리듣기 기반)
-  플레이리스트 저장 / 삭제
  - LocalStorage + Firebase Firestore 동기화
-  Web Audio API 기반 EQ 조절 (Bass / Treble)
-  다크/라이트 모드 자동 저장
-  반응형 레이아웃
-  반복 재생 / 셔플 기능
-  사용자 ID 입력 방식 프로필

---

##  기술 스택

| 구분 | 내용 |
|------|-----|
| Frontend | HTML5, CSS3, JavaScript |
| API | iTunes Search API |
| Storage | LocalStorage, Firebase Firestore |
| Audio | Web Audio API, \<audio> Element |
| Design | Flex & Grid Layout, CSS Variables |

---

##  프로젝트 폴더 구조
```sh
project/
├─ index.html # 메인 페이지 (플레이어/검색/추천)
├─ playlist.html # 내 플레이리스트 페이지
├─ css/
│ └─ style.css
├─ js/
│ ├─ script.js # 메인 플레이어 기능
│ ├─ playlist.js # 내 플레이리스트 전용
│ └─ firebase.js # 데이터 저장 및 사용자 ID 관리
└─ assets/ # 이미지 등 (선택)
```


---

##  화면 예시



## 실행 방법
1) Git Clone
```sh
git clone https://github.com/jaemo00/web-2025-project.git
cd your-repo
```

2) Firebase 설정 필요

js/firebase.js 파일에서 본인 프로젝트 키 적용

Firestore 활성화 필요
https://console.firebase.google.com/

3) 브라우저에서 오픈<br>

index.html 실행

---
## 주요 동작 설명

| UI 요소 | 동작 |
|--------|------|
| ID 입력 + 적용 | 사용자 ID 변경 및 Firestore에 저장된 해당 플레이리스트 불러오기 |
| 내 플레이리스트 메뉴 | 저장된 음악 목록 페이지로 이동 |
| 검색 입력창 | 검색어 기반 iTunes API 검색 실행 |
| 검색 결과에서  항목 클릭 | 클릭한 곡을 플레이어에서 미리듣기 재생 |
| 검색 결과의 ♡ 버튼 | 내 플레이리스트에 곡 추가 / 제거 |
| ▶ / ⏸ 버튼 | 음악 재생 / 일시정지 |
| ⏮ / ⏭ 버튼 | 이전 곡 / 다음 곡 이동 |
| 진행바 클릭/드래그 | 재생 위치 직접 이동(Seeking) |
| 🔊 / 🔇 버튼 | 음소거 / 해제 |
| 볼륨 슬라이더 | 볼륨 조절 |
| Bass / Treble 슬라이더 | EQ (저음 / 고음) 효과 적용 |
| 🔀 버튼 | 셔플 재생 |
| 🔁 버튼 | 한 곡 반복 재생 |
| 🌙 / 🌞 버튼 | 다크 / 라이트 테마 전환 & 저장 |


## 저작권 안내

본 프로젝트 음원은 iTunes Preview 기반으로
상업적 이용이 제한됩니다 

## 추후 개선 계획

 모바일 UI 최적화

 Google / Github 로그인 추가

 플레이리스트 UI 확장 (커버 / 정렬)

 드래그앤드롭 곡 순서 변경

 사용자 EQ 프리셋 저장

 재생 히스토리 기반 추천




