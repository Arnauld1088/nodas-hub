// ============================================================
// NODAS HUB — module: admin.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

// ===== SAUVEGARDE SERVEUR AUTOMATIQUE (visible et restaurable par l'admin plateforme) =====
function checkAndWriteServerBackup() {
if (!window._etablissementId) return;
const lastDate = localStorage.getItem('gestion_stock_server_backup_date');
if (lastDate === today()) return;
const snapshot = {
articles: state.articles, purchases: state.purchases, sorties: state.sorties,
fournisseurs: state.fournisseurs, recettes: state.recettes, ventes: state.ventes,
commandes: state.commandes, activityLog: state.activityLog,
categoriesArticles: state.categoriesArticles, categoriesOffert: state.categoriesOffert,
notificationEmails: state.notificationEmails, lastAlertEmailDate: state.lastAlertEmailDate,
foodCost: state.foodCost, appName: state.appName, appSub: state.appSub,
lightMode: state.lightMode, ROWS_PER_PAGE: state.ROWS_PER_PAGE, members: state.members,
savedAt: new Date().toISOString()
};
if (typeof window.writeServerBackup === 'function') {
window.writeServerBackup(window._etablissementId, snapshot).then(ok => {
if (ok) localStorage.setItem('gestion_stock_server_backup_date', today());
});
}
}

