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

// ===== localStorage: 내 플레이리스트 =====
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
  // 서버에도 저장
  if (typeof savePlaylistToServer === "function") {
    // async지만 기다릴 필요는 없음 (백그라운드로 날려도 됨)
    savePlaylistToServer(list).catch(err => {
      console.error("서버 플레이리스트 저장 실패:", err);
    });
  }
}

// ===== iTunes 응답 → 내 트랙 형태로 변환 =====
function toPlaylistItemFromITunes(t) {
  return {
    id: t.trackId,
    title: t.trackName,
    artist: t.artistName,
    src: t.previewUrl,
    cover: t.artworkUrl100,
    durationText: fmtMs(t.trackTimeMillis),
  };
}

// ===== DOM (플레이어) =====
const audio = document.getElementById("audio");
audio.crossOrigin = "anonymous";
// Web Audio API용 변수들
let audioCtx = null;
let sourceNode = null;
let bassFilter = null;
let trebleFilter = null;

const bassSlider = document.getElementById("bass");
const trebleSlider = document.getElementById("treble");

const cover = document.getElementById("cover");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const shuffleBtn = document.getElementById("shuffle");
const repeatBtn = document.getElementById("repeat");
const muteBtn = document.getElementById("mute");
const volumeRange = document.getElementById("volume");
const progressWrap = document.getElementById("progress-wrap");
const progress = document.getElementById("progress");
const currentEl = document.getElementById("current");
const durationEl = document.getElementById("duration");
const playlistEl = document.getElementById("playlist");
const likeBtn = document.getElementById("like");

// ===== DOM (검색/추천) =====
const searchInputEl = document.getElementById("search-input");
const searchBtnEl = document.getElementById("search-btn");
const searchResultsEl = document.getElementById("search-results");
const searchHelpEl = document.getElementById("search-help");
const searchEmptyEl = document.getElementById("search-empty");
const recommendListEl = document.getElementById("recommend-list");
const recommendEmptyEl = document.getElementById("recommend-empty");

if (!audio) {
  throw new Error("script.js는 index.html에서만 사용됩니다.");
}

// ===== 상태 =====
let tracks = [];              // 내 플레이리스트
let index = 0;                // 플레이리스트 인덱스
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0;           // 0: off, 1: one

let currentMode = "playlist"; // "playlist" | "external"
let currentExternalTrack = null; // 검색/추천에서 임시로 재생 중인 곡

audio.volume = parseFloat(volumeRange?.value || "0.9");

// ===== 포맷 헬퍼 =====
const fmt = (s) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

const fmtMs = (ms) => {
  if (!Number.isFinite(ms)) return "";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
};

function getStartIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get("id");
  if (!idParam) return null;
  const num = Number(idParam);
  return Number.isNaN(num) ? null : num;
}

function initAudioGraph() {
  // 이미 초기화 되어 있으면 다시 안 만듦
  if (audioCtx) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn("이 브라우저는 Web Audio API를 지원하지 않습니다.");
      return;
    }

    audioCtx = new AudioContext();

    // 외부 음원 + Web Audio 조합 대비
    audio.crossOrigin = "anonymous";

    // <audio> 요소를 Web Audio 그래프에 연결
    sourceNode = audioCtx.createMediaElementSource(audio);

    // 저음(Bass) 필터
    bassFilter = audioCtx.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 200;   // 200Hz 이하
    bassFilter.gain.value = 0;          // 기본 0dB

    // 고음(Treble) 필터
    trebleFilter = audioCtx.createBiquadFilter();
    trebleFilter.type = "highshelf";
    trebleFilter.frequency.value = 3000; // 3kHz 이상
    trebleFilter.gain.value = 0;

    // 연결: audio → bass → treble → 스피커
    sourceNode
      .connect(bassFilter)
      .connect(trebleFilter)
      .connect(audioCtx.destination);

  } catch (e) {
    console.error("Web Audio 초기화 실패, 기본 재생으로 fallback:", e);
    // 실패하면 EQ 기능은 포기하고, 기본 audio 경로만 사용
    audioCtx = null;
    sourceNode = null;
    bassFilter = null;
    trebleFilter = null;
  }
}



