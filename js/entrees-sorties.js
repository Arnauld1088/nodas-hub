// ============================================================
// NODAS HUB — module: entrees-sorties.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function saveEntree() {
const article = document.getElementById('entree-article').value;
const date = document.getElementById('entree-date').value;
const qte = parseFloat(document.getElementById('entree-qte').value);
const prix = parseFloat(document.getElementById('entree-prix').value) || 0;
const facture = document.getElementById('entree-facture').value;
const fournisseur = document.getElementById('entree-fournisseur').value;
const note = document.getElementById('entree-note').value;
if (!article || !date || isNaN(qte) || qte <= 0) { showToast('⚠ Remplissez les champs obligatoires','#f66'); return; }
const art = state.articles.find(a => a.designation.toLowerCase()===article.toLowerCase());
state.purchases.push({ date, facture, article, quantite:qte, prix_ttc:prix, total:prix*qte, fournisseur, categorie: art?art.categorie:'', note });
if (art) { art.total_entrant = (art.total_entrant||0) + qte; if (prix>0) art.prix_achat = prix; }
logActivity('entree', 'Entrée : '+article+' (+'+fmt(qte)+')'+(fournisseur?' — '+fournisseur:''));
saveState(['purchases','articles']); closeModal('modal-entree');
showToast(`✓ Entrée enregistrée : ${article} (${fmt(qte)})`);
renderDashboard();
}

function saveSortie() {
const article = document.getElementById('sortie-article').value;
const date = document.getElementById('sortie-date').value;
const qte = parseFloat(document.getElementById('sortie-qte').value);
const secteur = document.getElementById('sortie-secteur').value;
const cat = document.getElementById('sortie-cat').value;
if (!article || !date || isNaN(qte) || qte <= 0) { showToast('⚠ Remplissez les champs obligatoires','#f66'); return; }
const art = state.articles.find(a => a.designation.toLowerCase()===article.toLowerCase());
state.sorties.push({ date, article, quantite:qte, categorie: cat || (art?art.categorie:''), secteur });
if (art) art.total_sortant = (art.total_sortant||0) + qte;
logActivity('sortie', 'Sortie : '+article+' (-'+fmt(qte)+')'+(secteur?' — '+secteur:''));
saveState(['sorties','articles']); closeModal('modal-sortie');
showToast(`✓ Sortie enregistrée : ${article} (${fmt(qte)})`);
renderDashboard();
}

// ===== FACTURE GROUPÉE (plusieurs articles en une fois) =====
function addFactureEntreeLine(article, qte, prix) {
const list = document.getElementById('facture-entree-lines');
if (!list) return;
const id = 'fel-'+Date.now()+Math.random().toString(36).slice(2,6);
const row = document.createElement('div');
row.className = 'ing-row'; row.id = id;
row.innerHTML = '<input type="text" class="ing-art" list="dl-facture-article" placeholder="Article..." value="'+(article||'')+'" autocomplete="off" style="flex:2">'
+'<input type="number" class="ing-qte fe-qte" placeholder="Qté" min="0" step="0.01" value="'+(qte||'')+'" oninput="updateFactureEntreeTotal()" style="flex:0 0 80px">'
+'<input type="number" class="ing-qte fe-prix" placeholder="Prix TTC" min="0" step="1" value="'+(prix||'')+'" oninput="updateFactureEntreeTotal()" style="flex:0 0 100px">'
+'<span class="ing-cout" id="tot-'+id+'" style="flex:0 0 90px;text-align:right">—</span>'
+'<button class="ing-del" type="button" onclick="document.getElementById(\''+id+'\').remove();updateFactureEntreeTotal()">×</button>';
list.appendChild(row);
updateFactureEntreeTotal();
}

function updateFactureEntreeTotal() {
let total = 0;
document.querySelectorAll('#facture-entree-lines .ing-row').forEach(row => {
const qte = parseFloat(row.querySelector('.fe-qte')?.value) || 0;
const prix = parseFloat(row.querySelector('.fe-prix')?.value) || 0;
const t = qte*prix; total += t;
const span = row.querySelector('[id^="tot-"]');
if (span) span.textContent = t>0 ? fmtNum(Math.round(t))+' F' : '—';
});
const totEl = document.getElementById('facture-entree-total');
if (totEl) totEl.textContent = fmtNum(Math.round(total))+' FCFA';
}

