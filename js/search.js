// ---- 테마 토글 (index / playlist와 동일) ----
const themeToggleBtn = document.getElementById("theme-toggle");

function setTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  localStorage.setItem("theme", theme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = theme === "light" ? "🌞" : "🌙";
    themeToggleBtn.title = theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환";
  }
}

(function initTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  setTheme(saved);
})();

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const isLight = document.documentElement.classList.contains("light");
    setTheme(isLight ? "dark" : "light");
  });
}

// ---- DOM 요소 ----
const inputEl = document.getElementById("search-input");
const btnEl = document.getElementById("search-btn");
const resultsEl = document.getElementById("search-results");
const countEl = document.getElementById("search-count");
const helpEl = document.getElementById("search-help");
const emptyEl = document.getElementById("search-empty");
const audioEl = document.getElementById("search-audio");

// ---- 내 플레이리스트(localStorage) 연동 ----
function getUserPlaylist() {
  const raw = localStorage.getItem("myPlaylist");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveUserPlaylist(list) {
  localStorage.setItem("myPlaylist", JSON.stringify(list));
}

function isInPlaylist(id) {
  const list = getUserPlaylist();
  return list.some(t => t.id === id);
}

function updateLikeButton(likeBtn, id) {
  const liked = isInPlaylist(id);
  likeBtn.textContent = liked ? "♥" : "♡";
  likeBtn.title = liked ? "내 플레이리스트에서 제거" : "내 플레이리스트에 추가";
}

// iTunes API 응답을 내 플레이리스트 아이템 형태로 변환
function toPlaylistItem(t) {
  return {
    id: t.trackId, // iTunes 트랙 ID 사용
    title: t.trackName,
    artist: t.artistName,
    src: t.previewUrl,                      // 30초 미리듣기 URL
    cover: t.artworkUrl100,                 // 앨범 커버
    durationText: fmt(t.trackTimeMillis),   // "m:ss" 형식
  };
}

// ---- 헬퍼: ms → "분:초" ----
const fmt = (ms) => {
  if (!Number.isFinite(ms)) return "";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
};

// ---- 검색 결과 렌더링 ----
function renderResults(tracks) {
  resultsEl.innerHTML = "";

  if (!tracks || tracks.length === 0) {
    countEl.textContent = "";
    emptyEl.style.display = "block";
    emptyEl.textContent = "검색 결과가 없습니다. 다른 키워드로 다시 시도해 주세요.";
    return;
  }

  emptyEl.style.display = "none";
  countEl.textContent = `${tracks.length}곡`;

  tracks.forEach((t) => {
    const li = document.createElement("li");
    li.className = "user-playlist-item";

    const durationText = fmt(t.trackTimeMillis);
    const item = toPlaylistItem(t);

    li.innerHTML = `
      <img src="${item.cover}" alt="cover" class="user-cover-thumb" />
      <div>
        <div class="user-track-title">${item.title}</div>
        <div class="user-track-artist">${item.artist}</div>
        <div class="playlist-duration" style="font-size:11px; margin-top:2px;">
          ${t.collectionName || ""} ${durationText ? `· ${durationText}` : ""}
        </div>
      </div>
      <div class="user-item-actions">
        <button class="preview-btn">▶ 미리듣기</button>
        <button class="like-btn">♡</button>
      </div>
    `;

    const previewBtn = li.querySelector(".preview-btn");
    const likeBtn = li.querySelector(".like-btn");

    // 처음 렌더링할 때 하트 모양 업데이트
    updateLikeButton(likeBtn, item.id);

    // 미리듣기 버튼
    previewBtn.addEventListener("click", () => {
      if (!item.src) {
        alert("이 곡은 미리듣기 음원이 제공되지 않습니다.");
        return;
      }
      audioEl.src = item.src;
      audioEl.play().catch((err) => {
        console.error("미리듣기 재생 실패:", err);
      });
    });

    // 플레이리스트 추가/삭제 버튼
    likeBtn.addEventListener("click", () => {
      const list = getUserPlaylist();
      const exists = list.some(tr => tr.id === item.id);
      let newList;

      if (exists) {
        // 이미 있으면 제거
        newList = list.filter(tr => tr.id !== item.id);
      } else {
        // 없으면 추가
        newList = [...list, item];
      }

      saveUserPlaylist(newList);
      updateLikeButton(likeBtn, item.id);
    });

    resultsEl.appendChild(li);
  });
}

// ---- 검색 실행 함수 ----
async function searchTracks(keyword) {
  const term = keyword.trim();
  if (!term) return;

  // 기존 미리듣기 중지
  audioEl.pause();

  helpEl.style.display = "none";
  emptyEl.style.display = "none";
  countEl.textContent = "검색 중...";

  const endpoint = "https://itunes.apple.com/search";
  const params = new URLSearchParams({
    term: term,
    entity: "song",
    limit: "15",
    country: "US",
  });

  try {
    const res = await fetch(`${endpoint}?${params.toString()}`);
    if (!res.ok) {
      throw new Error("HTTP error " + res.status);
    }
    const data = await res.json();
    renderResults(data.results || []);
  } catch (err) {
    console.error("검색 실패:", err);
    countEl.textContent = "";
    emptyEl.style.display = "block";
    emptyEl.textContent = "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

// ---- 이벤트: 버튼 클릭 / 엔터 키 ----
btnEl.addEventListener("click", () => {
  searchTracks(inputEl.value);
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    searchTracks(inputEl.value);
  }
});
