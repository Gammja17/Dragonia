export function showToast(msg, icon = '✨') {
    const n = document.createElement('div');
    n.className = 'toast';
    n.textContent = `${icon} ${msg}`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}