// ===== 플레이리스트 로딩 & 빌드 =====
function reloadTracks() {
  tracks = getUserPlaylist();
}

function buildPlaylist() {
  playlistEl.innerHTML = "";
  tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "playlist-item";
    li.innerHTML = `
      <div>
        <div class="playlist-title">${t.title}</div>
        <div class="playlist-artist">${t.artist}</div>
      </div>
      <div class="playlist-duration">${t.durationText || ""}</div>
    `;
    li.addEventListener("click", () => {
      loadFromPlaylist(i);
      play();
    });
    playlistEl.appendChild(li);
  });
}

function showEmptyState() {
  currentMode = "none";
  currentExternalTrack = null;
  titleEl.textContent = "플레이리스트가 비어 있습니다.";
  artistEl.textContent = "오른쪽에서 검색하거나 추천 곡을 추가해 보세요.";
  currentEl.textContent = "0:00";
  durationEl.textContent = "0:00";
  progress.style.width = "0%";
  cover.classList.remove("spin");
  audio.removeAttribute("src");
  [...playlistEl.children].forEach(li => li.classList.remove("active"));
  if (likeBtn) {
    likeBtn.textContent = "♡";
    likeBtn.title = "내 플레이리스트에 추가";
  }
}

// ===== 좋아요 관련 =====
function isLiked(track) {
  if (!track) return false;
  const list = getUserPlaylist();
  return list.some((t) => t.id === track.id);
}

function updateLikeButton() {
  if (!likeBtn) return;

  let track = null;
  if (currentMode === "playlist" && tracks[index]) {
    track = tracks[index];
  } else if (currentMode === "external" && currentExternalTrack) {
    track = currentExternalTrack;
  }

  if (!track) {
    likeBtn.textContent = "♡";
    likeBtn.title = "내 플레이리스트에 추가";
    return;
  }

  const liked = isLiked(track);
  likeBtn.textContent = liked ? "♥" : "♡";
  likeBtn.title = liked ? "내 플레이리스트에서 제거" : "내 플레이리스트에 추가";
}

function toggleLike() {
  let track = null;
  if (currentMode === "playlist" && tracks[index]) {
    track = tracks[index];
  } else if (currentMode === "external" && currentExternalTrack) {
    track = currentExternalTrack;
  } else {
    return;
  }

  const list = getUserPlaylist();
  const exists = list.some((t) => t.id === track.id);
  let newList;
  if (exists) {
    newList = list.filter((t) => t.id !== track.id);
  } else {
    newList = [...list, track];
  }
  saveUserPlaylist(newList);

  // 플레이리스트 다시 로드 & 그리기
  reloadTracks();
  buildPlaylist();

  // playlist 모드일 때는 index를 다시 맞추고, external일 때는 상태만 업데이트
  if (currentMode === "playlist") {
    if (!tracks.length) {
      pause();
      index = 0;
      showEmptyState();
    } else {
      const foundIdx = tracks.findIndex((t) => t.id === track.id);
      index = foundIdx >= 0 ? foundIdx : 0;
      loadFromPlaylist(index, false);
    }
  }

  updateLikeButton();
}

// ===== 플레이어: 곡 로드/재생 =====
function loadFromPlaylist(i, resetTime = true) {
  if (!tracks.length || !tracks[i]) {
    showEmptyState();
    return;
  }
  currentMode = "playlist";
  currentExternalTrack = null;

  const t = tracks[i];
  index = i;

  audio.src = t.src;
  cover.src = t.cover || cover.src;
  titleEl.textContent = t.title;
  artistEl.textContent = t.artist;

  [...playlistEl.children].forEach((li, idx) =>
    li.classList.toggle("active", idx === i)
  );

  if (resetTime) {
    progress.style.width = "0%";
    currentEl.textContent = "0:00";
  }
  durationEl.textContent = t.durationText || "0:00";

  updateLikeButton();
}

