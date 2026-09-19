// 알림은 화면 아래 가운데에 차곡차곡 쌓인다 (겹치지 않게). 한 번에 최대 4개.
let box = null;

export function showToast(msg, icon = '✨') {
    if (!box) {
        box = document.createElement('div');
        box.id = 'toast-box';
        document.body.appendChild(box);
    }
    const n = document.createElement('div');
    n.className = 'toast';
    n.textContent = `${icon} ${msg}`;
    box.appendChild(n);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => n.remove(), 3400);
}
