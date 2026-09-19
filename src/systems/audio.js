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
};

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
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    });
}
