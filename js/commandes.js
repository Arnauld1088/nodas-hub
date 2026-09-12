// ============================================================
// NODAS HUB — module: commandes.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

// ===== BONS DE COMMANDE =====
function populateCommandeFournisseurSelect() {
const sel = document.getElementById('cmd-fournisseur');
if (!sel) return;
sel.innerHTML = '<option value="">— Choisir —</option>' + state.fournisseurs.map(f=>`<option value="${f.nom}">${f.nom}</option>`).join('');
}

function addCommandeLigne(article, quantite, prix, unite) {
const list = document.getElementById('cmd-lignes-list');
if (!list) return;
const id = 'cl-'+Date.now()+Math.random().toString(36).slice(2,6);
const artOptions = state.articles.map(a => '<option value="'+a.designation+'">').join('');
const row = document.createElement('div');
row.className = 'ing-row'; row.id = id;
row.innerHTML = '<input type="text" class="ing-art" list="dl-cmd-art" placeholder="Article..." value="'+(article||'').replace(/"/g,'&quot;')+'" oninput="cmdOnArticleChange(\''+id+'\')" autocomplete="off">'
+'<datalist id="dl-cmd-art">'+artOptions+'</datalist>'
+'<input type="number" class="ing-qte" placeholder="Qté" min="0" step="0.01" value="'+(quantite||'')+'" oninput="cmdUpdateTotal()">'
+'<input type="number" class="ing-cout" placeholder="Prix" min="0" step="1" value="'+(prix||'')+'" oninput="cmdUpdateTotal()" style="flex:0 0 90px;text-align:right;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
+'<span class="ing-unite" id="unite-'+id+'">'+(unite||'')+'</span>'
+'<button class="ing-del" type="button" onclick="document.getElementById(\''+id+'\').remove();cmdUpdateTotal()">×</button>';
list.appendChild(row);
cmdUpdateTotal();
}

function cmdOnArticleChange(rowId) {
const row = document.getElementById(rowId);
if (!row) return;
const name = row.querySelector('.ing-art').value;
const a = state.articles.find(x=>x.designation===name);
const uniteEl = document.getElementById('unite-'+rowId);
if (uniteEl) uniteEl.textContent = a?.unite||'';
const prixInput = row.querySelector('.ing-cout');
if (a && prixInput && !prixInput.value) {
const lastP = [...state.purchases].filter(p=>p.article===a.designation&&p.prix_ttc>0).sort((x,y)=>y.date>x.date?1:-1)[0];
prixInput.value = (lastP?.prix_ttc || a.prix_achat || '') || '';
}
cmdUpdateTotal();
}

function cmdUpdateTotal() {
let total = 0;
document.querySelectorAll('#cmd-lignes-list .ing-row').forEach(row => {
const qte = parseFloat(row.querySelector('.ing-qte')?.value)||0;
const prix = parseFloat(row.querySelector('.ing-cout')?.value)||0;
total += qte*prix;
});
const el = document.getElementById('cmd-total');
if (el) el.textContent = fmtNum(Math.round(total))+' FCFA';
}

function cmdGenerateNumero() {
const year = new Date().getFullYear();
const count = state.commandes.filter(c => c.numero && c.numero.includes('-'+year+'-')).length;
return `BC-${year}-${String(count+1).padStart(3,'0')}`;
}

function saveCommande() {
const fournisseur = document.getElementById('cmd-fournisseur').value;
const date = document.getElementById('cmd-date').value;
const dateLivraison = document.getElementById('cmd-date-livraison').value;
const note = document.getElementById('cmd-note').value;
const editId = document.getElementById('cmd-edit-id').value;
if (!fournisseur || !date) { showToast('⚠ Fournisseur et date obligatoires','#f66'); return; }
const lignes = [];
document.querySelectorAll('#cmd-lignes-list .ing-row').forEach(row => {
const article = row.querySelector('.ing-art')?.value.trim();
const quantite = parseFloat(row.querySelector('.ing-qte')?.value)||0;
const prix = parseFloat(row.querySelector('.ing-cout')?.value)||0;
const a = state.articles.find(x=>x.designation===article);
if (article && quantite>0) lignes.push({ article, quantite_commandee:quantite, quantite_recue:0, prix_unitaire_estime:prix, unite:a?.unite||'' });
});
if (!lignes.length) { showToast('⚠ Ajoutez au moins une ligne','#f66'); return; }
const total = lignes.reduce((s,l)=>s+l.quantite_commandee*l.prix_unitaire_estime,0);
if (editId) {
const idx = state.commandes.findIndex(c=>c.id===editId);
if (idx>=0) {
const old = state.commandes[idx];
lignes.forEach(l => { const oldL = (old.lignes||[]).find(x=>x.article===l.article); if (oldL) l.quantite_recue = oldL.quantite_recue||0; });
state.commandes[idx] = { ...old, fournisseur, date, date_livraison_prevue: dateLivraison, note, lignes, montant_estime: total };
logActivity('commande_edit', 'Bon de commande modifié : '+old.numero);
showToast('✓ Bon de commande modifié : '+old.numero);
}
} else {
const numero = cmdGenerateNumero();
state.commandes.push({ id:'cmd-'+Date.now(), numero, date, date_livraison_prevue: dateLivraison, fournisseur, lignes, statut:'commande', note, montant_estime: total });
logActivity('commande_create', 'Bon de commande créé : '+numero+' — '+fournisseur);
showToast('✓ Bon de commande créé : '+numero);
}
saveState('commandes'); closeModal('modal-commande'); renderCommandes();
}

function editCommande(id) {
const c = state.commandes.find(x=>x.id===id);
if (!c) return;
populateCommandeFournisseurSelect();
document.getElementById('cmd-edit-id').value = c.id;
document.getElementById('cmd-fournisseur').value = c.fournisseur;
document.getElementById('cmd-date').value = c.date;
document.getElementById('cmd-date-livraison').value = c.date_livraison_prevue || '';
document.getElementById('cmd-note').value = c.note||'';
document.getElementById('cmd-lignes-list').innerHTML = '';
(c.lignes||[]).forEach(l => addCommandeLigne(l.article, l.quantite_commandee, l.prix_unitaire_estime, l.unite));
cmdUpdateTotal();
document.getElementById('modal-commande-title').textContent = '✏ Modifier : '+c.numero;
document.getElementById('modal-commande').classList.add('open');
}

function deleteCommande(id) {
const c = state.commandes.find(x=>x.id===id);
if (!c || !confirm(`Supprimer le bon de commande ${c.numero} ?`)) return;
state.commandes = state.commandes.filter(x=>x.id!==id);
logActivity('commande_delete', 'Bon de commande supprimé : '+c.numero);
saveState('commandes'); renderCommandes();
showToast('🗑 Bon de commande supprimé');
}

function populateCommandeFilters() {
const sel = document.getElementById('filter-commande-fournisseur');
if (!sel) return;
const curr = sel.value;
const fourns = [...new Set(state.commandes.map(c=>c.fournisseur).filter(Boolean))].sort();
sel.innerHTML = '<option value="">Tous fournisseurs</option>' + fourns.map(f=>`<option value="${f}"${f===curr?' selected':''}>${f}</option>`).join('');
}

function renderCommandes() {
const q = (document.getElementById('search-commandes')?.value||'').toLowerCase();
const statutF = document.getElementById('filter-commande-statut')?.value||'';
const fournF = document.getElementById('filter-commande-fournisseur')?.value||'';
let filtered = (state.commandes||[]).filter(c => {
if (q && !(c.numero||'').toLowerCase().includes(q) && !(c.fournisseur||'').toLowerCase().includes(q)) return false;
if (statutF && c.statut !== statutF) return false;
if (fournF && c.fournisseur !== fournF) return false;
return true;
}).sort((a,b)=>b.date>a.date?1:-1);
const nbCommande = filtered.filter(c=>c.statut==='commande').length;
const nbPartiel = filtered.filter(c=>c.statut==='partiel').length;
const nbRecu = filtered.filter(c=>c.statut==='recu').length;
const montantEnCours = filtered.filter(c=>c.statut==='commande'||c.statut==='partiel').reduce((s,c)=>s+(c.montant_estime||0),0);
const kpiEl = document.getElementById('commandes-kpi');
if (kpiEl) kpiEl.innerHTML = `
<div class="analyse-kpi"><div class="analyse-kpi-label">En attente</div><div class="analyse-kpi-val" style="color:var(--orange)">${nbCommande}</div><div class="analyse-kpi-sub">commandé, pas encore reçu</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Partiels</div><div class="analyse-kpi-val" style="color:var(--blue)">${nbPartiel}</div><div class="analyse-kpi-sub">réception incomplète</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Reçus</div><div class="analyse-kpi-val" style="color:var(--green)">${nbRecu}</div><div class="analyse-kpi-sub">complets</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Montant en cours</div><div class="analyse-kpi-val" style="color:var(--gold);font-size:20px">${fmtNum(Math.round(montantEnCours))}</div><div class="analyse-kpi-sub">FCFA · commandé + partiel</div></div>`;
const total = filtered.length;
const pages = Math.ceil(total/state.ROWS_PER_PAGE)||1;
state.commandePage = Math.min(state.commandePage||1, pages);
const start = (state.commandePage-1)*state.ROWS_PER_PAGE;
const rows = filtered.slice(start, start+state.ROWS_PER_PAGE);
document.getElementById('commandes-count-label').textContent = `${total} bon${total>1?'s':''} de commande`;
document.getElementById('commandes-info').textContent = total ? `${start+1}–${Math.min(start+state.ROWS_PER_PAGE,total)} sur ${total}` : '0 résultat';
const statutBadge = s => s==='commande'?'<span class="badge badge-orange">Commandé</span>':s==='partiel'?'<span class="badge badge-blue">Partiel</span>':s==='recu'?'<span class="badge badge-green">Reçu</span>':'<span class="badge badge-gray">Annulé</span>';
document.getElementById('commandes-tbody').innerHTML = rows.map(c => `<tr>
<td><strong>${c.numero}</strong></td>
<td>${fmtDate(c.date)}</td>
<td style="font-size:12px;color:${c.date_livraison_prevue && c.date_livraison_prevue<today() && c.statut!=='recu' && c.statut!=='annule' ?'var(--red)':'var(--text3)'}">${c.date_livraison_prevue?fmtDate(c.date_livraison_prevue):'—'}</td>
<td>${c.fournisseur||'—'}</td>
<td>${(c.lignes||[]).length} article${(c.lignes||[]).length>1?'s':''}</td>
<td style="color:var(--gold)">${fmtNum(Math.round(c.montant_estime||0))} F</td>
<td>${statutBadge(c.statut)}</td>
<td style="white-space:nowrap">
<button class="btn btn-outline btn-sm" onclick="exportCommandePDF('${c.id}')" title="PDF">🖨</button>
<button class="btn btn-outline btn-sm" onclick="exportCommandeXLSX('${c.id}')" title="Excel (liste déroulante articles)">📊</button>
${c.statut!=='recu'&&c.statut!=='annule'?`<button class="btn btn-outline btn-sm" onclick="openReception('${c.id}')" title="Réceptionner">📥</button><button class="btn btn-outline btn-sm" onclick="editCommande('${c.id}')" title="Modifier">✏</button>`:''}
<button class="btn btn-danger btn-sm" onclick="deleteCommande('${c.id}')">🗑</button>
</td>
</tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text3)">Aucun bon de commande</td></tr>';
renderPagination('commandes-pages', state.commandePage, pages, 'commandePage', 'renderCommandes');
}

function openReception(id) {
const c = state.commandes.find(x=>x.id===id);
if (!c) return;
document.getElementById('reception-cmd-id').value = id;
document.getElementById('reception-title').textContent = '📥 Réceptionner '+c.numero+' — '+(c.fournisseur||'');
document.getElementById('reception-lignes-list').innerHTML = (c.lignes||[]).map((l,i) => `
<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
<span style="flex:1;font-size:13px">${l.article}<div style="font-size:11px;color:var(--text3)">Commandé : ${fmt(l.quantite_commandee)} ${l.unite||''} · déjà reçu : ${fmt(l.quantite_recue||0)}</div></span>
<input type="number" class="reception-qte" data-idx="${i}" min="0" step="0.01" value="${l.quantite_recue||0}" style="width:90px;padding:6px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text)">
<span style="font-size:11px;color:var(--text3);min-width:30px">${l.unite||''}</span>
</div>`).join('');
document.getElementById('modal-reception').classList.add('open');
}

function saveReception() {
const id = document.getElementById('reception-cmd-id').value;
const c = state.commandes.find(x=>x.id===id);
if (!c) return;
document.querySelectorAll('#reception-lignes-list .reception-qte').forEach(inp => {
const idx = parseInt(inp.dataset.idx);
const v = parseFloat(inp.value)||0;
if (c.lignes[idx]) c.lignes[idx].quantite_recue = Math.max(0, v);
});
const allComplete = c.lignes.every(l => (l.quantite_recue||0) >= l.quantite_commandee);
const anyReceived = c.lignes.some(l => (l.quantite_recue||0) > 0);
c.statut = allComplete ? 'recu' : (anyReceived ? 'partiel' : 'commande');
logActivity('commande_reception', 'Réception '+c.numero+' — statut : '+c.statut);
saveState('commandes'); closeModal('modal-reception'); renderCommandes();
showToast(`✓ Réception enregistrée — statut : ${c.statut==='recu'?'Reçu':c.statut==='partiel'?'Partiel':'Commandé'}`);
}

function exportCommandePDF(id) {
const c = state.commandes.find(x=>x.id===id);
if (!c) return;
const f = state.fournisseurs.find(x=>x.nom===c.fournisseur);
const rows = (c.lignes||[]).map(l=>'<tr><td>'+l.article+'</td><td style="text-align:right">'+fmt(l.quantite_commandee)+'</td><td>'+(l.unite||'')+'</td><td style="text-align:right">'+(l.prix_unitaire_estime>0?fmtNum(l.prix_unitaire_estime)+' F':'—')+'</td><td style="text-align:right">'+(l.prix_unitaire_estime>0?fmtNum(Math.round(l.prix_unitaire_estime*l.quantite_commandee))+' F':'—')+'</td></tr>').join('');
const total = (c.lignes||[]).reduce((s,l)=>s+l.quantite_commandee*(l.prix_unitaire_estime||0),0);
const w = window.open('','_blank');
w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+c.numero+'</title>'
+'<style>body{font-family:Arial,sans-serif;margin:30px;color:#333;font-size:13px}'
+'h1{font-size:20px;color:#c9a84c;margin-bottom:4px}.meta{color:#888;font-size:11px;margin-bottom:20px}'
+'.box{background:#f9f9f9;border:1px solid #ddd;border-radius:8px;padding:14px;margin-bottom:20px}'
+'table{width:100%;border-collapse:collapse}th{background:#f5f0e8;padding:7px 10px;text-align:left;border-bottom:2px solid #c9a84c;font-size:11px}'
+'td{padding:6px 10px;border-bottom:1px solid #eee}tr:nth-child(even){background:#fafafa}'
+'.total-row{font-weight:700;background:#f5f0e8!important}'
+'@media print{button{display:none}}</style></head><body>'
+'<h1>Bon de commande — '+c.numero+'</h1>'
+'<p class="meta">'+state.appName+' · '+fmtDate(c.date)+(c.date_livraison_prevue?' · Livraison prévue : '+fmtDate(c.date_livraison_prevue):'')+' · NODAS HUB</p>'
+'<div class="box"><strong>Fournisseur :</strong> '+(c.fournisseur||'—')+(f?.adresse?'<br>📍 '+f.adresse:'')+(f?.tel1?'<br>📞 '+f.tel1:'')+(f?.email?'<br>✉ '+f.email:'')+'</div>'
+'<table><thead><tr><th>Article</th><th style="text-align:right">Quantité</th><th>Unité</th><th style="text-align:right">Prix unit. est.</th><th style="text-align:right">Total</th></tr></thead><tbody>'+rows
+'<tr class="total-row"><td colspan="4" style="text-align:right">Montant total estimé</td><td style="text-align:right">'+fmtNum(Math.round(total))+' F</td></tr>'
+'</tbody></table>'
+(c.note?'<p style="margin-top:20px;color:#666"><strong>Note :</strong> '+c.note+'</p>':'')
+'<div style="margin-top:40px;border-top:2px solid #333;padding-top:16px;font-size:12px;color:#666">'
+'<strong>Signature / cachet fournisseur :</strong> _________________</div>'
+'<script>window.onload=()=>window.print()<\/script></body></html>');
w.document.close();
}

// Export Excel d'un bon de commande (ou d'un modèle vierge si aucun id fourni),
// avec une vraie liste déroulante Excel (validation de données) sur la colonne
// Article, alimentée par la liste des articles de l'application. SheetJS seul ne
// sait pas écrire de validation de données : on génère le classeur avec SheetJS
// puis on injecte le bloc <dataValidations> dans le XML via JSZip.
async function exportCommandeXLSX(cmdId) {
if (typeof JSZip === 'undefined' || typeof XLSX === 'undefined') { showToast('⚠ Librairie Excel indisponible','var(--red)'); return; }
const cmd = cmdId ? state.commandes.find(c=>c.id===cmdId) : null;
const articleNames = state.articles.map(a=>a.designation).filter(Boolean);
if (!articleNames.length) { showToast('⚠ Aucun article dans la base pour proposer la liste déroulante','var(--orange)'); return; }
const header = ['Fournisseur','Date','Article','Quantité','Prix unitaire estimé','Unité'];
const aoa = [header];
if (cmd) {
(cmd.lignes||[]).forEach(l => {
aoa.push([cmd.fournisseur||'', cmd.date||'', l.article||'', l.quantite_commandee||0, l.prix_unitaire_estime||0, l.unite||'']);
});
}
const minTotalRows = Math.max(aoa.length + 30, 50);
while (aoa.length < minTotalRows) aoa.push(['','','','','','']);
try {
const wb = XLSX.utils.book_new();
const wsCmd = XLSX.utils.aoa_to_sheet(aoa);
wsCmd['!cols'] = [{wch:22},{wch:12},{wch:30},{wch:12},{wch:20},{wch:10}];
wsCmd['!freeze'] = { xSplit: 0, ySplit: 1 };
XLSX.utils.book_append_sheet(wb, wsCmd, 'Bon de commande');
const wsArt = XLSX.utils.aoa_to_sheet([['Articles'], ...articleNames.map(n=>[n])]);
wsArt['!cols'] = [{wch:30}];
XLSX.utils.book_append_sheet(wb, wsArt, 'Articles');
const wbArray = XLSX.write(wb, { bookType:'xlsx', type:'array' });
const zip = await JSZip.loadAsync(wbArray);
const sheetPath = 'xl/worksheets/sheet1.xml';
const sheetFile = zip.file(sheetPath);
if (sheetFile) {
let xml = await sheetFile.async('string');
const lastRow = aoa.length;
const dv = `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Article invalide" error="Choisissez un article dans la liste." sqref="C2:C${lastRow}"><formula1>Articles!$A$2:$A$${articleNames.length+1}</formula1></dataValidation></dataValidations>`;
if (xml.includes('<pageMargins')) xml = xml.replace('<pageMargins', dv + '<pageMargins');
else if (xml.includes('</worksheet>')) xml = xml.replace('</worksheet>', dv + '</worksheet>');
zip.file(sheetPath, xml);
}
const outBlob = await zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
const a = document.createElement('a');
a.href = URL.createObjectURL(outBlob);
a.download = cmd ? `${state.appName}_bon_commande_${cmd.numero}_${today()}.xlsx` : `${state.appName}_bon_commande_modele_${today()}.xlsx`;
a.click();
showToast('✓ Export Excel avec liste déroulante des articles');
} catch(err) {
showToast('⚠ Erreur export Excel : '+err.message,'var(--red)');
}
}