function loadExternalTrack(item) {
  if (!item || !item.src) return;

  currentMode = "external";
  currentExternalTrack = item;

  audio.src = item.src;
  cover.src = item.cover || cover.src;
  titleEl.textContent = item.title;
  artistEl.textContent = item.artist;

  // 플레이리스트 하이라이트는,
  // 이 곡이 플레이리스트에 있다면 그 항목만 active 처리
  const list = tracks;
  [...playlistEl.children].forEach((li, idx) => {
    const t = list[idx];
    li.classList.toggle("active", t && t.id === item.id);
  });

  progress.style.width = "0%";
  currentEl.textContent = "0:00";
  durationEl.textContent = item.durationText || "0:00";

  updateLikeButton();
}

function play() {
  if (!audio.src) return;

  // Web Audio 그래프 초기화 (가능하면)
  initAudioGraph();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  audio
    .play()
    .then(() => {
      isPlaying = true;
      playBtn.textContent = "⏸";
      cover.classList.add("spin");
    })
    .catch((err) => {
      console.error("재생 실패:", err);
    });
}


function pause() {
  audio.pause();
  isPlaying = false;
  playBtn.textContent = "▶️";
  cover.classList.remove("spin");
}

function next() {
  if (!tracks.length) return;
  if (isShuffle) {
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * tracks.length);
    } while (tracks.length > 1 && nextIdx === index);
    loadFromPlaylist(nextIdx);
  } else {
    loadFromPlaylist((index + 1) % tracks.length);
  }
  play();
}

function prev() {
  if (!tracks.length) return;
  loadFromPlaylist((index - 1 + tracks.length) % tracks.length);
  play();
}

// ===== 플레이어 버튼 이벤트 =====
playBtn.addEventListener("click", () => (isPlaying ? pause() : play()));
prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;
  shuffleBtn.style.background = isShuffle ? "#174a2b" : "#121826";
  shuffleBtn.title = isShuffle ? "Shuffle On" : "Shuffle Off";
});

repeatBtn.addEventListener("click", () => {
  repeatMode = (repeatMode + 1) % 2;
  const on = repeatMode === 1;
  repeatBtn.style.background = on ? "#174a2b" : "#121826";
  repeatBtn.title = on ? "Repeat One" : "Repeat Off";
});

muteBtn.addEventListener("click", () => {
  audio.muted = !audio.muted;
  muteBtn.textContent = audio.muted ? "🔇" : "🔊";
});

volumeRange.addEventListener("input", (e) => {
  audio.volume = parseFloat(e.target.value);
  if (audio.volume === 0) {
    audio.muted = true;
    muteBtn.textContent = "🔇";
  } else {
    audio.muted = false;
    muteBtn.textContent = "🔊";
  }
});

if (likeBtn) {
  likeBtn.addEventListener("click", toggleLike);
}

// ===== 오디오 진행/종료 이벤트 =====
audio.addEventListener("timeupdate", () => {
  const { currentTime, duration } = audio;
  currentEl.textContent = fmt(currentTime);
  durationEl.textContent = fmt(duration);
  const pct = duration ? (currentTime / duration) * 100 : 0;
  progress.style.width = `${pct}%`;
  progressWrap.setAttribute("aria-valuenow", Math.floor(pct));
});

audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = fmt(audio.duration);
});

audio.addEventListener("ended", () => {
  if (repeatMode === 1) {
    audio.currentTime = 0;
    play();
  } else {
    // external 모드여도 다음 곡은 플레이리스트 기준
    if (tracks.length) next();
  }
});

// ===== 진행바 시킹 =====
let seeking = false;

