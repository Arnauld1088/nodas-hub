// ============================================================
// NODAS HUB — module: transferts.js
// Transferts internes entre emplacements (Économat ↔ secteurs)
// ============================================================

function updateTransfertStockInfo() {
const el = document.getElementById('transfert-stock-info');
if (!el) return;
const articleEl = document.getElementById('transfert-article');
const origineEl = document.getElementById('transfert-origine');
if (!articleEl || !origineEl || !articleEl.value || !origineEl.value) { el.textContent = ''; return; }
const art = state.articles.find(a => a.designation.toLowerCase()===articleEl.value.trim().toLowerCase());
if (!art) { el.textContent = ''; return; }
const dispo = getStock(art, origineEl.value);
el.textContent = `Disponible à "${origineEl.value}" : ${fmt(dispo)} ${art.unite||''}`;
el.style.color = dispo>0 ? 'var(--text3)' : 'var(--red)';
}
document.addEventListener('input', e => { if (e.target && (e.target.id==='transfert-article')) updateTransfertStockInfo(); });
document.addEventListener('change', e => { if (e.target && (e.target.id==='transfert-origine')) updateTransfertStockInfo(); });

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
if (origine !== 'Économat' && destination !== 'Économat') { showToast('⚠ Un transfert direct entre deux secteurs n\'est pas possible — passez par l\'Économat (retour puis redistribution)', 'var(--red)'); return; }
const art = state.articles.find(a => a.designation.toLowerCase()===article.toLowerCase());
if (!art) { showToast('⚠ Article introuvable','#f66'); return; }
const dispo = getStock(art, origine);
if (qte > dispo) { showToast(`⚠ Stock insuffisant à "${origine}" (${fmt(dispo)} ${art.unite||''} disponible)`, 'var(--red)'); return; }
const id = 'transfert-'+Date.now()+Math.random().toString(36).slice(2,6);
state.transferts.push({ id, date, article: art.designation, quantite: qte, origine, destination, note });
ajusterStockEmplacement(art, origine, -qte);
ajusterStockEmplacement(art, destination, qte);
// Un transfert qui QUITTE l'Économat (distribution vers un secteur) compte comme une sortie de
// l'Économat pour ce secteur ; un transfert qui REVIENT vers l'Économat (retour d'un secteur qui
// n'a pas tout utilisé) compte comme une entrée de l'Économat. Dans les deux cas, ligne purement
// informative pour que les rapports existants (Food Cost par secteur, mouvements du tableau de
// bord...) voient le mouvement — le stock est déjà déplacé ci-dessus via ajusterStockEmplacement,
// on n'y touche pas une seconde fois ici (ni total_sortant/total_entrant, ni stockParSecteur).
let domaines = ['transferts','articles'];
if (origine === 'Économat') {
state.sorties.push({ date, article: art.designation, quantite: qte, categorie: art.categorie||'', secteur: destination, transfertId: id, note: 'Transfert interne'+(note?' — '+note:'') });
domaines.push('sorties');
} else if (destination === 'Économat') {
state.purchases.push({ date, article: art.designation, quantite: qte, prix_ttc:0, total:0, fournisseur:'', facture:'RETOUR', categorie: art.categorie||'', destination:'Économat', transfertId: id, note: 'Retour de '+origine+(note?' — '+note:'') });
domaines.push('purchases');
}
logActivity('transfert_create', `Transfert : ${art.designation} (${fmt(qte)}) — ${origine} → ${destination}`);
saveState(domaines); closeModal('modal-transfert'); renderTransferts();
showToast(`✓ Transfert enregistré : ${art.designation} (${fmt(qte)})`);
}

