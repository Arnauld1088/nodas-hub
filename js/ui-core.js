// ============================================================
// NODAS HUB — module: ui-core.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function showToast(msg, color = '#3ecf8e') {
const t = document.getElementById('toast');
t.textContent = msg;
t.style.borderLeftColor = color;
t.style.display = 'block';
clearTimeout(t._timeout);
t._timeout = setTimeout(() => t.style.display = 'none', 3000);
}

function applyTheme() {
document.body.classList.toggle('light-mode', state.lightMode);
const tog = document.getElementById('toggle-theme');
if (tog) tog.checked = state.lightMode;
}

function toggleTheme() {
state.lightMode = !state.lightMode;
applyTheme();
saveState('meta');
}

function applyAppName() {
const n = state.appName || 'STOCK';
const s = state.appSub || 'Gestion de Stock';
document.getElementById('logo-name').textContent = n;
document.getElementById('logo-sub').textContent = s;
document.getElementById('app-title').textContent = n + ' — ' + s + ' · NODAS HUB';
document.getElementById('dash-sub').textContent = 'Vue d\'ensemble du stock ' + n;
const pn = document.getElementById('param-nom');
const ps = document.getElementById('param-sub');
if (pn) pn.value = n === 'STOCK' ? '' : n;
if (ps) ps.value = s === 'Gestion de Stock' ? '' : s;
}

function updateAppName() {
const n = document.getElementById('param-nom').value.trim();
const s = document.getElementById('param-sub').value.trim();
state.appName = n || 'STOCK';
state.appSub = s || 'Gestion de Stock';
applyAppName();
saveState('meta');
}

function toggleMobileSidebar(force) {
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('sidebar-overlay');
if (!sidebar || !overlay) return;
const isOpen = sidebar.classList.contains('mobile-open');
const next = force !== undefined ? force : !isOpen;
sidebar.classList.toggle('mobile-open', next);
overlay.classList.toggle('open', next);
}

function showPage(id) {
toggleMobileSidebar(false);
const mainEl = document.querySelector('.main');
if (mainEl) { mainEl.scrollLeft = 0; mainEl.scrollTop = 0; }
window.scrollTo(0,0);
document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
const pg = document.getElementById('page-' + id);
if (pg) pg.classList.add('active');
document.querySelectorAll('.nav-item').forEach(n => {
const t = n.textContent;
if ((id==='aujourdhui' && t.includes('Aujourd')) || (id==='dashboard' && t.includes('bord')) || (id==='articles' && t.includes('Articles')) ||
(id==='alertes' && t.includes('Alertes')) || (id==='entrees' && t.includes('Entrées')) ||
(id==='sorties' && t.includes('Sorties')) || (id==='transferts' && t.includes('Transferts')) || (id==='stock-secteurs' && t.includes('Stock par secteur')) || (id==='ventes' && t.includes('Ventes')) || (id==='commandes' && t.includes('commande')) || (id==='historiqueprix' && t.includes('Historique des prix')) || (id==='fournisseurs' && t.includes('Fournisseurs')) ||
(id==='import' && t.includes('Import')) || (id==='journal' && t.includes('Journal')) || (id==='parametres' && t.includes('Paramètres')) ||
(id==='analyse' && t.includes('Consommation')) ||
(id==='foodcost' && t.includes('Food Cost')) ||
(id==='admin' && t.includes('Admin')) ||
(id==='recettes' && t.includes('Recettes')))
n.classList.add('active');
});
if (id==='dashboard') renderDashboard();
if (id==='aujourdhui') renderAujourdhui();
if (id==='articles') { populateArticleFilters(); renderArticles(); }
if (id==='alertes') renderAlertes();
if (id==='entrees') { populateEntreeFilters(); renderEntrees(); }
if (id==='sorties') { populateSortieFilters(); renderSorties(); }
if (id==='transferts') renderTransferts();
if (id==='stock-secteurs') renderStockSecteurs();
if (id==='ventes') { populateVenteFilters(); renderVentes(); }
if (id==='commandes') { populateCommandeFilters(); renderCommandes(); }
if (id==='historiqueprix') { populateHistoriquePrixFilters(); renderHistoriquePrix(); }
if (id==='journal') { populateJournalFilters(); renderJournal(); }
if (id==='fournisseurs') renderFournisseurs();
if (id==='parametres') renderSettings();
if (id==='analyse') { initAnalysePeriod(); renderAnalyse(); }
if (id==='foodcost') { fcInitControls(); fcRenderAll(); }
if (id==='recettes') renderRecettes();
if (id==='admin' && typeof window.loadAdminUsers==='function') window.loadAdminUsers();
document.getElementById('global-search').value = '';
document.getElementById('global-results').classList.remove('open');
}

