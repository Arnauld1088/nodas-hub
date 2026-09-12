// ============================================================
// NODAS HUB — module: persistence.js
// Sauvegarde locale (localStorage) inchangée + sauvegarde cloud PAR DOMAINE
// (voir README.md, section "Firestore en sous-collections — P1")
// ============================================================

function loadState() {
try {
const saved = localStorage.getItem('gestion_stock_v2');
if (saved) {
const p = JSON.parse(saved);
state.articles = p.articles || [];
state.purchases = p.purchases || [];
state.sorties = p.sorties || [];
state.fournisseurs = p.fournisseurs || [];
state.recettes = p.recettes || [];
state.ventes = p.ventes || [];
state.commandes = p.commandes || [];
state.activityLog = p.activityLog || [];
state.categoriesArticles = p.categoriesArticles || [];
state.emplacements = (p.emplacements && p.emplacements.length) ? p.emplacements : ['Économat'];
state.transferts = p.transferts || [];
state.categoriesOffert = p.categoriesOffert || [];
state.notificationEmails = p.notificationEmails || [];
state.lastAlertEmailDate = p.lastAlertEmailDate || '';
state.foodCost = p.foodCost || null;
state.appName = p.appName || 'STOCK';
state.appSub = p.appSub || 'Gestion de Stock';
state.lightMode = p.lightMode || false;
state.ROWS_PER_PAGE = p.ROWS_PER_PAGE || 20;
}
} catch(e) {}
fcEnsureDefaults();
ensureCategoriesDefaults();
}

// Domaines Firestore reconnus (voir users/{id}/data/{domaine} + users/{id} pour 'meta').
// 'all' déclenche une resynchronisation complète de tous les domaines (restauration JSON,
// restauration d'un instantané local, réinitialisation...) — plus lourd, à réserver à ces
// cas précis plutôt qu'aux mutations courantes.
const SYNC_DOMAINS = ['articles','purchases','sorties','fournisseurs','recettes','ventes','commandes','transferts','meta'];

// saveState(domain) : sauvegarde locale (toujours complète, comme avant — localStorage n'a pas
// la limite de 1 Mo de Firestore) + déclenche la synchro cloud du/des domaine(s) concerné(s).
// domain peut être : omis/'all' (tout resynchroniser — restauration/reset), une chaîne
// ('articles'), ou un tableau (['purchases','articles']) pour les fonctions qui modifient
// plusieurs domaines à la fois (ex: une entrée met aussi à jour le total_entrant de l'article).
function saveState(domain) {
try {
localStorage.setItem('gestion_stock_v2', JSON.stringify({
articles: state.articles, purchases: state.purchases,
sorties: state.sorties, fournisseurs: state.fournisseurs, recettes: state.recettes,
ventes: state.ventes, commandes: state.commandes, activityLog: state.activityLog,
categoriesArticles: state.categoriesArticles, categoriesOffert: state.categoriesOffert, emplacements: state.emplacements,
transferts: state.transferts,
notificationEmails: state.notificationEmails, lastAlertEmailDate: state.lastAlertEmailDate,
foodCost: state.foodCost,
appName: state.appName, appSub: state.appSub,
lightMode: state.lightMode, ROWS_PER_PAGE: state.ROWS_PER_PAGE
}));
localStorage.setItem('gestion_stock_v2_savedAt', String(Date.now()));
pushLocalSnapshotThrottled();
} catch(e) {}
if (typeof window.cloudSync !== 'function') return;
let domains;
if (!domain || domain === 'all') domains = SYNC_DOMAINS.slice();
else if (Array.isArray(domain)) domains = domain;
else domains = [domain];
domains.forEach(d => {
if (SYNC_DOMAINS.indexOf(d) === -1) {
console.warn('saveState: domaine inconnu "'+d+'", synchronisation complète par sécurité.');
SYNC_DOMAINS.forEach(dd => window.cloudSync(dd));
} else {
window.cloudSync(d);
}
});
}

function pushLocalSnapshotThrottled() {
const now = Date.now();
if (now - _lastSnapshotAt < 10*60*1000) return;
_lastSnapshotAt = now;
pushLocalSnapshot('auto');
}

function pushLocalSnapshot(label) {
try {
const raw = localStorage.getItem('gestion_stock_v2');
if (!raw) return;
let list = [];
try { list = JSON.parse(localStorage.getItem('gestion_stock_v2_snapshots')||'[]'); } catch(e) { list = []; }
list.push({ ts: Date.now(), label: label||'auto', data: raw });
if (list.length > 10) list = list.slice(-10);
localStorage.setItem('gestion_stock_v2_snapshots', JSON.stringify(list));
} catch(e) {}
}