function saveFactureEntree() {
const date = document.getElementById('facture-entree-date').value;
const fournisseur = document.getElementById('facture-entree-fournisseur').value;
const facture = document.getElementById('facture-entree-numero').value.trim();
if (!date) { showToast('⚠ Date obligatoire','var(--red)'); return; }
const rows = [...document.querySelectorAll('#facture-entree-lines .ing-row')];
let count = 0;
rows.forEach(row => {
const article = row.querySelector('.ing-art')?.value.trim();
const qte = parseFloat(row.querySelector('.fe-qte')?.value) || 0;
const prix = parseFloat(row.querySelector('.fe-prix')?.value) || 0;
if (!article || qte<=0) return;
const art = state.articles.find(a => a.designation.toLowerCase()===article.toLowerCase());
state.purchases.push({ date, facture, article, quantite:qte, prix_ttc:prix, total:prix*qte, fournisseur, categorie: art?art.categorie:'' });
if (art) { art.total_entrant = (art.total_entrant||0) + qte; if (prix>0) art.prix_achat = prix; }
count++;
});
if (!count) { showToast('⚠ Ajoutez au moins une ligne valide (article + quantité)','var(--red)'); return; }
logActivity('facture_entree', 'Facture entrée : '+count+' article'+(count>1?'s':'')+(fournisseur?' — '+fournisseur:'')+(facture?' (N° '+facture+')':''));
saveState(['purchases','articles']); closeModal('modal-facture-entree');
showToast('✓ Facture enregistrée : '+count+' article'+(count>1?'s':'')+(facture?' (N° '+facture+')':''));
renderDashboard();
}

function addFactureSortieLine(article, qte, categorie) {
const list = document.getElementById('facture-sortie-lines');
if (!list) return;
const id = 'fsl-'+Date.now()+Math.random().toString(36).slice(2,6);
const row = document.createElement('div');
row.className = 'ing-row'; row.id = id;
row.innerHTML = '<input type="text" class="ing-art" list="dl-facture-article" placeholder="Article..." value="'+(article||'')+'" autocomplete="off" style="flex:2">'
+'<input type="number" class="ing-qte fs-qte" placeholder="Qté" min="0" step="0.01" value="'+(qte||'')+'" style="flex:0 0 80px">'
+'<select class="ing-qte fs-cat" style="flex:0 0 140px"><option value="">Catégorie (opt.)</option>'+allCategories().map(c=>'<option value="'+c+'"'+(c===categorie?' selected':'')+'>'+c+'</option>').join('')+'</select>'
+'<button class="ing-del" type="button" onclick="document.getElementById(\''+id+'\').remove()">×</button>';
list.appendChild(row);
}

function saveFactureSortie() {
const date = document.getElementById('facture-sortie-date').value;
const secteur = document.getElementById('facture-sortie-secteur').value;
const bon = document.getElementById('facture-sortie-bon').value.trim();
if (!date) { showToast('⚠ Date obligatoire','var(--red)'); return; }
const rows = [...document.querySelectorAll('#facture-sortie-lines .ing-row')];
let count = 0;
rows.forEach(row => {
const article = row.querySelector('.ing-art')?.value.trim();
const qte = parseFloat(row.querySelector('.fs-qte')?.value) || 0;
const cat = row.querySelector('.fs-cat')?.value.trim() || '';
if (!article || qte<=0) return;
const art = state.articles.find(a => a.designation.toLowerCase()===article.toLowerCase());
state.sorties.push({ date, article, quantite:qte, categorie: cat || (art?art.categorie:''), secteur, bon });
if (art) art.total_sortant = (art.total_sortant||0) + qte;
count++;
});
if (!count) { showToast('⚠ Ajoutez au moins une ligne valide (article + quantité)','var(--red)'); return; }
logActivity('facture_sortie', 'Bon de sortie : '+count+' article'+(count>1?'s':'')+(secteur?' — '+secteur:'')+(bon?' (N° '+bon+')':''));
saveState(['sorties','articles']); closeModal('modal-facture-sortie');
showToast('✓ Bon enregistré : '+count+' article'+(count>1?'s':'')+(bon?' (N° '+bon+')':''));
renderDashboard();
}

