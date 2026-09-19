// 이미지 로더. 같은 URL은 한 번만 받는다.
const cache = new Map();

export function loadImage(url) {
    if (cache.has(url)) return cache.get(url);
    const p = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`이미지 로드 실패: ${url}`));
        img.src = url;
    });
    cache.set(url, p);
    return p;
}

/** { key: url } → { key: HTMLImageElement } */
export async function loadImages(map) {
    const keys = Object.keys(map);
    const imgs = await Promise.all(keys.map(k => loadImage(map[k])));
    const out = {};
    keys.forEach((k, i) => { out[k] = imgs[i]; });
    return out;
}
