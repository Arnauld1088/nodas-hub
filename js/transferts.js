// ============================================================
// NODAS HUB — module: transferts.js
// Transferts internes entre emplacements (Économat ↔ secteurs)
// ============================================================

function saveTransfert() {
const article = document.getElementById('transfert-article').value.trim();
const date = document.getElementById('transfert-date').value;
const qte = parseFloat(document.getElementById('transfert-qte').value);
const origine = document.getElementById('transfert-origine').value;
const destination = document.getElementById('transfert-destination').value;
const note = document.getElementById('transfert-note').value.trim();
if (!article || !date || isNaN(qte) || qte <= 0) { showToast('⚠ Remplissez les champs obligatoires','#f66'); return; }
if (!origine || !destination) { showToast('⚠ Choisissez les deux emplacements','#f66'); return; }
if (origine === destination) { showToast('⚠ Origine et destination doivent être différentes','#f66'); return; }
const art = state.articles.find(a => a.designation.toLowerCase()===article.toLowerCase());
if (!art) { showToast('⚠ Article introuvable','#f66'); return; }
const dispo = getStock(art, origine);
if (qte > dispo) { showToast(`⚠ Stock insuffisant à "${origine}" (${fmt(dispo)} ${art.unite||''} disponible)`, 'var(--red)'); return; }
const id = 'transfert-'+Date.now()+Math.random().toString(36).slice(2,6);
state.transferts.push({ id, date, article: art.designation, quantite: qte, origine, destination, note });
ajusterStockEmplacement(art, origine, -qte);
ajusterStockEmplacement(art, destination, qte);
logActivity('transfert_create', `Transfert : ${art.designation} (${fmt(qte)}) — ${origine} → ${destination}`);
saveState(['transferts','articles']); closeModal('modal-transfert'); renderTransferts();
showToast(`✓ Transfert enregistré : ${art.designation} (${fmt(qte)})`);
}

function deleteTransfert(id) {
if (window.isEconome && window.isEconome()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
const t = state.transferts.find(x => x.id === id);
if (!t) return;
if (!confirm(`Annuler ce transfert (${t.article}, ${fmt(t.quantite)}) ? Le stock sera remis à son emplacement d'origine.`)) return;
const art = state.articles.find(a => a.designation === t.article);
if (art) {
// On ne bloque pas l'annulation même si la destination n'a plus assez de stock (ex: une
// partie a déjà été reconsommée depuis) — le stock de destination peut devenir négatif dans
// ce cas précis, ce qui sert justement de signal d'alerte visuel à corriger manuellement.
ajusterStockEmplacement(art, t.destination, -t.quantite);
ajusterStockEmplacement(art, t.origine, t.quantite);
}
state.transferts = state.transferts.filter(x => x.id !== id);
logActivity('transfert_delete', `Transfert annulé : ${t.article} (${fmt(t.quantite)}) — ${t.origine} → ${t.destination}`);
saveState(['transferts','articles']); renderTransferts();
showToast('🗑 Transfert annulé, stock restauré');
}

function renderTransferts() {
const tbody = document.getElementById('transferts-list');
if (!tbody) return;
const filtered = [...(state.transferts||[])].sort((a,b)=>b.date>a.date?1:(b.date<a.date?-1:0));
const total = filtered.length;
const pages = Math.ceil(total/state.ROWS_PER_PAGE)||1;
state.transfertPage = Math.min(state.transfertPage||1, pages);
const start = (state.transfertPage-1)*state.ROWS_PER_PAGE;
const rows = filtered.slice(start, start+state.ROWS_PER_PAGE);
const lbl = document.getElementById('transferts-count-label');
if (lbl) lbl.textContent = `${total} transfert${total>1?'s':''}`;
tbody.innerHTML = rows.map(t => `<tr>
<td>${fmtDate(t.date)}</td><td><strong>${t.article}</strong></td>
<td style="font-weight:600">${fmt(t.quantite)}</td>
<td>${t.origine}</td><td>→ ${t.destination}</td>
<td style="color:var(--text3)">${t.note||'—'}</td>
<td><button class="btn btn-outline btn-sm" onclick="deleteTransfert('${t.id}')" title="Annuler ce transfert">✕</button></td>
</tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text3)">Aucun transfert enregistré</td></tr>';
renderPagination('transferts-pages', state.transfertPage, pages, 'transfertPage', 'renderTransferts');
}
