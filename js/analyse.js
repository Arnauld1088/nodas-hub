// ============================================================
// NODAS HUB — module: analyse.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function initAnalysePeriod() {
if (document.getElementById('analyse-to').value) return;
const to = today();
const from = new Date(); from.setDate(from.getDate() - 30);
document.getElementById('analyse-from').value = from.toISOString().split('T')[0];
document.getElementById('analyse-to').value = to;
}

function setAnalysePeriod(days) {
const to = today();
if (days === 0) {
const d = new Date(); d.setDate(1);
document.getElementById('analyse-from').value = d.toISOString().split('T')[0];
} else {
const d = new Date(); d.setDate(d.getDate() - days);
document.getElementById('analyse-from').value = d.toISOString().split('T')[0];
}
document.getElementById('analyse-to').value = to;
renderAnalyse();
}

function renderAnalyse() {
const from = document.getElementById('analyse-from').value;
const to = document.getElementById('analyse-to').value;
const q = (document.getElementById('search-analyse').value||'').toLowerCase();
if (!from || !to) return;
const nbJours = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));
document.getElementById('analyse-period-label').textContent = `Période : ${fmtDate(from)} → ${fmtDate(to)} (${nbJours} jours)`;
const sortiesPeriode = state.sorties.filter(s => s.date >= from && s.date <= to);
const data = state.articles
.filter(a => !q || a.designation.toLowerCase().includes(q))
.map(a => {
const sorties = sortiesPeriode.filter(s => s.article === a.designation);
const totalSorti = sorties.reduce((acc, s) => acc + s.quantite, 0);
const consoJour = totalSorti / nbJours;
const consoMois = consoJour * 30;
const stockActuel = getStock(a);
const joursRestants = consoJour > 0 ? Math.floor(stockActuel / consoJour) : null;
const dateRupture = joursRestants !== null ? (() => { const d = new Date(); d.setDate(d.getDate() + joursRestants); return d.toISOString().split('T')[0]; })() : null;
return { art: a, stockActuel, totalSorti, consoJour, consoMois, joursRestants, dateRupture };
})
.filter(d => d.totalSorti > 0 || d.stockActuel > 0)
.sort((a, b) => {
if (a.joursRestants === null && b.joursRestants === null) return 0;
if (a.joursRestants === null) return 1;
if (b.joursRestants === null) return -1;
return a.joursRestants - b.joursRestants;
});
const enRuptureBientot = data.filter(d => d.joursRestants !== null && d.joursRestants <= 7).length;
const sansConsommation = state.articles.length - data.filter(d => d.totalSorti > 0).length;
const totalConsoMois = data.reduce((acc, d) => acc + d.consoMois, 0);
document.getElementById('analyse-kpi').innerHTML = `
<div class="analyse-kpi"><div class="analyse-kpi-label">Articles analysés</div><div class="analyse-kpi-val" style="color:var(--gold)">${data.length}</div><div class="analyse-kpi-sub">avec mouvements</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Rupture ≤ 7 jours</div><div class="analyse-kpi-val" style="color:${enRuptureBientot>0?'var(--red)':'var(--green)'}">${enRuptureBientot}</div><div class="analyse-kpi-sub">articles critiques</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Sans consommation</div><div class="analyse-kpi-val" style="color:var(--text3)">${sansConsommation}</div><div class="analyse-kpi-sub">articles dormants</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Conso totale / mois</div><div class="analyse-kpi-val" style="color:var(--blue);font-size:20px">${fmt(Math.round(totalConsoMois))}</div><div class="analyse-kpi-sub">unités estimées</div></div>
`;
document.getElementById('analyse-tbody').innerHTML = data.length ? data.map(d => {
const { art, stockActuel, consoJour, consoMois, joursRestants, dateRupture } = d;
let ruptureClass = '', ruptureLabel = '', statutBadge = '';
if (joursRestants === null) {
ruptureLabel = '—'; ruptureClass = '';
statutBadge = '<span class="badge badge-gray">Pas de conso</span>';
} else if (joursRestants <= 0) {
ruptureLabel = 'Stock épuisé'; ruptureClass = 'rupture-urgent';
statutBadge = '<span class="badge badge-red">🔴 Épuisé</span>';
} else if (joursRestants <= 7) {
ruptureLabel = fmtDate(dateRupture); ruptureClass = 'rupture-urgent';
statutBadge = '<span class="badge badge-red">🔴 Critique</span>';
} else if (joursRestants <= 21) {
ruptureLabel = fmtDate(dateRupture); ruptureClass = 'rupture-soon';
statutBadge = '<span class="badge badge-orange">🟠 Attention</span>';
} else {
ruptureLabel = fmtDate(dateRupture); ruptureClass = 'rupture-ok';
statutBadge = '<span class="badge badge-green">🟢 OK</span>';
}
return `<tr>
<td><strong>${art.designation}</strong></td>
<td><span class="badge badge-gray">${art.categorie||'—'}</span></td>
<td style="font-weight:600">${fmt(stockActuel)} <span style="color:var(--text3);font-size:11px">${art.unite||''}</span></td>
<td>${consoJour > 0 ? fmt(+consoJour.toFixed(2)) : '—'}</td>
<td>${consoMois > 0 ? fmt(Math.round(consoMois)) : '—'}</td>
<td class="${ruptureClass}">${joursRestants !== null ? (joursRestants <= 0 ? '0' : joursRestants+' j') : '—'}</td>
<td class="${ruptureClass}">${ruptureLabel}</td>
<td>${statutBadge}</td>
<td><button class="btn btn-outline btn-sm" onclick="openEntreeForArticle('${art.designation.replace(/'/g,"\\'")}')">+ Entrée</button></td>
</tr>`;
}).join('') : '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text3)">Aucun article avec des mouvements sur cette période</td></tr>';
}
