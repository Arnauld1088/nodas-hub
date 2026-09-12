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
if (window._migrationPending && !window.isEconome() && !window.isScanner()) {
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
<div><div class="setting-label">${m.email}${m.uid===(window._currentUser&&window._currentUser.uid)?' <span style="color:var(--gold);font-size:11px">(vous)</span>':''}</div><div class="setting-desc">${m.role==='admin'?'Administrateur':m.role==='scanner'?'Scanner':'Économe'}</div></div>
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
