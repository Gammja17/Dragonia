const $ = (id) => document.getElementById(id);

/** 시작 화면. AWAKEN 클릭 시 onStart(config) 호출 */
export function initCustomizer(onStart) {
    $('start-btn').addEventListener('click', () => {
        onStart({
            name: $('c-name').value.trim() || 'Player',
            species: $('c-type').value,
            colors: {
                body: $('c-body').value,
                wing: $('c-wing').value,
            },
        });
    });
}
