// ============================================================
// NODAS HUB — module: ventes.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

// ===== VENTES =====
function venteSetType(type) {
document.getElementById('vt-type-recette').classList.toggle('active', type==='recette');
document.getElementById('vt-type-article').classList.toggle('active', type==='article');
document.getElementById('vente-nom-label').textContent = type==='recette' ? 'Recette *' : 'Article *';
document.getElementById('vente-qte-label').textContent = type==='recette' ? 'Quantité (portions) *' : 'Quantité (unités) *';
const sel = document.getElementById('vente-nom');
if (type==='recette') {
sel.innerHTML = [...state.recettes].sort((a,b)=>a.nom.localeCompare(b.nom)).map(r=>`<option value="${r.id}">${r.nom} (${r.type})</option>`).join('') || '<option value="">— Aucune recette —</option>';
} else {
sel.innerHTML = [...state.articles].sort((a,b)=>a.designation.localeCompare(b.designation)).map(a=>`<option value="${a.designation}">${a.designation}</option>`).join('') || '<option value="">— Aucun article —</option>';
}
venteOnNomChange();
}

function venteOnNomChange() {
const type = document.getElementById('vt-type-recette').classList.contains('active') ? 'recette' : 'article';
const val = document.getElementById('vente-nom').value;
let prix = 0;
if (type==='recette') { const r = state.recettes.find(x=>x.id===val); prix = r?.prix_vente||0; }
else { const a = state.articles.find(x=>x.designation===val); prix = a?.prix_vente||0; }
document.getElementById('vente-prix').value = prix || '';
venteUpdateTotal();
}

function venteOnStatutChange() {
const statut = document.getElementById('vente-statut').value;
const grp = document.getElementById('vente-cat-offert-group');
grp.style.display = statut==='offert' ? 'flex' : 'none';
if (statut==='offert') {
const sel = document.getElementById('vente-categorie-offert');
sel.innerHTML = state.categoriesOffert.map(c=>`<option value="${c}">${c}</option>`).join('') || '<option value="">— Aucune définie —</option>';
}
}

function venteUpdateTotal() {
const qte = parseFloat(document.getElementById('vente-qte').value)||0;
const prix = parseFloat(document.getElementById('vente-prix').value)||0;
document.getElementById('vente-total').textContent = fmtNum(Math.round(qte*prix))+' FCFA';
}

function populateVenteFilters() {
const sel = document.getElementById('filter-vente-secteur');
if (!sel) return;
const curr = sel.value;
const secteurs = [...new Set([...allSecteurs(), ...(state.ventes||[]).map(v=>v.secteur).filter(Boolean)])].sort();
sel.innerHTML = '<option value="">Tous secteurs</option>' + secteurs.map(s=>`<option value="${s}"${s===curr?' selected':''}>${s}</option>`).join('');
}

function renderVentes() {
const q = (document.getElementById('search-ventes')?.value||'').toLowerCase();
const from = document.getElementById('filter-date-vente-from')?.value||'';
const to = document.getElementById('filter-date-vente-to')?.value||'';
const typeF = document.getElementById('filter-vente-type')?.value||'';
const statutF = document.getElementById('filter-vente-statut')?.value||'';
const secteurF = document.getElementById('filter-vente-secteur')?.value||'';
let filtered = (state.ventes||[]).filter(v => {
if (q && !(v.nom||'').toLowerCase().includes(q)) return false;
if (from && v.date < from) return false;
if (to && v.date > to) return false;
if (typeF && v.type !== typeF) return false;
if (statutF && v.statut !== statutF) return false;
if (secteurF && v.secteur !== secteurF) return false;
return true;
}).sort((a,b)=>b.date>a.date?1:-1);
const totalVendu = filtered.filter(v=>v.statut==='vendu').reduce((s,v)=>s+(v.total||0),0);
const totalOffert = filtered.filter(v=>v.statut==='offert').reduce((s,v)=>s+(v.total||0),0);
const nbVendu = filtered.filter(v=>v.statut==='vendu').length;
const nbOffert = filtered.filter(v=>v.statut==='offert').length;
const kpiEl = document.getElementById('ventes-kpi');
if (kpiEl) kpiEl.innerHTML = `
<div class="analyse-kpi"><div class="analyse-kpi-label">CA vendu</div><div class="analyse-kpi-val" style="color:var(--green)">${fmtNum(Math.round(totalVendu))}</div><div class="analyse-kpi-sub">FCFA · ${nbVendu} vente(s)</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Valeur offerte</div><div class="analyse-kpi-val" style="color:var(--orange)">${fmtNum(Math.round(totalOffert))}</div><div class="analyse-kpi-sub">FCFA · ${nbOffert} offert(s)</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Mouvements affichés</div><div class="analyse-kpi-val" style="color:var(--gold)">${filtered.length}</div><div class="analyse-kpi-sub">selon filtres actifs</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Valeur totale</div><div class="analyse-kpi-val" style="color:var(--blue);font-size:20px">${fmtNum(Math.round(totalVendu+totalOffert))}</div><div class="analyse-kpi-sub">vendu + offert</div></div>`;
const total = filtered.length;
const pages = Math.ceil(total/state.ROWS_PER_PAGE)||1;
state.ventePage = Math.min(state.ventePage||1, pages);
const start = (state.ventePage-1)*state.ROWS_PER_PAGE;
const rows = filtered.slice(start, start+state.ROWS_PER_PAGE);
document.getElementById('ventes-count-label').textContent = `${total} vente${total>1?'s':''}`;
document.getElementById('ventes-info').textContent = total ? `${start+1}–${Math.min(start+state.ROWS_PER_PAGE,total)} sur ${total}` : '0 résultat';
document.getElementById('ventes-tbody').innerHTML = rows.map(v => `<tr>
<td>${fmtDate(v.date)}</td>
<td><span class="badge ${v.type==='recette'?'badge-blue':'badge-gray'}">${v.type==='recette'?'🍽 Recette':'▦ Article'}</span></td>
<td><strong>${v.nom}</strong></td>
<td>${v.secteur||'—'}</td>
<td><span class="badge ${v.statut==='vendu'?'badge-green':'badge-orange'}">${v.statut==='vendu'?'Vendu':'Offert'}</span>${v.statut==='offert'&&v.categorie_offert?`<div style="font-size:10px;color:var(--text3);margin-top:2px">${v.categorie_offert}</div>`:''}</td>
<td>${fmt(v.quantite)}</td>
<td>${v.prix_unitaire>0?fmtNum(v.prix_unitaire)+' F':'—'}</td>
<td style="font-weight:600">${fmtNum(Math.round(v.total||0))} F</td>
<td>${v.decompte_stock?'<span class="badge badge-gray">Déduit</span>':'<span class="badge badge-gray" style="opacity:0.6">Non déduit</span>'}</td>
<td><button class="btn btn-danger btn-sm" onclick="deleteVente('${v.id}')">🗑</button></td>
</tr>`).join('') || '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text3)">Aucune vente</td></tr>';
renderPagination('ventes-pages', state.ventePage, pages, 'ventePage', 'renderVentes');
}

