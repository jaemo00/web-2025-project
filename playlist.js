// ---- 테마 토글 (index와 같은 로직) ----
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

// ---- 사용자 플레이리스트 로딩 ----
const userPlaylistEl = document.getElementById("user-playlist");
const playlistCountEl = document.getElementById("playlist-count");
const emptyTextEl = document.getElementById("empty-text");

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

function renderPlaylist() {
  const list = getUserPlaylist();
  userPlaylistEl.innerHTML = "";

  if (list.length === 0) {
    playlistCountEl.textContent = "0곡";
    emptyTextEl.style.display = "block";
    return;
  }

  emptyTextEl.style.display = "none";
  playlistCountEl.textContent = `${list.length}곡`;

  list.forEach((track) => {
    const li = document.createElement("li");
    li.className = "user-playlist-item";

    li.innerHTML = `
      <img src="${track.cover}" alt="cover" class="user-cover-thumb" />
      <div>
        <div class="user-track-title">${track.title}</div>
        <div class="user-track-artist">${track.artist}</div>
      </div>
      <div class="user-item-actions">
        <a class="play-link" href="index.html?track=${track.id}">▶ 재생</a>
        <button class="remove-btn" data-id="${track.id}">삭제</button>
      </div>
    `;

    userPlaylistEl.appendChild(li);
  });

  // 삭제 버튼 이벤트 연결
  userPlaylistEl.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const newList = getUserPlaylist().filter(t => t.id !== id);
      saveUserPlaylist(newList);
      renderPlaylist();
    });
  });
}

// 초기 렌더링
renderPlaylist();
