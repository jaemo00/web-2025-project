// js/firebase.js

// 1) Firebase 설정 (네가 쓰고 있던 그대로)
const firebaseConfig = {
  apiKey: "AIzaSyD_mZZbxy6USnZnlt62LHeJs-q0_aVsWjY",
  authDomain: "myweb-ff789.firebaseapp.com",
  projectId: "myweb-ff789",
  storageBucket: "myweb-ff789.firebasestorage.app",
  messagingSenderId: "814923250952",
  appId: "1:814923250952:web:139c071a26908fbb4540bd",
  measurementId: "G-Q8KV7K62KT"
};

// 2) Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/**
 * 현재 선택된 프로필 ID 가져오기
 * - localStorage.profileId 에 저장
 * - 아무 것도 없으면 "guest" 사용
 */
function getProfileId() {
  const id = localStorage.getItem("profileId");
  return (id.trim()) || "guest";
}

/**
 * 프로필 ID 저장
 */
function setProfileId(id) {
  const trimmed = (id || "").trim();
  if (!trimmed) {
    localStorage.setItem("profileId", "guest");
  } else {
    localStorage.setItem("profileId", trimmed);
  }
}

/**
 * Firestore에서 사용할 "유저 ID"
 * → 여기서는 = 프로필 ID
 */
function getUserId() {
  return getProfileId();
}

// 4) 서버에서 플레이리스트 불러오기
async function loadPlaylistFromServer() {
  const userId = getUserId();
  const docRef = db.collection("playlists").doc(userId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return null; // 서버에 아직 없음
  }
  return snap.data().tracks || [];
}

// 5) 서버에 플레이리스트 저장
async function savePlaylistToServer(list) {
  const userId = getUserId();
  const docRef = db.collection("playlists").doc(userId);
  await docRef.set(
    {
      tracks: list,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

// 6) 화면 상단의 ID 입력창/버튼과 연동
document.addEventListener("DOMContentLoaded", () => {
  const profileInput = document.getElementById("profile-id");
  const profileBtn = document.getElementById("profile-apply");

  if (!profileInput || !profileBtn) {
    return;
  }

  // 현재 프로필 ID를 입력창에 반영
  const currentId = getProfileId();
  profileInput.value = currentId === "guest" ? "" : currentId;
  profileInput.placeholder = "예: jm123";

  // "적용" 버튼 클릭 이벤트 (수정됨)
  profileBtn.addEventListener("click", async () => {
    const newId = profileInput.value.trim();
    if (!newId) {
      alert("ID를 입력해주세요. 예: jm123");
      return;
    }

    // 1. 새 ID 저장
    setProfileId(newId);

    // 2. 서버에서 새 ID의 데이터 가져오기 (비동기)
    try {
      const serverList = await loadPlaylistFromServer();
      
      // 3. 가져온 데이터를 로컬스토리지에 최신화 (중요!)
      // 서버에 데이터가 없으면 빈 배열([])로 초기화
      const newList = serverList || [];
      localStorage.setItem("myPlaylist", JSON.stringify(newList));

      // 4. 현재 페이지가 어디냐에 따라 화면 갱신 함수 실행
      
      // A) playlist.js (목록 페이지)를 보고 있는 경우
      if (typeof renderPlaylist === "function") {
        renderPlaylist(); 
      }
      
      // B) script.js (메인 재생 페이지)를 보고 있는 경우
      if (typeof reloadTracks === "function" && typeof buildPlaylist === "function") {
        reloadTracks();  // 변수 업데이트
        buildPlaylist(); // 화면 그리기
        
        // 데이터가 없으면 '비어있음' 화면 보여주기 (script.js에 있는 함수)
        if (typeof showEmptyState === "function" && newList.length === 0) {
          showEmptyState();
        }
      }


    } catch (error) {
      console.error("불러오기 실패:", error);
      alert("데이터를 불러오는 중 오류가 발생했습니다.");
    }
  });
});
