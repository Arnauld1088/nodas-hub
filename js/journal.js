// ============================================================
// NODAS HUB — module: journal.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function populateJournalFilters() {
const sel = document.getElementById('filter-journal-action');
if (!sel) return;
const curr = sel.value;
const actionsPresentes = [...new Set((state.activityLog||[]).map(l=>l.action))].sort();
sel.innerHTML = '<option value="">Tous types d\'action</option>' + actionsPresentes.map(a=>`<option value="${a}"${a===curr?' selected':''}>${JOURNAL_ACTION_LABELS[a]||a}</option>`).join('');
}

function renderJournal() {
const q = (document.getElementById('search-journal')?.value||'').toLowerCase();
const actionF = document.getElementById('filter-journal-action')?.value||'';
const from = document.getElementById('filter-journal-from')?.value||'';
const to = document.getElementById('filter-journal-to')?.value||'';
let filtered = (state.activityLog||[]).filter(l => {
const dateOnly = (l.ts||'').substring(0,10);
if (q && !(l.label||'').toLowerCase().includes(q) && !(l.user||'').toLowerCase().includes(q)) return false;
if (actionF && l.action !== actionF) return false;
if (from && dateOnly < from) return false;
if (to && dateOnly > to) return false;
return true;
}).sort((a,b)=>b.ts>a.ts?1:-1);
const nbUtilisateurs = new Set(filtered.map(l=>l.user)).size;
const dernier = filtered[0];
const kpiEl = document.getElementById('journal-kpi');
if (kpiEl) kpiEl.innerHTML = `
<div class="analyse-kpi"><div class="analyse-kpi-label">Entrées affichées</div><div class="analyse-kpi-val" style="color:var(--gold)">${filtered.length}</div><div class="analyse-kpi-sub">sur ${(state.activityLog||[]).length} au total</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Utilisateurs</div><div class="analyse-kpi-val" style="color:var(--blue)">${nbUtilisateurs}</div><div class="analyse-kpi-sub">actifs sur cette vue</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Dernière action</div><div class="analyse-kpi-val" style="color:var(--text2);font-size:15px">${dernier?new Date(dernier.ts).toLocaleString('fr-FR'):'—'}</div><div class="analyse-kpi-sub">${dernier?dernier.user:''}</div></div>`;
const total = filtered.length;
const pages = Math.ceil(total/state.ROWS_PER_PAGE)||1;
state.logPage = Math.min(state.logPage||1, pages);
const start = (state.logPage-1)*state.ROWS_PER_PAGE;
const rows = filtered.slice(start, start+state.ROWS_PER_PAGE);
document.getElementById('journal-count-label').textContent = `${total} entrée${total>1?'s':''}`;
document.getElementById('journal-info').textContent = total ? `${start+1}–${Math.min(start+state.ROWS_PER_PAGE,total)} sur ${total}` : '0 résultat';
document.getElementById('journal-tbody').innerHTML = rows.map(l => `<tr>
<td style="font-size:12px;color:var(--text3);white-space:nowrap">${l.ts?new Date(l.ts).toLocaleString('fr-FR'):'—'}</td>
<td style="font-size:12px">${l.user||'—'}</td>
<td><span class="badge badge-${JOURNAL_ACTION_COLORS[l.action]||'gray'}" style="margin-right:6px">${JOURNAL_ACTION_LABELS[l.action]||l.action}</span>${l.label||''}</td>
</tr>`).join('') || '<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--text3)">Aucune activité enregistrée</td></tr>';
renderPagination('journal-pages', state.logPage, pages, 'logPage', 'renderJournal');
}

// Le journal étant une vraie sous-collection Firestore (users/{id}/activityLog/{entryId}),
// le vider ne peut pas se faire via saveState() (qui ne gère que les domaines "tableau").
// On vide le cache local, puis on déclenche la suppression de tous les documents côté cloud.
function clearActivityLog() {
if (window.isEconome && window.isEconome()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
if (!confirm('Vider le journal d\'activité ? Cette action est irréversible.')) return;
state.activityLog = [];
try { localStorage.setItem('gestion_stock_v2', JSON.stringify({...JSON.parse(localStorage.getItem('gestion_stock_v2')||'{}'), activityLog: []})); } catch(e) {}
if (typeof window.clearActivityLogCloud === 'function') {
window.clearActivityLogCloud().then(() => logActivity('journal_clear', 'Journal d\'activité vidé'));
}
renderJournal();
showToast('🗑 Journal vidé');
}
