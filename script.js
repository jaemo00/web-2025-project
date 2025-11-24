// ---- 트랙 데이터 ----
const tracks = [
  {
    id: 0,
    title: "SoundHelix Song 1",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg?auto=compress&cs=tinysrgb&w=800",
    durationText: "8:30"
  },
  {
    id: 1,
    title: "SoundHelix Song 2",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg?auto=compress&cs=tinysrgb&w=800",
    durationText: "6:07"
  },
  {
    id: 2,
    title: "SoundHelix Song 3",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://images.pexels.com/photos/164661/pexels-photo-164661.jpeg?auto=compress&cs=tinysrgb&w=800",
    durationText: "5:20"
  }
];

// ---- 공통: 테마 토글 ----
const themeToggleBtn = document.getElementById("theme-toggle");

function setTheme(theme) {
  const root = document.documentElement; // <html>
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

// ---- DOM refs (메인 플레이어 전용) ----
const audio = document.getElementById("audio");
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

if (!audio) {
  // 이 파일은 index.html에만 붙어 있으므로, audio 없으면 그냥 종료
  // (안전장치)
  throw new Error("This script is intended for index.html only.");
}

let index = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0; // 0: off, 1: one
audio.volume = parseFloat(volumeRange.value);

// ---- 공통 도우미 ----
const fmt = s => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

// ---- 로컬스토리지: 사용자 플레이리스트 ----
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
function isLiked(track) {
  const list = getUserPlaylist();
  return list.some(t => t.id === track.id);
}
function updateLikeButton() {
  if (!likeBtn) return;
  const t = tracks[index];
  const liked = isLiked(t);
  likeBtn.textContent = liked ? "♥" : "♡";
  likeBtn.title = liked ? "내 플레이리스트에서 제거" : "내 플레이리스트에 추가";
}
function toggleLike() {
  const t = tracks[index];
  const list = getUserPlaylist();
  const exists = list.some(item => item.id === t.id);
  let newList;
  if (exists) {
    newList = list.filter(item => item.id !== t.id);
  } else {
    // 플레이리스트에 저장할 데이터
    newList = [...list, {
      id: t.id,
      title: t.title,
      artist: t.artist,
      src: t.src,
      cover: t.cover,
      durationText: t.durationText
    }];
  }
  saveUserPlaylist(newList);
  updateLikeButton();
}

// ---- 곡 로드/재생 ----
function load(i) {
  const t = tracks[i];
  index = i;
  audio.src = t.src;
  cover.src = t.cover;
  titleEl.textContent = t.title;
  artistEl.textContent = t.artist;
  // playlist active 표시
  [...playlistEl.children].forEach((li, idx) => li.classList.toggle("active", idx === i));
  // progress UI reset
  progress.style.width = "0%";
  currentEl.textContent = "0:00";
  durationEl.textContent = t.durationText || "0:00";
  updateLikeButton();
}

function play() {
  audio.play();
  isPlaying = true;
  playBtn.textContent = "⏸";
  cover.classList.add("spin");
}
function pause() {
  audio.pause();
  isPlaying = false;
  playBtn.textContent = "▶️";
  cover.classList.remove("spin");
}

function next() {
  if (isShuffle) {
    let nextIdx;
    do { nextIdx = Math.floor(Math.random() * tracks.length); }
    while (tracks.length > 1 && nextIdx === index);
    load(nextIdx);
  } else {
    load((index + 1) % tracks.length);
  }
  play();
}
function prev() {
  load((index - 1 + tracks.length) % tracks.length);
  play();
}

// ---- 버튼 이벤트 ----
playBtn.addEventListener("click", () => (isPlaying ? pause() : play()));
prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;
  shuffleBtn.style.background = isShuffle ? "#174a2b" : "#121826";
  shuffleBtn.title = isShuffle ? "Shuffle On" : "Shuffle Off";
});

repeatBtn.addEventListener("click", () => {
  repeatMode = (repeatMode + 1) % 2; // off -> one
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
  if (audio.volume === 0) { audio.muted = true; muteBtn.textContent = "🔇"; }
  else { audio.muted = false; muteBtn.textContent = "🔊"; }
});

if (likeBtn) {
  likeBtn.addEventListener("click", toggleLike);
}

// ---- 오디오 이벤트 ----
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
    next();
  }
});

// ---- 시킹(진행바 드래그) ----
let seeking = false;
const seek = (clientX) => {
  const rect = progressWrap.getBoundingClientRect();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  audio.currentTime = ratio * (audio.duration || 0);
};
progressWrap.addEventListener("pointerdown", (e) => { seeking = true; seek(e.clientX); });
window.addEventListener("pointermove", (e) => seeking && seek(e.clientX));
window.addEventListener("pointerup", () => seeking = false);

// ---- 재생목록(우측 리스트) ----
function buildPlaylist() {
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
    li.addEventListener("click", () => { load(i); play(); });
    playlistEl.appendChild(li);
  });
}

// ---- URL 파라미터로 특정 곡 재생 (playlist.html에서 넘어올 때) ----
function getStartIndexFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const trackParam = params.get("track");
  if (trackParam === null) return 0;
  const num = Number(trackParam);
  if (Number.isNaN(num)) return 0;
  if (num < 0 || num >= tracks.length) return 0;
  return num;
}

// ---- 초기화 ----
buildPlaylist();
const startIndex = getStartIndexFromUrl();
load(startIndex);
