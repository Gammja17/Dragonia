// 알림은 화면 위 가운데에 차곡차곡 쌓인다 (겹치지 않게). 한 번에 최대 4개.
//   · 같은 말이 연달아 오면 새로 띄우지 않고 있던 것을 한 번 튀기며 횟수를 단다 ("고기를 먹었습니다" x3)
//   · 긴 글은 그만큼 더 오래 떠 있는다. 3.4초 안에 두 줄을 다 못 읽던 것
let box = null;
const BASE = 3400, PER_CHAR = 28, MAX = 6500;

export function showToast(msg, icon = '✨') {
    if (!box) {
        box = document.createElement('div');
        box.id = 'toast-box';
        document.body.appendChild(box);
    }
    const text = `${icon} ${msg}`;
    const same = [...box.children].find(c => c.dataset.text === text);
    if (same) {
        same.dataset.n = String((Number(same.dataset.n) || 1) + 1);
        let tag = same.querySelector('.toast-n');
        if (!tag) { tag = document.createElement('span'); tag.className = 'toast-n'; same.appendChild(tag); }
        tag.textContent = `×${same.dataset.n}`;
        same.classList.remove('again'); void same.offsetWidth; same.classList.add('again');
        clearTimeout(same._timer);
        same._timer = setTimeout(() => same.remove(), 2200);
        return;
    }
    const n = document.createElement('div');
    n.className = 'toast';
    n.dataset.text = text;
    n.dataset.n = '1';
    n.append(document.createTextNode(text));
    const life = Math.min(MAX, BASE + Math.max(0, msg.length - 24) * PER_CHAR);
    n.style.animationDuration = `${life}ms`;
    box.appendChild(n);
    while (box.children.length > 4) box.firstChild.remove();
    n._timer = setTimeout(() => n.remove(), life);
}