const seek = (clientX) => {
  const rect = progressWrap.getBoundingClientRect();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  audio.currentTime = ratio * (audio.duration || 0);
};

progressWrap.addEventListener("pointerdown", (e) => {
  seeking = true;
  seek(e.clientX);
});

window.addEventListener("pointermove", (e) => seeking && seek(e.clientX));
window.addEventListener("pointerup", () => (seeking = false));

// ===== 검색/추천 쪽 좋아요 버튼 =====
function isInPlaylistById(id) {
  const list = getUserPlaylist();
  return list.some((t) => t.id === id);
}

function updateSmallLikeButton(btn, id) {
  const liked = isInPlaylistById(id);
  btn.textContent = liked ? "♥" : "♡";
  btn.title = liked ? "내 플레이리스트에서 제거" : "내 플레이리스트에 추가";
}

// ===== 검색/추천 리스트 렌더링 =====
function renderResultList(containerEl, tracksFromApi, showEmptyEl) {
  containerEl.innerHTML = "";

  if (!tracksFromApi || tracksFromApi.length === 0) {
    if (showEmptyEl) showEmptyEl.style.display = "block";
    return;
  }
  if (showEmptyEl) showEmptyEl.style.display = "none";

  tracksFromApi.forEach((t) => {
    const item = toPlaylistItemFromITunes(t);

    const li = document.createElement("li");
    li.className = "result-item";
    li.innerHTML = `
      <img src="${item.cover}" alt="cover" class="result-cover" />
      <div>
        <div class="result-title">${item.title}</div>
        <div class="result-artist">${item.artist}</div>
        <div class="result-meta">
          ${t.collectionName || ""} ${item.durationText ? "· " + item.durationText : ""}
        </div>
      </div>
      <div class="result-actions">
        <button class="result-like-btn">♡</button>
      </div>
    `;

    const likeBtnSmall = li.querySelector(".result-like-btn");
    updateSmallLikeButton(likeBtnSmall, item.id);

    // 🎯 리스트 아이템 클릭 = 플레이어에서 재생 (플레이리스트 저장 X)
    li.addEventListener("click", (e) => {
      // 하트 버튼 클릭은 제외
      if (e.target === likeBtnSmall) return;

      loadExternalTrack(item);
      play();
    });

    // ❤️ 하트 클릭 = 내 플레이리스트에 저장/삭제
    likeBtnSmall.addEventListener("click", () => {
      const list = getUserPlaylist();
      const exists = list.some((tr) => tr.id === item.id);
      let newList;
      if (exists) {
        newList = list.filter((tr) => tr.id !== item.id);
      } else {
        newList = [...list, item];
      }
      saveUserPlaylist(newList);
      updateSmallLikeButton(likeBtnSmall, item.id);

      // 메인 플레이리스트 재빌드
      reloadTracks();
      buildPlaylist();
      if (!tracks.length) showEmptyState();

      // 만약 지금 외부 모드로 이 곡을 재생 중이라면, 큰 하트도 상태 업데이트
      if (
        currentMode === "external" &&
        currentExternalTrack &&
        currentExternalTrack.id === item.id
      ) {
        updateLikeButton();
      }
    });

    containerEl.appendChild(li);
  });
}