function deleteTransfert(id) {
if ((window.isEconome && window.isEconome()) || (window.isSecteurResponsable && window.isSecteurResponsable())) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
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
let domaines = ['transferts','articles'];
// Retirer l'enregistrement miroir (sortie ou entrée) créé lors de ce transfert, pour ne pas
// laisser une trace de mouvement qui n'existe plus.
const nbSorties = state.sorties.length;
state.sorties = state.sorties.filter(s => s.transfertId !== id);
if (state.sorties.length !== nbSorties) domaines.push('sorties');
const nbPurchases = state.purchases.length;
state.purchases = state.purchases.filter(p => p.transfertId !== id);
if (state.purchases.length !== nbPurchases) domaines.push('purchases');
logActivity('transfert_delete', `Transfert annulé : ${t.article} (${fmt(t.quantite)}) — ${t.origine} → ${t.destination}`);
saveState(domaines); renderTransferts();
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

function renderStockSecteurs() {
const thead = document.getElementById('stock-secteurs-thead');
const tbody = document.getElementById('stock-secteurs-tbody');
if (!thead || !tbody) return;
const catSel = document.getElementById('filter-stock-secteurs-cat');
if (catSel && !catSel.dataset.filled) {
catSel.innerHTML = '<option value="">Toutes catégories</option>' + allCategories().map(c=>`<option value="${c}">${c}</option>`).join('');
catSel.dataset.filled = '1';
}
const q = (document.getElementById('search-stock-secteurs')?.value||'').toLowerCase();
const cat = catSel?.value || '';
const emplacements = allEmplacements();
thead.innerHTML = '<th>Article</th><th>Catégorie</th>' + emplacements.map(e=>`<th style="text-align:right">${e}</th>`).join('') + '<th style="text-align:right">Total</th>';
const filtered = state.articles.filter(a => {
if (q && !a.designation.toLowerCase().includes(q) && !(a.categorie||'').toLowerCase().includes(q)) return false;
if (cat && a.categorie !== cat) return false;
return true;
}).sort((a,b)=>a.designation.localeCompare(b.designation));
const lbl = document.getElementById('stock-secteurs-count-label');
if (lbl) lbl.textContent = `${filtered.length} article${filtered.length>1?'s':''}`;
tbody.innerHTML = filtered.map(a => {
const valeurs = emplacements.map(e => getStock(a,e));
const total = valeurs.reduce((s,v)=>s+v,0);
return '<tr><td><strong>'+a.designation+'</strong></td><td>'+(a.categorie||'—')+'</td>'
+ valeurs.map(v => `<td style="text-align:right;color:${v>0?'inherit':'var(--text3)'}">${fmt(v)}</td>`).join('')
+ `<td style="text-align:right;font-weight:700">${fmt(total)} ${a.unite||''}</td></tr>`;
}).join('') || `<tr><td colspan="${emplacements.length+3}" style="text-align:center;padding:30px;color:var(--text3)">Aucun article</td></tr>`;
}

function addTransfertLigne(article, qte) {
const list = document.getElementById('transfert-groupe-lines');
if (!list) return;
const id = 'tgl-'+Date.now()+Math.random().toString(36).slice(2,6);
const row = document.createElement('div');
row.className = 'ing-row'; row.id = id;
row.innerHTML = '<input type="text" class="ing-art tg-art" list="dl-transfert-article" placeholder="Article..." value="'+(article||'')+'" autocomplete="off" style="flex:2">'
+'<input type="number" class="ing-qte tg-qte" placeholder="Qté" min="0" step="0.01" value="'+(qte||'')+'" style="flex:0 0 80px">'
+'<button type="button" class="btn btn-outline btn-sm" style="flex:0 0 42px;padding:0" title="Scanner le code-barres" onclick="openScanner(function(a){document.querySelector(\'#'+id+' .tg-art\').value=a.designation;})">📷</button>'
+'<button class="ing-del" type="button" onclick="document.getElementById(\''+id+'\').remove()">×</button>';
list.appendChild(row);
}

function saveTransfertGroupe() {
const date = document.getElementById('transfert-groupe-date').value;
const origine = document.getElementById('transfert-groupe-origine').value;
const destination = document.getElementById('transfert-groupe-destination').value;
const note = document.getElementById('transfert-groupe-note').value.trim();
if (!date) { showToast('⚠ Date obligatoire','var(--red)'); return; }
if (!origine || !destination) { showToast('⚠ Choisissez les deux emplacements','#f66'); return; }
if (origine === destination) { showToast('⚠ Origine et destination doivent être différentes','#f66'); return; }
if (origine !== 'Économat' && destination !== 'Économat') { showToast('⚠ Un transfert direct entre deux secteurs n\'est pas possible — passez par l\'Économat', 'var(--red)'); return; }
const rows = [...document.querySelectorAll('#transfert-groupe-lines .ing-row')];
let count = 0, erreurs = [];
rows.forEach(row => {
const article = row.querySelector('.tg-art')?.value.trim();
const qte = parseFloat(row.querySelector('.tg-qte')?.value) || 0;
if (!article || qte<=0) return;
const art = state.articles.find(a => a.designation.toLowerCase()===article.toLowerCase());
if (!art) { erreurs.push(article+' : introuvable'); return; }
const dispo = getStock(art, origine);
if (qte > dispo) { erreurs.push(article+' : stock insuffisant ('+fmt(dispo)+' dispo à "'+origine+'")'); return; }
const id = 'transfert-'+Date.now()+Math.random().toString(36).slice(2,6);
state.transferts.push({ id, date, article: art.designation, quantite: qte, origine, destination, note });
ajusterStockEmplacement(art, origine, -qte);
ajusterStockEmplacement(art, destination, qte);
if (origine === 'Économat') {
state.sorties.push({ date, article: art.designation, quantite: qte, categorie: art.categorie||'', secteur: destination, transfertId: id, note: 'Transfert interne'+(note?' — '+note:'') });
} else if (destination === 'Économat') {
state.purchases.push({ date, article: art.designation, quantite: qte, prix_ttc:0, total:0, fournisseur:'', facture:'RETOUR', categorie: art.categorie||'', destination:'Économat', transfertId: id, note: 'Retour de '+origine+(note?' — '+note:'') });
}
count++;
});
if (count === 0) { showToast('⚠ Aucune ligne valide'+(erreurs.length?' — '+erreurs.join(', '):''), 'var(--red)'); return; }
logActivity('transfert_create', count+' article(s) transféré(s) en groupe — '+origine+' → '+destination);
let domaines = ['transferts','articles'];
if (origine==='Économat') domaines.push('sorties'); else if (destination==='Économat') domaines.push('purchases');
saveState(domaines); closeModal('modal-transfert-groupe'); renderTransferts();
showToast(`✓ ${count} article(s) transféré(s)`+(erreurs.length?` — ${erreurs.length} ligne(s) ignorée(s) : ${erreurs.join(', ')}`:''));
}