function getLocalSnapshots() {
try { return JSON.parse(localStorage.getItem('gestion_stock_v2_snapshots')||'[]').sort((a,b)=>b.ts-a.ts); } catch(e) { return []; }
}

function restoreLocalSnapshot(ts) {
const list = getLocalSnapshots();
const snap = list.find(s => s.ts === ts);
if (!snap) return;
if (!confirm('Restaurer l\'état du '+new Date(snap.ts).toLocaleString('fr-FR')+' ?\nCela remplacera TOUTES les données actuelles.')) return;
try {
const p = JSON.parse(snap.data);
state.articles = p.articles || [];
state.purchases = p.purchases || [];
state.sorties = p.sorties || [];
state.fournisseurs = p.fournisseurs || [];
state.recettes = p.recettes || [];
state.ventes = p.ventes || [];
state.commandes = p.commandes || [];
state.activityLog = p.activityLog || [];
state.categoriesArticles = p.categoriesArticles || [];
state.emplacements = (p.emplacements && p.emplacements.length) ? p.emplacements : ['Économat'];
state.transferts = p.transferts || [];
state.categoriesOffert = p.categoriesOffert || [];
state.notificationEmails = p.notificationEmails || [];
state.lastAlertEmailDate = p.lastAlertEmailDate || '';
state.foodCost = p.foodCost || null;
state.appName = p.appName || 'STOCK';
state.appSub = p.appSub || 'Gestion de Stock';
state.lightMode = p.lightMode || false;
state.ROWS_PER_PAGE = p.ROWS_PER_PAGE || 20;
fcEnsureDefaults(); ensureCategoriesDefaults();
saveState('all'); applyAppName(); renderDashboard(); renderSettings();
showToast('✓ Sauvegarde locale restaurée');
} catch(e) { showToast('⚠ Erreur lors de la restauration','#f66'); }
}

// Journal d'activité : trace qui a fait quoi, quand. Appelé juste avant saveState() dans les
// fonctions de mutation (création/modification/suppression).
// Depuis le passage en sous-collection Firestore (users/{id}/activityLog/{entryId}), chaque
// entrée est envoyée individuellement au cloud dès sa création (voir window.saveActivityLogEntry
// dans firebase-init.js) — plus de plafond ni de troncature nécessaire côté serveur.
// state.activityLog en mémoire locale reste limité à 1000 entrées : c'est juste le cache
// d'affichage de la page Journal, pas la source de vérité (qui vit désormais dans Firestore).
function logActivity(action, label) {
if (!Array.isArray(state.activityLog)) state.activityLog = [];
const entry = {
id: 'log-'+Date.now()+Math.random().toString(36).slice(2,6),
ts: new Date().toISOString(),
user: (window._currentUser && window._currentUser.email) || '—',
action, label
};
state.activityLog.push(entry);
if (state.activityLog.length > 1000) state.activityLog = state.activityLog.slice(-1000);
if (typeof window.saveActivityLogEntry === 'function') window.saveActivityLogEntry(entry);
}

// Catégories fermées (articles + offert) : pré-remplissage automatique à la première utilisation.
// Emplacements (Économat + secteurs) : Économat doit toujours être présent, en premier, et
// jamais dupliqué — quelle que soit la façon dont la liste a été modifiée entre-temps.
function ensureEmplacementsDefaults() {
if (!Array.isArray(state.emplacements)) state.emplacements = [];
const autres = state.emplacements.filter(e => e && e !== 'Économat');
state.emplacements = ['Économat', ...autres];
}

function ensureCategoriesDefaults() {
ensureEmplacementsDefaults();
if (!Array.isArray(state.categoriesArticles)) state.categoriesArticles = [];
if (!state.categoriesArticles.length) {
state.categoriesArticles = [...new Set((state.articles||[]).map(a => a.categorie).filter(Boolean))].sort();
}
if (!Array.isArray(state.categoriesOffert)) state.categoriesOffert = [];
if (!state.categoriesOffert.length) {
state.categoriesOffert = ['Invité / VIP', 'Dégustation / Marketing', 'Erreur cuisine/salle', 'Personnel', 'Casse compensée'];
}
}

function resetData() {
if (window.isEconome && window.isEconome()) { showToast('⚠ Action réservée à l\'administrateur','var(--red)'); return; }
if (!confirm('⚠ Réinitialiser TOUTES les données ? Articles, entrées, sorties et fournisseurs seront supprimés.\n\nCette action est irréversible.')) return;
state.articles=[]; state.purchases=[]; state.sorties=[]; state.fournisseurs=[]; state.ventes=[]; state.commandes=[];
logActivity('reset', 'Réinitialisation complète des données');
saveState('all'); renderDashboard(); showToast('🗑 Données réinitialisées', '#f66');
}