function openModal(id) {
if (id==='modal-correction' && ((window.isEconome && window.isEconome()) || (window.isSecteurResponsable && window.isSecteurResponsable()))) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
populateSelects();
if (id==='modal-entree') {
document.getElementById('entree-date').value = today();
}
if (id==='modal-sortie') {
document.getElementById('sortie-date').value = today();
const secEl = document.getElementById('sortie-secteur');
if (window.isSecteurResponsable && window.isSecteurResponsable()) { secEl.value = window._secteurActif || ''; secEl.disabled = true; }
else { secEl.disabled = false; }
}
if (id==='modal-commande') {
document.getElementById('cmd-edit-id').value = '';
document.getElementById('cmd-date').value = today();
document.getElementById('cmd-date-livraison').value = '';
document.getElementById('cmd-note').value = '';
document.getElementById('modal-commande-title').textContent = '🧾 Nouveau bon de commande';
populateCommandeFournisseurSelect();
document.getElementById('cmd-lignes-list').innerHTML = '';
addCommandeLigne();
cmdUpdateTotal();
}
if (id==='modal-vente') {
document.getElementById('vente-date').value = today();
document.getElementById('vente-qte').value = '1';
document.getElementById('vente-prix').value = '';
document.getElementById('vente-secteur').value = (window.isSecteurResponsable && window.isSecteurResponsable()) ? (window._secteurActif || '') : '';
document.getElementById('vente-secteur').disabled = !!(window.isSecteurResponsable && window.isSecteurResponsable());
document.getElementById('vente-note').value = '';
document.getElementById('vente-statut').value = 'vendu';
document.getElementById('vente-decompte-stock').checked = true;
document.getElementById('vente-cat-offert-group').style.display = 'none';
document.getElementById('vt-type-recette').classList.add('active');
document.getElementById('vt-type-article').classList.remove('active');
venteSetType('recette');
}
if (id==='modal-facture-entree') {
document.getElementById('facture-entree-date').value = today();
document.getElementById('facture-entree-numero').value = '';
document.getElementById('facture-entree-lines').innerHTML = '';
document.getElementById('facture-entree-total').textContent = '0 FCFA';
addFactureEntreeLine(); addFactureEntreeLine();
}
if (id==='modal-facture-sortie') {
document.getElementById('facture-sortie-date').value = today();
document.getElementById('facture-sortie-bon').value = '';
document.getElementById('facture-sortie-secteur').value = '';
document.getElementById('facture-sortie-lines').innerHTML = '';
addFactureSortieLine(); addFactureSortieLine();
}
if (id==='modal-recette') {
document.getElementById('rec-nom').value='';
document.getElementById('rec-type').value='plat';
document.getElementById('rec-prix-vente').value='';
document.getElementById('rec-portions').value='1';
document.getElementById('rec-notes').value='';
document.getElementById('rec-edit-id').value='';
document.getElementById('rec-ingredients-list').innerHTML='';
document.getElementById('rec-cout-val').textContent='—';
document.getElementById('rec-pv-val').textContent='—';
document.getElementById('rec-marge-val').textContent='—';
document.getElementById('modal-recette-title').textContent='🍽 Nouvelle Recette';
}
if (id==='modal-transfert') {
document.getElementById('transfert-date').value = today();
document.getElementById('transfert-article').value = '';
document.getElementById('transfert-qte').value = '';
document.getElementById('transfert-note').value = '';
const oEl = document.getElementById('transfert-origine');
const dEl = document.getElementById('transfert-destination');
if (window.isSecteurResponsable && window.isSecteurResponsable()) {
// Un responsable de secteur ne peut faire qu'un retour : de SON secteur vers l'Économat —
// jamais recevoir une distribution (réservée à l'admin/économe, voir README).
oEl.value = window._secteurActif || ''; oEl.disabled = true;
dEl.value = 'Économat'; dEl.disabled = true;
} else {
oEl.disabled = false; dEl.disabled = false;
}
if (typeof updateTransfertStockInfo === 'function') updateTransfertStockInfo();
}
if (id==='modal-transfert-groupe') {
document.getElementById('transfert-groupe-date').value = today();
document.getElementById('transfert-groupe-note').value = '';
document.getElementById('transfert-groupe-lines').innerHTML = '';
addTransfertLigne(); addTransfertLigne();
const oEl = document.getElementById('transfert-groupe-origine');
const dEl = document.getElementById('transfert-groupe-destination');
if (window.isSecteurResponsable && window.isSecteurResponsable()) {
oEl.value = window._secteurActif || ''; oEl.disabled = true;
dEl.value = 'Économat'; dEl.disabled = true;
} else {
oEl.disabled = false; dEl.disabled = false;
}
}
document.getElementById(id).classList.add('open');
}

