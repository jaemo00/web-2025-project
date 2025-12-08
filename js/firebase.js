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
  return (id && id.trim()) || "guest";
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
    return; // 이 페이지에는 해당 UI가 없을 수도 있음
  }

  // 현재 프로필 ID를 입력창에 반영
  const currentId = getProfileId();
  profileInput.value = currentId === "guest" ? "" : currentId;
  profileInput.placeholder = "예: jm123";

  // "적용" 버튼을 누르면 프로필 ID 변경 + 새로고침
  profileBtn.addEventListener("click", () => {
    const newId = profileInput.value.trim();
    if (!newId) {
      alert("ID를 입력해주세요. 예: jm123");
      return;
    }

    setProfileId(newId);

    // 프로필이 바뀌었으니, 페이지를 새로고침해서 init()을 다시 돌린다
    window.location.reload();
  });
});
