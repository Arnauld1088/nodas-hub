// ============================================================
// NODAS HUB — module: correction.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function openCorrection(id) {
if ((window.isEconome && window.isEconome()) || (window.isSecteurResponsable && window.isSecteurResponsable())) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
const sorted = [...state.articles].sort((a,b) => a.designation.localeCompare(b.designation));
document.getElementById('correction-article').innerHTML =
'<option value="">— Choisir un article —</option>' +
sorted.map(a => `<option value="${a.id}">${a.designation}</option>`).join('');
if (id) document.getElementById('correction-article').value = id;
updateCorrectionInfo();
updateCorrectionLabel();
document.getElementById('correction-qte').value = '';
document.getElementById('correction-motif').value = '';
document.getElementById('correction-preview').style.display = 'none';
document.getElementById('modal-correction').classList.add('open');
}

function updateCorrectionInfo() {
const id = parseInt(document.getElementById('correction-article').value);
const art = state.articles.find(a => a.id === id);
const infoEl = document.getElementById('correction-info');
if (!art) { infoEl.style.display = 'none'; return; }
const s = getStock(art);
document.getElementById('correction-stock-actuel').textContent = `${fmt(s)} ${art.unite||''}`;
document.getElementById('correction-stock-actuel').style.color = s <= 0 ? 'var(--red)' : s < (art.stock_min||0) ? 'var(--orange)' : 'var(--green)';
infoEl.style.display = 'block';
updateCorrectionPreview();
}

function updateCorrectionLabel() {
const type = document.getElementById('correction-type').value;
const labels = { inventaire: 'Quantité réelle (inventaire) *', ajout: 'Quantité à ajouter *', retrait: 'Quantité à retirer *' };
document.getElementById('correction-qte-label').textContent = labels[type] || 'Quantité *';
updateCorrectionPreview();
}

function updateCorrectionPreview() {
const id = parseInt(document.getElementById('correction-article').value);
const art = state.articles.find(a => a.id === id);
const qte = parseFloat(document.getElementById('correction-qte').value);
const type = document.getElementById('correction-type').value;
const prev = document.getElementById('correction-preview');
if (!art || isNaN(qte) || qte < 0) { prev.style.display = 'none'; return; }
const stockActuel = getStock(art);
let newStock, msg;
if (type === 'inventaire') { newStock = qte; msg = `Stock ${stockActuel > 0 ? (qte > stockActuel ? '+' : '') : ''}<strong>${fmt(stockActuel)}</strong> → <strong>${fmt(qte)}</strong> ${art.unite||''}`; }
else if (type === 'ajout') { newStock = stockActuel + qte; msg = `Stock <strong>${fmt(stockActuel)}</strong> + ${fmt(qte)} → <strong>${fmt(newStock)}</strong> ${art.unite||''}`; }
else { newStock = stockActuel - qte; msg = `Stock <strong>${fmt(stockActuel)}</strong> − ${fmt(qte)} → <strong>${fmt(newStock)}</strong> ${art.unite||''}`; }
document.getElementById('correction-preview-text').innerHTML = `📊 Résultat : ${msg}`;
prev.style.display = 'block';
prev.style.borderColor = newStock < 0 ? 'rgba(255,102,102,0.4)' : 'rgba(201,168,76,0.3)';
}

function saveCorrection() {
if ((window.isEconome && window.isEconome()) || (window.isSecteurResponsable && window.isSecteurResponsable())) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
const id = parseInt(document.getElementById('correction-article').value);
const art = state.articles.find(a => a.id === id);
const qte = parseFloat(document.getElementById('correction-qte').value);
const type = document.getElementById('correction-type').value;
const motif = document.getElementById('correction-motif').value.trim();
if (!art) { showToast('⚠ Sélectionnez un article', 'var(--red)'); return; }
if (isNaN(qte) || qte < 0) { showToast('⚠ Quantité invalide', 'var(--red)'); return; }
if (!motif) { showToast('⚠ Motif obligatoire', 'var(--red)'); return; }
const stockActuel = getStock(art);
const dateStr = today();
if (type === 'inventaire') {
const diff = qte - stockActuel;
if (diff > 0) {
art.total_entrant = (art.total_entrant||0) + diff;
ajusterStockEmplacement(art, 'Économat', diff);
state.purchases.push({ date:dateStr, article:art.designation, quantite:diff, prix_ttc:0, total:0, fournisseur:'', facture:'CORRECTION', categorie:art.categorie||'', note:`Correction inventaire : ${motif}` });
} else if (diff < 0) {
art.total_sortant = (art.total_sortant||0) + Math.abs(diff);
ajusterStockEmplacement(art, 'Économat', diff);
state.sorties.push({ date:dateStr, article:art.designation, quantite:Math.abs(diff), secteur:'Correction', categorie:art.categorie||'', note:`Correction inventaire : ${motif}` });
}
} else if (type === 'ajout') {
art.total_entrant = (art.total_entrant||0) + qte;
ajusterStockEmplacement(art, 'Économat', qte);
state.purchases.push({ date:dateStr, article:art.designation, quantite:qte, prix_ttc:0, total:0, fournisseur:'', facture:'CORRECTION', categorie:art.categorie||'', note:`Ajout : ${motif}` });
} else {
if (qte > stockActuel) { showToast('⚠ Retrait supérieur au stock disponible', 'var(--red)'); return; }
art.total_sortant = (art.total_sortant||0) + qte;
ajusterStockEmplacement(art, 'Économat', -qte);
state.sorties.push({ date:dateStr, article:art.designation, quantite:qte, secteur:'Correction', categorie:art.categorie||'', note:`Retrait : ${motif}` });
}
logActivity('correction', 'Correction stock : '+art.designation+' → '+fmt(getStock(art))+' ('+motif+')');
saveState(['articles','purchases','sorties']); closeModal('modal-correction'); renderArticles(); renderDashboard();
showToast(`✓ Stock corrigé : ${art.designation} → ${fmt(getStock(art))} ${art.unite||''}`);
}