// ===== NOTIFICATIONS PAR EMAIL =====
function checkAndSendStockAlertEmail() {
if (!state.notificationEmails || !state.notificationEmails.length) return;
if (state.lastAlertEmailDate === today()) return;
const alertes = state.articles.filter(a => { const s=getStock(a); return s<=0||(a.stock_min>0&&s<a.stock_min); });
if (!alertes.length) return;
const epuises = alertes.filter(a=>getStock(a)<=0);
const critiques = alertes.length - epuises.length;
const subject = `⚠ ${state.appName} — ${alertes.length} article${alertes.length>1?'s':''} en alerte stock`;
const lignesText = alertes.map(a => `- ${a.designation} : ${fmt(getStock(a))} ${a.unite||''} (min. ${fmt(a.stock_min||0)})`).join('\n');
const text = `Bonjour,\n\n${alertes.length} article(s) sont actuellement en alerte de stock dans ${state.appName} :\n\n${lignesText}\n\nConnectez-vous à l'application pour plus de détails.`;
const lignesHtml = alertes.map(a => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${a.designation}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;color:${getStock(a)<=0?'#e53':'#e67e22'}">${fmt(getStock(a))} ${a.unite||''}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;color:#888">${fmt(a.stock_min||0)}</td></tr>`).join('');
const html = `<div style="font-family:Arial,sans-serif;color:#333"><h2 style="color:#c9a84c">⚠ Alertes stock — ${state.appName}</h2><p>${alertes.length} article(s) nécessitent un réapprovisionnement (${epuises.length} épuisé${epuises.length>1?'s':''}, ${critiques} sous le seuil minimum) :</p><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #c9a84c">Article</th><th style="text-align:right;padding:6px 10px;border-bottom:2px solid #c9a84c">Stock</th><th style="text-align:right;padding:6px 10px;border-bottom:2px solid #c9a84c">Min.</th></tr></thead><tbody>${lignesHtml}</tbody></table><p style="margin-top:16px;color:#888;font-size:12px">Connectez-vous à l'application pour plus de détails.</p></div>`;
if (typeof window.writeMailDoc === 'function') {
window.writeMailDoc(state.notificationEmails, subject, text, html).then(ok => {
if (ok) { state.lastAlertEmailDate = today(); saveState('meta'); if (document.getElementById('page-parametres')?.classList.contains('active')) renderNotificationEmailsList(); }
});
}
}

function sendTestAlertEmail() {
if (!state.notificationEmails || !state.notificationEmails.length) { showToast('⚠ Ajoutez au moins une adresse email d\'abord','var(--red)'); return; }
const subject = `✓ Test — ${state.appName}`;
const text = `Ceci est un email de test envoyé depuis ${state.appName}. Si vous recevez ce message, les notifications par email fonctionnent correctement.`;
const html = `<div style="font-family:Arial,sans-serif;color:#333"><h2 style="color:#3ecf8e">✓ Test réussi</h2><p>Ceci est un email de test envoyé depuis <strong>${state.appName}</strong>. Si vous recevez ce message, les notifications par email fonctionnent correctement.</p></div>`;
if (typeof window.writeMailDoc !== 'function') { showToast('⚠ Fonction d\'envoi indisponible','var(--red)'); return; }
showToast('Envoi du test en cours...', 'var(--blue)');
window.writeMailDoc(state.notificationEmails, subject, text, html).then(ok => {
showToast(ok ? '✓ Demande déposée — vérifiez la boîte mail dans quelques instants' : '⚠ Échec du dépôt de la demande', ok?'var(--green)':'var(--red)');
});
}

function renderNotificationEmailsList() {
const el = document.getElementById('notif-emails-list');
if (!el) return;
el.innerHTML = categoryChipsHTML([...(state.notificationEmails||[])].sort(), 'removeNotificationEmail');
const lastEl = document.getElementById('notif-last-sent');
if (lastEl) lastEl.textContent = state.lastAlertEmailDate ? 'Dernier envoi : '+fmtDate(state.lastAlertEmailDate) : 'Aucun envoi pour le moment';
}

function addNotificationEmail() {
const input = document.getElementById('new-notif-email');
const v = (input.value||'').trim();
if (!v) return;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { showToast('⚠ Adresse email invalide','var(--red)'); return; }
if (!state.notificationEmails) state.notificationEmails = [];
if (state.notificationEmails.some(e => e.toLowerCase()===v.toLowerCase())) { showToast('⚠ Déjà dans la liste','var(--orange)'); return; }
state.notificationEmails.push(v);
input.value = '';
saveState('meta'); renderNotificationEmailsList();
showToast('✓ Adresse ajoutée : '+v);
}

function removeNotificationEmail(email) {
state.notificationEmails = (state.notificationEmails||[]).filter(e => e!==email);
saveState('meta'); renderNotificationEmailsList();
showToast('🗑 Adresse retirée');
}

// ===== ACTIONS ADMIN PLATEFORME (Vue Admin) =====
function adminToggleAccount(uid, etablissementId, role, newState) {
if (!confirm((newState?'Désactiver':'Réactiver')+' ce compte ?'+(newState?' Il ne pourra plus se connecter tant qu\'il ne sera pas réactivé.':''))) return;
if (typeof window.setAccountDisabled !== 'function') return;
window.setAccountDisabled(uid, etablissementId, role, newState).then(ok => {
if (ok) {
showToast('✓ Compte '+(newState?'désactivé':'réactivé'));
const d = window._adminData && window._adminData[etablissementId];
if (d && d.members) { const m = d.members.find(x=>x.uid===uid); if (m) m.disabled = newState; }
showAdminDetail(etablissementId);
}
});
}

function adminSaveRename(etablissementId) {
const nameEl = document.getElementById('admin-rename-name');
const subEl = document.getElementById('admin-rename-sub');
const name = (nameEl?.value||'').trim() || 'STOCK';
const sub = (subEl?.value||'').trim() || 'Gestion de Stock';
if (typeof window.adminRenameEtablissement !== 'function') return;
window.adminRenameEtablissement(etablissementId, name, sub).then(ok => {
if (ok) {
const d = window._adminData && window._adminData[etablissementId];
if (d) { d.appName = name; d.appSub = sub; }
if (typeof window.loadAdminUsers === 'function') window.loadAdminUsers();
showAdminDetail(etablissementId);
}
});
}

function adminConfirmDelete(etablissementId, label) {
const typed = prompt('Cette action est IRRÉVERSIBLE et supprime toutes les données de "'+label+'" ainsi que tous ses comptes liés (admin, économe, scanner).\n\nTapez SUPPRIMER en majuscules pour confirmer :');
if (typed === null) return;
if (typed !== 'SUPPRIMER') { showToast('⚠ Suppression annulée (texte incorrect)','var(--orange)'); return; }
if (typeof window.adminDeleteEtablissement !== 'function') return;
window.adminDeleteEtablissement(etablissementId).then(ok => {
if (ok) { closeModal('modal-admin-detail'); if (typeof window.loadAdminUsers === 'function') window.loadAdminUsers(); }
});
}

function adminRestoreBackup(etablissementId, backupId) {
const backups = (window._adminBackupsCache && window._adminBackupsCache[etablissementId]) || [];
const b = backups.find(x=>x.id===backupId);
if (!b) return;
if (!confirm('Restaurer la sauvegarde du '+new Date(b.savedAt).toLocaleString('fr-FR')+' ?\nCela remplace TOUTES les données actuelles de cet établissement (le poste du client verra ces données à sa prochaine connexion).')) return;
if (typeof window.restoreServerBackup !== 'function') return;
window.restoreServerBackup(etablissementId, b.data).then(ok => {
showToast(ok ? '✓ Sauvegarde restaurée' : '⚠ Échec de la restauration', ok?'var(--green)':'var(--red)');
});
}
