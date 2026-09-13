// ============================================================
// NODAS HUB — module: parametres.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function renderSettings() {
applyAppName();
applyTheme();
// ===== P1 : bandeau de migration vers les sous-collections Firestore =====
// Injecté dynamiquement pour ne pas avoir à modifier index.html. N'apparaît que pour
// l'administrateur d'un établissement pas encore migré (voir window._migrationPending,
// positionné dans loadUserData() au chargement des données).
const pageParam = document.getElementById('page-parametres');
if (pageParam) {
let banner = document.getElementById('param-migration-banner');
if (window._migrationPending && !window.isEconome() && !window.isScanner() && !window.isSecteurResponsable()) {
if (!banner) {
banner = document.createElement('div');
banner.id = 'param-migration-banner';
banner.style.cssText = 'background:var(--orange);color:#1a1a1a;padding:14px 18px;border-radius:8px;margin-bottom:16px;font-size:14px;line-height:1.5';
banner.innerHTML = '⚠ <strong>Mise à jour disponible</strong> : vos données peuvent être migrées vers un format plus robuste (sous-collections), sans rien supprimer.'
+ '<br><button class="btn btn-outline btn-sm" style="margin-top:8px;background:#1a1a1a;color:#fff" onclick="migrateToSubcollections()">Migrer maintenant</button>';
pageParam.insertBefore(banner, pageParam.firstChild);
}
} else if (banner) {
banner.remove();
}
}
renderEmplacementsSection();
const secteurAccSel = document.getElementById('secteur-account-secteur');
if (secteurAccSel) {
const secteursSeuls = allEmplacements().filter(e => e !== 'Économat');
secteurAccSel.innerHTML = secteursSeuls.length ? secteursSeuls.map(e=>`<option value="${e}">${e}</option>`).join('') : '<option value="">— Aucun secteur défini —</option>';
}
const syncDescEl = document.getElementById('param-sync-desc');
if (syncDescEl) syncDescEl.textContent = document.getElementById('sync-label')?.textContent || '—';
renderCategoriesArticlesList();
renderCategoriesOffertList();
renderNotificationEmailsList();
const lastBackupEl = document.getElementById('param-last-backup');
if (lastBackupEl) {
const ts = parseInt(localStorage.getItem('gestion_stock_last_manual_backup')||'0', 10);
lastBackupEl.textContent = ts ? 'dernière le ' + new Date(ts).toLocaleString('fr-FR') : 'jamais exportée — pensez-y régulièrement';
lastBackupEl.style.color = ts ? '' : 'var(--orange)';
}
const snapEl = document.getElementById('local-snapshots-list');
if (snapEl) {
const snaps = getLocalSnapshots();
snapEl.innerHTML = snaps.length ? snaps.map(s => `
<div class="setting-row">
<div><div class="setting-label">${new Date(s.ts).toLocaleString('fr-FR')}</div><div class="setting-desc">${s.label==='avant_connexion'?'Avant synchronisation cloud':'Sauvegarde automatique'} · ${(s.data.length/1024).toFixed(0)} Ko</div></div>
<button class="btn btn-outline btn-sm" onclick="restoreLocalSnapshot(${s.ts})">↺ Restaurer</button>
</div>`).join('') : '<div style="color:var(--text3);font-size:12px;padding:8px 0">Aucun instantané pour le moment</div>';
}
const accEl = document.getElementById('param-account-email');
if (accEl) accEl.textContent = (window._currentUser && window._currentUser.email) || '—';
const comptesList = document.getElementById('comptes-list');
if (comptesList) {
const members = state.members || [];
comptesList.innerHTML = members.length ? members.map(m => `
<div class="setting-row">
<div><div class="setting-label">${m.email}${m.uid===(window._currentUser&&window._currentUser.uid)?' <span style="color:var(--gold);font-size:11px">(vous)</span>':''}</div><div class="setting-desc">${m.role==='admin'?'Administrateur':m.role==='scanner'?'Scanner':m.role==='secteur'?'Responsable secteur — '+(m.secteur||'?'):'Économe'}</div></div>
${m.role!=='admin' ? `<button class="btn btn-danger btn-sm" onclick="removeEconomeAccount('${m.uid}','${String(m.email).replace(/'/g,"\\'")}')">Retirer l'accès</button>` : ''}
</div>`).join('') : '<div style="color:var(--text3);font-size:12px">Aucun compte économe créé pour le moment</div>';
}
const stats = [
{label:'Articles',val:state.articles.length,icon:'▦'},
{label:'Entrées',val:state.purchases.length,icon:'↓'},
{label:'Sorties',val:state.sorties.length,icon:'↑'},
{label:'Fournisseurs',val:state.fournisseurs.length,icon:'◉'},
{label:'Alertes',val:state.articles.filter(a=>{const s=getStock(a);return s<=0||(a.stock_min>0&&s<a.stock_min);}).length,icon:'⚠'},
{label:'Mouvements',val:state.purchases.length+state.sorties.length,icon:'⇅'},
];
document.getElementById('stats-grid').innerHTML = stats.map(s=>`
<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center">
<div style="font-size:20px;opacity:0.5;margin-bottom:6px">${s.icon}</div>
<div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700">${s.val}</div>
<div style="font-size:11px;color:var(--text3);margin-top:2px">${s.label}</div>
</div>`).join('');
}

// ===== Emplacements (Économat + secteurs) =====
// Injecté dynamiquement dans la page Paramètres (pas de modification d'index.html requise),
// juste après le bandeau de migration s'il est présent, sinon en premier dans la page.
function renderEmplacementsSection() {
const pageParam = document.getElementById('page-parametres');
if (!pageParam) return;
ensureEmplacementsDefaults();
let box = document.getElementById('param-emplacements-box');
if (!box) {
box = document.createElement('div');
box.id = 'param-emplacements-box';
box.style.cssText = 'margin-bottom:20px';
box.innerHTML = `
<h4 style="margin-bottom:6px">Emplacements (Économat &amp; secteurs)</h4>
<p style="font-size:12px;color:var(--text3);margin-bottom:10px">
"Économat" est le magasin central, toujours présent. Ajoutez vos secteurs (Cuisine, Restaurant, Bar...) —
ils pourront recevoir des transferts internes et avoir leur propre stock.
</p>
<div id="emplacements-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
<div style="display:flex;gap:8px;margin-bottom:10px">
<input type="text" id="new-emplacement" placeholder="Nom du secteur (ex: Cuisine)" style="flex:1">
<button type="button" class="btn btn-outline btn-sm" onclick="addEmplacement()">Ajouter</button>
</div>
<button type="button" class="btn btn-outline btn-sm" onclick="reconcilierHistoriqueSecteurs()">Rattacher l'historique aux emplacements</button>
<p style="font-size:11px;color:var(--text3);margin-top:6px">
Renomme les anciennes valeurs "secteur" en texte libre (ex: "cuisine") pour qu'elles correspondent
exactement aux emplacements ci-dessus. N'affecte que l'affichage/les filtres — ne recalcule pas
rétroactivement le stock par secteur des mouvements passés.
</p>`;
const banner = document.getElementById('param-migration-banner');
if (banner && banner.nextSibling) pageParam.insertBefore(box, banner.nextSibling);
else pageParam.insertBefore(box, pageParam.firstChild);
}
renderEmplacementsList();
}

function renderEmplacementsList() {
const el = document.getElementById('emplacements-list');
if (!el) return;
const secteurs = allEmplacements();
el.innerHTML = secteurs.map(e => {
const protege = e === 'Économat';
return `<span class="ui-pill">${e}${protege ? '' : `<button type="button" onclick="removeEmplacement('${e.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;line-height:1;padding:0;margin-left:2px">×</button>`}</span>`;
}).join('');
}

function addEmplacement() {
const input = document.getElementById('new-emplacement');
const v = (input.value||'').trim();
if (!v) return;
if (v.toLowerCase() === 'économat' || v.toLowerCase() === 'economat') { showToast('⚠ "Économat" existe déjà (magasin central)', 'var(--orange)'); return; }
if (allEmplacements().some(e => e.toLowerCase()===v.toLowerCase())) { showToast('⚠ Cet emplacement existe déjà','var(--orange)'); return; }
state.emplacements.push(v);
input.value = '';
logActivity('emplacement_add', 'Emplacement ajouté : '+v);
saveState('meta'); renderEmplacementsList();
showToast('✓ Emplacement ajouté : '+v);
}

function removeEmplacement(emplacement) {
if (emplacement === 'Économat') { showToast('⚠ "Économat" ne peut pas être supprimé', 'var(--red)'); return; }
const nbStock = state.articles.filter(a => getStock(a, emplacement) > 0).length;
if (nbStock > 0) { showToast(`⚠ ${nbStock} article(s) ont encore du stock dans "${emplacement}" — videz-le d'abord (transfert retour vers l'Économat)`, 'var(--red)'); return; }
if (!confirm(`Supprimer l'emplacement "${emplacement}" ?`)) return;
state.emplacements = state.emplacements.filter(e => e!==emplacement);
logActivity('emplacement_remove', 'Emplacement supprimé : '+emplacement);
saveState('meta'); renderEmplacementsList();
showToast('🗑 Emplacement supprimé');
}

