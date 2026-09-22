// 배경음: 지금 서 있는 곳과 처지에 어울리는 곡 하나를 골라 계속 틀어 둔다.
// 곡 하나가 2~6MB 라 미리 다 받지 않고 <audio> 로 흘려 받는다. 한 번 받은 곡은 두고 다시 쓴다.
// 장면이 바뀌면 두 곡을 잠깐 겹쳐 틀어 부드럽게 갈아 끼운다.
// 브라우저 정책상 첫 클릭/키 입력 전에는 소리를 낼 수 없어서, 그때까지는 아무것도 틀지 않는다.
import { state } from '../core/state.js';
import { activeBiome } from '../world/terrain.js';
import { mapHasBoss } from './world.js';
import { isDen } from './den.js';
import { isMuted } from './audio.js';

const VOL_KEY = 'dragonia-music-vol';
const FADE = 1.6;    // 곡을 갈아 끼우는 데 걸리는 시간(초)
const TICK = 0.05;   // 음량을 다듬는 주기(초)

// 지도의 biome (data/maps.js) → 곡
const BIOME_TRACK = {
    VILLAGE: 'village', LAKE: 'lake', FOREST: 'forest', JUNGLE: 'jungle', HOLLOW: 'hollow',
    SNOW: 'snow', VOLCANO: 'volcano', AUTUMN: 'autumn', DESERT: 'desert',
    // 폭포 위 마을은 물소리 쪽, 마을 자체는 마을 곡을 같이 쓴다
    FALLS: 'lake', CLOUDTOP: 'village', SKY: 'snow',
};

const saved = parseFloat(localStorage.getItem(VOL_KEY));
let volume = Number.isFinite(saved) ? saved : 0.55;
let started = false;   // 첫 입력이 있었나
let scene = null;      // 지금 틀기로 한 장면 id
let playing = null;    // { id, el, gain } — 올라오는 중이거나 다 올라온 곡
let fading = [];       // 물러나는 중인 곡들
const pool = {};       // id → <audio>

function element(id) {
    if (!pool[id]) {
        const a = new Audio(`assets/music/${id}.ogg`);
        a.loop = true;
        a.preload = 'auto';   // 흘려 받다 끊기던 곡(숲길·수련장의 forest)이 있어서, 고른 곡은 통째로 받아 둔다
        // 브라우저가 반복 재생을 놓치거나(끝에서 멈춤) 받다가 막히면 다시 올린다
        a.addEventListener('ended', () => { if (playing && playing.el === a) a.play().catch(() => {}); });
        a.addEventListener('stalled', () => { if (playing && playing.el === a && a.paused) a.play().catch(() => {}); });
        pool[id] = a;
    }
    return pool[id];
}

/** 곁 지도의 곡을 미리 받아 둔다. 문을 넘는 순간 곡이 끊기지 않게 */
const NEIGHBORS = { village: ['forest', 'lake'], forest: ['village', 'hollow', 'dungeon'], lake: ['village', 'forest'] };
function prefetch(id) {
    for (const n of NEIGHBORS[id] || []) { const a = element(n); if (a.preload !== 'auto') a.preload = 'auto'; a.load && a.readyState === 0 && a.load(); }
}

function apply(track) {
    const v = isMuted() ? 0 : track.gain * volume;
    track.el.volume = Math.max(0, Math.min(1, v));
}

let watchdog = 0;
function tick() {
    const step = TICK / FADE;
    if (playing) {
        if (playing.gain < 1) playing.gain = Math.min(1, playing.gain + step);
        apply(playing);   // 음량 손잡이나 음소거가 그새 바뀌었을 수도 있다
        // 틀어 둔 곡이 어느새 멈춰 있으면(받다가 끊김·탭 전환) 2초마다 다시 올린다
        watchdog += TICK;
        if (watchdog >= 2) { watchdog = 0; if (playing.el.paused && !document.hidden) playing.el.play().catch(() => {}); }
    }
    for (const t of fading) {
        t.gain = Math.max(0, t.gain - step);
        apply(t);
        if (t.gain === 0) t.el.pause();
    }
    fading = fading.filter(t => t.gain > 0);
}

/** 이 장면의 곡으로 갈아 끼운다. 이미 그 곡이면 아무것도 하지 않는다 */
export function setScene(id) {
    if (!started || id === scene) return;
    scene = id;
    if (playing) { fading.push(playing); playing = null; }
    const back = fading.findIndex(t => t.id === id);
    // 잠깐 다녀와서 되돌아온 것이면, 물러나던 곡을 그대로 다시 올린다
    playing = back >= 0 ? fading.splice(back, 1)[0] : { id, el: element(id), gain: 0 };
    apply(playing);
    playing.el.play().catch(() => {});   // 브라우저가 막으면 조용히 넘어간다
    prefetch(id);
}

/** 지금 틀어야 할 곡. 위에 있는 줄이 먼저다 */
function sceneNow() {
    if (!state.gameActive) return 'title';
    if (mapHasBoss()) return 'boss';
    if (state.raid.active) return 'raid';
    if (state.dungeon) return 'dungeon';
    if (isDen(state.mapId)) return 'den';
    if (state.event === 'BLOOD_MOON') return 'bloodmoon';
    return BIOME_TRACK[activeBiome()] || 'forest';
}

export function updateMusic() { setScene(sceneNow()); }

export function musicVolume() { return volume; }
export function setMusicVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    localStorage.setItem(VOL_KEY, volume);
    if (playing) apply(playing);
}

export function initMusic() {
    const kick = () => {
        started = true;
        window.removeEventListener('pointerdown', kick);
        window.removeEventListener('keydown', kick);
        updateMusic();
    };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    setInterval(tick, TICK * 1000);
}