function populateEntreeFilters() {
const sel = document.getElementById('filter-fournisseur-entree');
const curr = sel.value;
sel.innerHTML = '<option value="">Tous fournisseurs</option>' + allFournisseurs().map(f=>`<option value="${f}"${f===curr?' selected':''}>${f}</option>`).join('');
}

function renderEntrees() {
const q = document.getElementById('search-entrees').value.toLowerCase();
const from = document.getElementById('filter-date-entree-from').value;
const to = document.getElementById('filter-date-entree-to').value;
const four = document.getElementById('filter-fournisseur-entree').value;
let filtered = state.purchases.filter(p => {
if (q && !p.article.toLowerCase().includes(q) && !(p.fournisseur||'').toLowerCase().includes(q)) return false;
if (from && p.date < from) return false;
if (to && p.date > to) return false;
if (four && p.fournisseur !== four) return false;
return true;
}).sort((a,b)=>b.date>a.date?1:-1);
const total = filtered.length;
const pages = Math.ceil(total/state.ROWS_PER_PAGE)||1;
state.entreePage = Math.min(state.entreePage, pages);
const start = (state.entreePage-1)*state.ROWS_PER_PAGE;
const rows = filtered.slice(start, start+state.ROWS_PER_PAGE);
document.getElementById('entrees-count-label').textContent = `${total} entrée${total>1?'s':''}`;
document.getElementById('entrees-info').textContent = total ? `${start+1}–${Math.min(start+state.ROWS_PER_PAGE,total)} sur ${total}` : '0 résultat';
document.getElementById('entrees-tbody').innerHTML = rows.map(p=>`<tr>
<td>${fmtDate(p.date)}</td><td><strong>${p.article}</strong></td>
<td style="color:var(--green);font-weight:600">+${fmt(p.quantite)}</td>
<td>${p.prix_ttc>0?fmtNum(p.prix_ttc)+' FCFA':'—'}</td>
<td>${p.total>0?fmtNum(Math.round(p.total))+' FCFA':'—'}</td>
<td>${p.fournisseur||'—'}</td>
<td><span class="badge badge-blue">${p.categorie||'—'}</span></td>
<td style="font-size:11px;color:var(--text3)">${p.facture||'—'}</td>
</tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text3)">Aucune entrée</td></tr>';
renderPagination('entrees-pages', state.entreePage, pages, 'entreePage', 'renderEntrees');
}

function populateSortieFilters() {
const sel = document.getElementById('filter-secteur');
const curr = sel.value;
sel.innerHTML = '<option value="">Tous secteurs</option>' + allSecteurs().map(s=>`<option value="${s}"${s===curr?' selected':''}>${s}</option>`).join('');
}

function renderSorties() {
const q = document.getElementById('search-sorties').value.toLowerCase();
const from = document.getElementById('filter-date-sortie-from').value;
const to = document.getElementById('filter-date-sortie-to').value;
const secteur = document.getElementById('filter-secteur').value;
let filtered = state.sorties.filter(s => {
if (q && !s.article.toLowerCase().includes(q)) return false;
if (from && s.date < from) return false;
if (to && s.date > to) return false;
if (secteur && s.secteur !== secteur) return false;
return true;
}).sort((a,b)=>b.date>a.date?1:-1);
const total = filtered.length;
const pages = Math.ceil(total/state.ROWS_PER_PAGE)||1;
state.sortiePage = Math.min(state.sortiePage, pages);
const start = (state.sortiePage-1)*state.ROWS_PER_PAGE;
const rows = filtered.slice(start, start+state.ROWS_PER_PAGE);
document.getElementById('sorties-count-label').textContent = `${total} sortie${total>1?'s':''}`;
document.getElementById('sorties-info').textContent = total ? `${start+1}–${Math.min(start+state.ROWS_PER_PAGE,total)} sur ${total}` : '0 résultat';
document.getElementById('sorties-tbody').innerHTML = rows.map(s=>`<tr>
<td>${fmtDate(s.date)}</td><td><strong>${s.article}</strong></td>
<td style="color:var(--red);font-weight:600">-${fmt(s.quantite)}</td>
<td><span class="badge badge-gray">${s.categorie||'—'}</span></td>
<td>${s.secteur||'—'}</td>
</tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3)">Aucune sortie</td></tr>';
renderPagination('sorties-pages', state.sortiePage, pages, 'sortiePage', 'renderSorties');
}
