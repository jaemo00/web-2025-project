// ===== 테마 토글 =====
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

// ===== localStorage =====
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

// ===== DOM =====
const userPlaylistEl = document.getElementById("user-playlist");
const playlistCountEl = document.getElementById("playlist-count");
const emptyTextEl = document.getElementById("empty-text");

// ===== 렌더링 =====
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
        <div class="playlist-duration" style="font-size:11px; margin-top:2px;">
          ${track.durationText || ""}
        </div>
      </div>
      <div class="user-item-actions">
        <a class="play-link" href="index.html?id=${track.id}">▶ 플레이어에서 재생</a>
        <button class="remove-btn" data-id="${track.id}">삭제</button>
      </div>
    `;

    const removeBtn = li.querySelector(".remove-btn");

    removeBtn.addEventListener("click", () => {
      const id = Number(removeBtn.dataset.id);
      const newList = getUserPlaylist().filter((t) => t.id !== id);
      saveUserPlaylist(newList);
      renderPlaylist();
    });

    userPlaylistEl.appendChild(li);
  });
}

// 초기 실행
renderPlaylist();