function closeModal(id) {
document.getElementById(id).classList.remove('open');
if (id==='modal-article') { document.getElementById('art-edit-id').value=''; document.getElementById('modal-article-title').textContent='▦ Nouvel Article'; document.getElementById('art-save-btn').textContent='Créer l\'article'; document.getElementById('art-designation').value=''; document.getElementById('art-categorie').value=''; document.getElementById('art-unite').value=''; document.getElementById('art-stock-min').value='0'; document.getElementById('art-stock-initial').value='0'; document.getElementById('art-prix-achat').value=''; document.getElementById('art-prix-vente').value=''; document.getElementById('art-code-barre').value=''; document.getElementById('art-marge-preview').textContent=''; }
if (id==='modal-fournisseur') { document.getElementById('four-edit-nom').value=''; document.getElementById('modal-four-title').textContent='◉ Nouveau Fournisseur'; document.getElementById('four-save-btn').textContent='Enregistrer'; ['four-nom','four-ifu','four-rc','four-adresse','four-email','four-tel','four-cat'].forEach(x=>document.getElementById(x).value=''); }
if (id==='modal-sortie') { const sa=document.getElementById('sortie-article'); if(sa){sa.value='';sa.disabled=false;} ['sortie-date','sortie-qte','sortie-secteur','sortie-cat'].forEach(x=>{const el=document.getElementById(x);if(el)el.value='';}); }
if (id==='modal-transfert') { ['transfert-article','transfert-date','transfert-qte','transfert-note'].forEach(x=>{const el=document.getElementById(x);if(el)el.value='';}); }
if (id==='modal-transfert-groupe') { const l=document.getElementById('transfert-groupe-lines'); if(l) l.innerHTML=''; const n=document.getElementById('transfert-groupe-note'); if(n) n.value=''; }
}