function reconcilierHistoriqueSecteurs() {
if (window.isEconome && window.isEconome()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
const secteurs = allEmplacements().filter(e => e !== 'Économat');
if (!secteurs.length) { showToast('⚠ Ajoutez d\'abord au moins un secteur ci-dessus', 'var(--orange)'); return; }
function normalize(s) { return (s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
const mapNorm = {};
secteurs.forEach(e => { mapNorm[normalize(e)] = e; });
let count = 0;
[state.sorties, state.ventes].forEach(arr => {
(arr||[]).forEach(rec => {
const n = normalize(rec.secteur);
if (n && mapNorm[n] && rec.secteur !== mapNorm[n]) { rec.secteur = mapNorm[n]; count++; }
});
});
if (count === 0) { showToast('Rien à rattacher — les libellés sont déjà cohérents avec vos emplacements'); return; }
logActivity('secteur_reconciliation', `Rattachement historique : ${count} entrée(s) de sorties/ventes mises à jour`);
saveState(['sorties','ventes']);
showToast(`✓ ${count} entrée(s) d'historique rattachée(s) à vos emplacements`);
}

function renderCategoriesArticlesList() {
const el = document.getElementById('cat-articles-list');
if (!el) return;
ensureCategoriesDefaults();
el.innerHTML = categoryChipsHTML([...state.categoriesArticles].sort(), 'removeCategorieArticle');
}

function addCategorieArticle() {
const input = document.getElementById('new-cat-article');
const v = (input.value||'').trim();
if (!v) return;
if (state.categoriesArticles.some(c => c.toLowerCase()===v.toLowerCase())) { showToast('⚠ Cette catégorie existe déjà','var(--orange)'); return; }
state.categoriesArticles.push(v);
input.value = '';
saveState('meta'); renderCategoriesArticlesList();
showToast('✓ Catégorie ajoutée : '+v);
}

function removeCategorieArticle(cat) {
const nbUsed = state.articles.filter(a => a.categorie===cat).length;
if (nbUsed > 0) { showToast(`⚠ ${nbUsed} article(s) utilisent cette catégorie — réaffectez-les d'abord`, 'var(--red)'); return; }
if (!confirm(`Supprimer la catégorie "${cat}" ?`)) return;
state.categoriesArticles = state.categoriesArticles.filter(c => c!==cat);
saveState('meta'); renderCategoriesArticlesList();
showToast('🗑 Catégorie supprimée');
}

function renderCategoriesOffertList() {
const el = document.getElementById('cat-offert-list');
if (!el) return;
ensureCategoriesDefaults();
el.innerHTML = categoryChipsHTML([...state.categoriesOffert].sort(), 'removeCategorieOffert');
}

function addCategorieOffert() {
const input = document.getElementById('new-cat-offert');
const v = (input.value||'').trim();
if (!v) return;
if (state.categoriesOffert.some(c => c.toLowerCase()===v.toLowerCase())) { showToast('⚠ Cette catégorie existe déjà','var(--orange)'); return; }
state.categoriesOffert.push(v);
input.value = '';
saveState('meta'); renderCategoriesOffertList();
showToast('✓ Catégorie ajoutée : '+v);
}

function removeCategorieOffert(cat) {
const nbUsed = (state.ventes||[]).filter(v => v.categorie_offert===cat).length;
if (nbUsed > 0) { showToast(`⚠ ${nbUsed} vente(s) offerte(s) utilisent cette catégorie — laissée telle quelle si supprimée`, 'var(--orange)'); }
if (!confirm(`Supprimer la catégorie d'offert "${cat}" ?`)) return;
state.categoriesOffert = state.categoriesOffert.filter(c => c!==cat);
saveState('meta'); renderCategoriesOffertList();
showToast('🗑 Catégorie supprimée');
}
