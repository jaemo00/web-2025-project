// ---- 테마 토글 (다른 페이지와 동일 로직) ----
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

// ---- 노래 검색 로직 ----
const inputEl = document.getElementById("search-input");
const btnEl = document.getElementById("search-btn");
const resultsEl = document.getElementById("search-results");
const countEl = document.getElementById("search-count");
const helpEl = document.getElementById("search-help");
const emptyEl = document.getElementById("search-empty");
const audioEl = document.getElementById("search-audio");

// 초를 "분:초" 형태로 바꾸는 헬퍼
const fmt = (ms) => {
  if (!Number.isFinite(ms)) return "";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
};

// 결과 리스트 렌더링
function renderResults(tracks) {
  resultsEl.innerHTML = "";

  if (!tracks || tracks.length === 0) {
    countEl.textContent = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";
  countEl.textContent = `${tracks.length}곡`;

  tracks.forEach((t) => {
    const li = document.createElement("li");
    li.className = "user-playlist-item";

    const durationText = fmt(t.trackTimeMillis);

    li.innerHTML = `
      <img src="${t.artworkUrl100}" alt="cover" class="user-cover-thumb" />
      <div>
        <div class="user-track-title">${t.trackName}</div>
        <div class="user-track-artist">${t.artistName}</div>
        <div class="playlist-duration" style="font-size:11px; margin-top:2px;">
          ${t.collectionName || ""} ${durationText ? `· ${durationText}` : ""}
        </div>
      </div>
      <div class="user-item-actions">
        <button class="preview-btn">▶ 미리듣기</button>
      </div>
    `;

    // 미리듣기 버튼 이벤트
    const previewBtn = li.querySelector(".preview-btn");
    previewBtn.addEventListener("click", () => {
      if (!t.previewUrl) {
        alert("이 곡은 미리듣기 음원이 제공되지 않습니다.");
        return;
      }
      audioEl.src = t.previewUrl;
      audioEl.play().catch((err) => {
        console.error("미리듣기 재생 실패:", err);
      });
    });

    resultsEl.appendChild(li);
  });
}

// 검색 실행 함수
async function searchTracks(keyword) {
  const term = keyword.trim();
  if (!term) return;

  // 기존 재생 중지
  audioEl.pause();

  // 헬프 문구 잠깐 숨김
  helpEl.style.display = "none";
  emptyEl.style.display = "none";
  countEl.textContent = "검색 중...";

  const endpoint = "https://itunes.apple.com/search";
  const params = new URLSearchParams({
    term: term,
    entity: "song",
    limit: "15",      // 최대 15개만 가져오기
    country: "US"     // 국가 코드 (US 기준)
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

// 버튼 클릭 시 검색
btnEl.addEventListener("click", () => {
  searchTracks(inputEl.value);
});

// 엔터 키로도 검색
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    searchTracks(inputEl.value);
  }
});