// ===== 검색 실행 =====
async function searchTracks(keyword) {
  const term = keyword.trim();
  if (!term) return;

  searchHelpEl.style.display = "none";
  searchEmptyEl.style.display = "none";

  const endpoint = "https://itunes.apple.com/search";
  const params = new URLSearchParams({
    term: term,
    entity: "song",
    limit: "15",
    country: "US",
  });

  try {
    const res = await fetch(`${endpoint}?${params.toString()}`);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      searchResultsEl.innerHTML = "";
      searchEmptyEl.style.display = "block";
      return;
    }
    renderResultList(searchResultsEl, data.results, searchEmptyEl);
  } catch (err) {
    console.error("검색 실패:", err);
    searchResultsEl.innerHTML = "";
    searchEmptyEl.style.display = "block";
    searchEmptyEl.textContent = "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

// ===== 추천 곡 로드 =====
const RECOMMEND_ARTISTS = [
  "IU",
  "BTS",
  "Coldplay",
  "Taylor Swift",
  "Ed Sheeran",
  "Maroon 5",
];

async function loadRecommendations() {
  const randomArtist =
    RECOMMEND_ARTISTS[Math.floor(Math.random() * RECOMMEND_ARTISTS.length)];

  const endpoint = "https://itunes.apple.com/search";
  const params = new URLSearchParams({
    term: randomArtist,
    entity: "song",
    limit: "8",
    country: "US",
  });

  try {
    const res = await fetch(`${endpoint}?${params.toString()}`);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      recommendEmptyEl.style.display = "block";
      return;
    }
    recommendEmptyEl.style.display = "none";
    renderResultList(recommendListEl, data.results, recommendEmptyEl);
  } catch (err) {
    console.error("추천 곡 로드 실패:", err);
    recommendEmptyEl.style.display = "block";
    recommendEmptyEl.textContent = "추천 곡을 가져오는 중 오류가 발생했습니다.";
  }
}

// ===== 검색 이벤트 =====
if (searchBtnEl && searchInputEl) {
  searchBtnEl.addEventListener("click", () => searchTracks(searchInputEl.value));
  searchInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchTracks(searchInputEl.value);
  });
}

if (bassSlider) {
  bassSlider.addEventListener("input", (e) => {
    const value = Number(e.target.value); // -12 ~ +12
    if (bassFilter) {
      bassFilter.gain.value = value;
    }
  });
}

if (trebleSlider) {
  trebleSlider.addEventListener("input", (e) => {
    const value = Number(e.target.value); // -12 ~ +12
    if (trebleFilter) {
      trebleFilter.gain.value = value;
    }
  });
}

// ===== 초기화 =====
(function init() {
  // 1) 로컬 플레이리스트 먼저 불러오기
  reloadTracks();
  buildPlaylist();

  // 2) 서버에 있는 플레이리스트가 있으면 가져와서 덮어쓰기
  if (typeof loadPlaylistFromServer === "function") {
    loadPlaylistFromServer()
      .then(serverList => {
        if (serverList && serverList.length) {
          localStorage.setItem("myPlaylist", JSON.stringify(serverList));
          reloadTracks();
          buildPlaylist();
        }

        // 이후 기존 초기화 로직 실행
        if (!tracks.length) {
          showEmptyState();
        } else {
          const startId = getStartIdFromUrl();
          let startIndex = 0;
          if (startId != null) {
            const foundIdx = tracks.findIndex(t => t.id === startId);
            if (foundIdx >= 0) startIndex = foundIdx;
          }
          loadFromPlaylist(startIndex);
        }

        loadRecommendations();
      })
      .catch(err => {
        console.error("서버 플레이리스트 로드 실패:", err);

        // 서버 실패 시에도 기존 로직은 그대로
        if (!tracks.length) {
          showEmptyState();
        } else {
          const startId = getStartIdFromUrl();
          let startIndex = 0;
          if (startId != null) {
            const foundIdx = tracks.findIndex(t => t.id === startId);
            if (foundIdx >= 0) startIndex = foundIdx;
          }
          loadFromPlaylist(startIndex);
        }

        loadRecommendations();
      });
  } else {
    // Firebase 안 쓰는 경우 대비 (안전망)
    if (!tracks.length) {
      showEmptyState();
    } else {
      const startId = getStartIdFromUrl();
      let startIndex = 0;
      if (startId != null) {
        const foundIdx = tracks.findIndex(t => t.id === startId);
        if (foundIdx >= 0) startIndex = foundIdx;
      }
      loadFromPlaylist(startIndex);
    }
    loadRecommendations();
  }
})();

