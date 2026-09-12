// ============================================================
// NODAS HUB — module: main.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); }));

document.addEventListener('click', e => { if(!e.target.closest('.global-search-wrap')) document.getElementById('global-results').classList.remove('open'); });

applyTheme();

applyAppName();

renderDashboard();
