// 효과음: 파일 없이 WebAudio 로 즉석에서 만든다. 브라우저 정책상 첫 클릭/키 입력 뒤에야 소리가 난다.
const MUTE_KEY = 'dragonia-muted';
let ctx = null;
let muted = localStorage.getItem(MUTE_KEY) === '1';
const lastPlayed = {};

// [파형, 시작 Hz, 끝 Hz, 길이(초), 음량]. 여러 줄이면 순서대로 0.07초 간격으로 울린다
const SOUNDS = {
    shoot:  [['sawtooth', 520, 140, 0.12, 0.05]],
    ice:    [['triangle', 1200, 500, 0.14, 0.06]],
    zap:    [['square', 900, 200, 0.09, 0.04]],
    hit:    [['square', 220, 70, 0.08, 0.05]],
    crit:   [['square', 330, 90, 0.1, 0.07], ['triangle', 990, 660, 0.12, 0.05]],
    hurt:   [['sawtooth', 160, 60, 0.18, 0.07]],
    coin:   [['triangle', 1320, 1760, 0.07, 0.05]],
    pickup: [['triangle', 660, 990, 0.09, 0.05]],
    ui:     [['triangle', 880, 880, 0.04, 0.03]],
    level:  [['triangle', 523, 523, 0.1, 0.06], ['triangle', 659, 659, 0.1, 0.06], ['triangle', 784, 784, 0.1, 0.06], ['triangle', 1047, 1047, 0.22, 0.07]],
    relic:  [['sine', 784, 784, 0.12, 0.06], ['sine', 1175, 1175, 0.12, 0.06], ['sine', 1568, 1568, 0.3, 0.06]],
    roar:   [['sawtooth', 110, 45, 0.5, 0.09]],
    raid:   [['square', 196, 196, 0.18, 0.06], ['square', 196, 196, 0.18, 0.06], ['square', 147, 147, 0.35, 0.07]],
    splash: [['sine', 300, 120, 0.15, 0.05]],
    dash:   [['sine', 500, 900, 0.1, 0.04]],
    flame:  [['noise', 900, 300, 0.18, 0.06]],
    boom:   [['noise', 400, 60, 0.45, 0.12], ['sine', 90, 35, 0.4, 0.12]],
    freeze: [['triangle', 2200, 900, 0.18, 0.05], ['triangle', 1500, 2400, 0.12, 0.04]],
    thunder: [['noise', 3000, 200, 0.22, 0.09], ['square', 140, 50, 0.2, 0.05]],
    slash:  [['noise', 2500, 700, 0.1, 0.07]],
    gust:   [['noise', 500, 1600, 0.35, 0.06]],
    heal:   [['sine', 523, 784, 0.18, 0.05], ['sine', 784, 1047, 0.25, 0.05]],
    guard:  [['square', 300, 300, 0.06, 0.05], ['triangle', 1200, 900, 0.2, 0.05]],
    die:    [['square', 300, 60, 0.16, 0.05]],
    dieBig: [['noise', 600, 80, 0.5, 0.1], ['sawtooth', 200, 40, 0.5, 0.08]],
    chest:  [['triangle', 392, 392, 0.08, 0.05], ['triangle', 523, 523, 0.08, 0.05], ['triangle', 784, 784, 0.2, 0.06]],
    quest:  [['triangle', 659, 659, 0.1, 0.05], ['triangle', 880, 880, 0.1, 0.05], ['triangle', 1319, 1319, 0.25, 0.06]],
    talk:   [['square', 420, 380, 0.035, 0.025]],
    eat:    [['square', 200, 140, 0.06, 0.05], ['square', 220, 150, 0.06, 0.05]],
    evolve: [['sine', 262, 523, 0.5, 0.07], ['sine', 392, 784, 0.5, 0.07], ['triangle', 1047, 1568, 0.6, 0.07]],
    sleep:  [['sine', 660, 330, 0.5, 0.05], ['sine', 440, 220, 0.7, 0.05]],
    warn:   [['square', 880, 880, 0.08, 0.05], ['square', 880, 880, 0.08, 0.05]],
    summon: [['sawtooth', 80, 240, 0.4, 0.06]],
    beam:   [['sawtooth', 300, 320, 0.5, 0.04]],
    step:   [['noise', 300, 150, 0.04, 0.02]],
};

let noise = null;
function noiseBuffer() {
    if (noise) return noise;
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return noise;
}

export function initAudio() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function isMuted() { return muted; }
export function toggleMute() {
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    return muted;
}

export function play(name) {
    if (!ctx || muted || !SOUNDS[name]) return;
    const now = ctx.currentTime;
    if (now - (lastPlayed[name] || 0) < 0.04) return; // 같은 소리가 한 프레임에 겹쳐 울리지 않게
    lastPlayed[name] = now;
    SOUNDS[name].forEach(([type, f0, f1, dur, vol], i) => {
        const t = now + i * 0.07;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        let src;
        if (type === 'noise') {          // 잡음 + 움직이는 필터: 불, 폭발, 바람, 베기
            src = ctx.createBufferSource();
            src.buffer = noiseBuffer();
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(f0, t);
            filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
            src.connect(filter).connect(gain);
        } else {
            src = ctx.createOscillator();
            src.type = type;
            src.frequency.setValueAtTime(f0, t);
            src.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
            src.connect(gain);
        }
        gain.connect(ctx.destination);
        src.start(t);
        src.stop(t + dur + 0.02);
    });
}