function saveVente() {
const type = document.getElementById('vt-type-recette').classList.contains('active') ? 'recette' : 'article';
const val = document.getElementById('vente-nom').value;
const date = document.getElementById('vente-date').value;
const qte = parseFloat(document.getElementById('vente-qte').value);
const statut = document.getElementById('vente-statut').value;
const catOffert = document.getElementById('vente-categorie-offert').value;
const prix = parseFloat(document.getElementById('vente-prix').value) || 0;
const secteur = document.getElementById('vente-secteur').value;
const note = document.getElementById('vente-note').value;
const decompte = document.getElementById('vente-decompte-stock').checked;
if (!val || !date || isNaN(qte) || qte <= 0) { showToast('⚠ Remplissez les champs obligatoires','#f66'); return; }
if (statut==='offert' && !catOffert) { showToast("⚠ Choisissez une catégorie d'offert",'#f66'); return; }
let nom = '';
const venteId = 'vente-'+Date.now()+Math.random().toString(36).slice(2,6);
if (type==='recette') {
const r = state.recettes.find(x=>x.id===val);
if (!r) { showToast('⚠ Recette introuvable','#f66'); return; }
nom = r.nom;
if (decompte) {
(r.ingredients||[]).forEach(ing => {
const ingArt = state.articles.find(a=>a.designation===ing.article);
const ingQte = ing.quantite * qte;
state.sorties.push({ date, article:ing.article, quantite:ingQte, categorie: ing.categorie||(ingArt?ingArt.categorie:''), secteur, venteId, recette:r.nom });
if (ingArt) { ingArt.total_sortant = (ingArt.total_sortant||0) + ingQte; ajusterStockEmplacement(ingArt, resolveEmplacementSortie(secteur), -ingQte); }
});
}
} else {
const a = state.articles.find(x=>x.designation===val);
if (!a) { showToast('⚠ Article introuvable','#f66'); return; }
nom = a.designation;
if (decompte) {
state.sorties.push({ date, article:a.designation, quantite:qte, categorie:a.categorie||'', secteur, venteId });
a.total_sortant = (a.total_sortant||0) + qte;
ajusterStockEmplacement(a, resolveEmplacementSortie(secteur), -qte);
}
}
state.ventes.push({ id:venteId, date, type, nom, quantite:qte, statut, categorie_offert: statut==='offert'?catOffert:'', prix_unitaire:prix, total: prix*qte, secteur, note, decompte_stock: decompte });
logActivity('vente', 'Vente : '+nom+' ('+fmt(qte)+') — '+(statut==='vendu'?'vendu':'offert'));
saveState(['ventes','sorties','articles']); closeModal('modal-vente'); renderVentes(); renderDashboard();
showToast(`✓ Vente enregistrée : ${nom} (${fmt(qte)})`);
}

function deleteVente(id) {
const v = (state.ventes||[]).find(x=>x.id===id);
if (!v) return;
if (!confirm(`Supprimer cette vente (${v.nom}) ? Le stock déduit sera restauré si applicable.`)) return;
const linked = state.sorties.filter(s=>s.venteId===id);
linked.forEach(s => {
const art = state.articles.find(a=>a.designation===s.article);
if (art) { art.total_sortant = Math.max(0,(art.total_sortant||0) - s.quantite); ajusterStockEmplacement(art, resolveEmplacementSortie(s.secteur), s.quantite); }
});
state.sorties = state.sorties.filter(s=>s.venteId!==id);
state.ventes = state.ventes.filter(x=>x.id!==id);
logActivity('vente_delete', 'Vente supprimée : '+v.nom+' ('+fmt(v.quantite)+')');
saveState(['ventes','sorties','articles']); renderVentes(); renderDashboard();
showToast('🗑 Vente supprimée, stock restauré si applicable');
}