function populateSelects() {
const sorted = [...state.articles].sort((a,b) => a.designation.localeCompare(b.designation));
const dlOpts = sorted.map(a => `<option value="${a.designation}">`).join('');
const dla = document.getElementById('dl-entree-article'); if(dla) dla.innerHTML = dlOpts;
const dls = document.getElementById('dl-sortie-article'); if(dls) dls.innerHTML = dlOpts;
const dlf = document.getElementById('dl-facture-article'); if(dlf) dlf.innerHTML = dlOpts;
const dlt = document.getElementById('dl-transfert-article'); if(dlt) dlt.innerHTML = dlOpts;
const fOpts = '<option value="">— Aucun —</option>' + state.fournisseurs.map(f => `<option value="${f.nom}">${f.nom}</option>`).join('');
const efEl = document.getElementById('entree-fournisseur'); if(efEl) efEl.innerHTML = fOpts;
const fefEl = document.getElementById('facture-entree-fournisseur'); if(fefEl) fefEl.innerHTML = fOpts;
const cats = allCategories();
const catOptsHTML = (sel) => '<option value="">— Aucune —</option>' + cats.map(c => `<option value="${c}"${c===sel?' selected':''}>${c}</option>`).join('');
const acEl = document.getElementById('art-categorie'); if(acEl) acEl.innerHTML = catOptsHTML(acEl.value);
const scEl = document.getElementById('sortie-cat'); if(scEl) scEl.innerHTML = catOptsHTML(scEl.value);
const slEl = document.getElementById('secteurs-list'); if(slEl) slEl.innerHTML = [...new Set([...allEmplacements(), ...allSecteurs()])].map(s => `<option value="${s}">`).join('');
const empOptsHTML = (sel) => allEmplacements().map(e => `<option value="${e}"${e===sel?' selected':''}>${e}</option>`).join('');
const edEl = document.getElementById('entree-destination'); if(edEl) edEl.innerHTML = empOptsHTML(edEl.value||'Économat');
const fedEl = document.getElementById('facture-entree-destination'); if(fedEl) fedEl.innerHTML = empOptsHTML(fedEl.value||'Économat');
const toEl = document.getElementById('transfert-origine'); if(toEl) toEl.innerHTML = empOptsHTML(toEl.value);
const tdEl = document.getElementById('transfert-destination'); if(tdEl) tdEl.innerHTML = empOptsHTML(tdEl.value);
const tgoEl = document.getElementById('transfert-groupe-origine'); if(tgoEl) tgoEl.innerHTML = empOptsHTML(tgoEl.value);
const tgdEl = document.getElementById('transfert-groupe-destination'); if(tgdEl) tgdEl.innerHTML = empOptsHTML(tgdEl.value);
}

function globalSearch() {
const q = document.getElementById('global-search').value.toLowerCase().trim();
const res = document.getElementById('global-results');
if (q.length < 2) { res.classList.remove('open'); return; }
let html = '';
const arts = state.articles.filter(a => a.designation.toLowerCase().includes(q)).slice(0,5);
if (arts.length) { html+=`<div class="gr-section">Articles</div>${arts.map(a=>`<div class="gr-item" onclick="showPage('articles');document.getElementById('search-articles').value='${a.designation.replace(/'/g,"\\'")}';renderArticles();document.getElementById('global-search').value='';document.getElementById('global-results').classList.remove('open')">▦ ${a.designation}<span class="gr-sub">${stockBadge(a)}</span></div>`).join('')}`; }
const fours = state.fournisseurs.filter(f=>f.nom.toLowerCase().includes(q)).slice(0,3);
if (fours.length) { html+=`<div class="gr-section">Fournisseurs</div>${fours.map(f=>`<div class="gr-item" onclick="showPage('fournisseurs');document.getElementById('search-fournisseurs').value='${f.nom.replace(/'/g,"\\'")}';renderFournisseurs();document.getElementById('global-search').value='';document.getElementById('global-results').classList.remove('open')">◉ ${f.nom}</div>`).join('')}`; }
if (!html) html='<div style="padding:16px;text-align:center;font-size:13px;color:var(--text3)">Aucun résultat</div>';
res.innerHTML=html; res.classList.add('open');
}
