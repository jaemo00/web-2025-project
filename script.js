const tracks = [
  {
    title: "SoundHelix Song 1",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg?auto=compress&cs=tinysrgb&w=800",
    durationText: "8:30"
  },
  {
    title: "SoundHelix Song 2",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg?auto=compress&cs=tinysrgb&w=800",
    durationText: "6:07"
  },
  {
    title: "SoundHelix Song 3",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://images.pexels.com/photos/164661/pexels-photo-164661.jpeg?auto=compress&cs=tinysrgb&w=800",
    durationText: "5:20"
  }
];

// DOM refs
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

let index = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0; // 0: off, 1: one
audio.volume = parseFloat(volumeRange.value);

// helpers
const fmt = s => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

function load(i) {
  const t = tracks[i];
  index = i;
  audio.src = t.src;
  cover.src = t.cover;
  titleEl.textContent = t.title;
  artistEl.textContent = t.artist;
  // playlist active
  [...playlistEl.children].forEach((li, idx) => li.classList.toggle("active", idx === i));
  // reset progress UI
  progress.style.width = "0%";
  currentEl.textContent = "0:00";
  durationEl.textContent = t.durationText || "0:00";
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

// events
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
  if (repeatMode === 1) { // repeat one
    audio.currentTime = 0;
    play();
  } else {
    next();
  }
});

// seek (click & drag)
let seeking = false;
const seek = (clientX) => {
  const rect = progressWrap.getBoundingClientRect();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  audio.currentTime = ratio * (audio.duration || 0);
};
progressWrap.addEventListener("pointerdown", (e) => { seeking = true; seek(e.clientX); });
window.addEventListener("pointermove", (e) => seeking && seek(e.clientX));
window.addEventListener("pointerup", () => seeking = false);

// build playlist
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

// init
buildPlaylist();
load(0);