// ============================================================
// NODAS HUB — module: articles.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function saveArticle() {
const editId = document.getElementById('art-edit-id').value;
const designation = document.getElementById('art-designation').value.trim();
if (!designation) { showToast('⚠ Désignation obligatoire','#f66'); return; }
const categorie = document.getElementById('art-categorie').value;
const unite = document.getElementById('art-unite').value;
const stock_min = parseFloat(document.getElementById('art-stock-min').value) || 0;
const prix_achat = parseFloat(document.getElementById('art-prix-achat').value) || 0;
const prix_vente = parseFloat(document.getElementById('art-prix-vente').value) || 0;
const code_barre = document.getElementById('art-code-barre').value.trim();
if (code_barre) {
const dup = state.articles.find(a => a.code_barre===code_barre && String(a.id)!==editId);
if (dup) { showToast('⚠ Ce code est déjà associé à : '+dup.designation, '#f66'); return; }
}
if (editId) {
const art = state.articles.find(a => String(a.id)===editId);
if (art) { art.designation=designation; art.categorie=categorie; art.unite=unite; art.stock_min=stock_min; art.prix_achat=prix_achat; art.prix_vente=prix_vente; art.code_barre=code_barre; }
logActivity('article_edit', 'Article modifié : '+designation);
showToast('✓ Article modifié : '+designation);
} else {
if (state.articles.find(a => a.designation.toLowerCase()===designation.toLowerCase())) { showToast('⚠ Cet article existe déjà','#f66'); return; }
const stock_initial = parseFloat(document.getElementById('art-stock-initial').value) || 0;
const newArt = { id:Date.now(), designation, categorie, unite, stock_min, prix_achat, prix_vente, code_barre, total_entrant:stock_initial, total_sortant:0 };
state.articles.push(newArt);
if (stock_initial > 0) {
state.purchases.push({ date:today(), article:designation, quantite:stock_initial, prix_ttc:prix_achat||0, total:(prix_achat||0)*stock_initial, fournisseur:'', facture:'STOCK INITIAL', categorie:categorie||'' });
}
showToast('✓ Article créé : '+designation+(stock_initial>0?' (stock initial: '+fmt(stock_initial)+')':''));
logActivity('article_create', 'Article créé : '+designation);
}
saveState(['articles','purchases']); closeModal('modal-article'); renderArticles(); populateArticleFilters();
}

function editArticle(id) {
const art = state.articles.find(a => a.id===id);
if (!art) return;
populateSelects();
document.getElementById('art-edit-id').value = id;
document.getElementById('art-designation').value = art.designation;
document.getElementById('art-categorie').value = art.categorie || '';
document.getElementById('art-unite').value = art.unite || '';
document.getElementById('art-stock-min').value = art.stock_min || 0;
document.getElementById('art-prix-achat').value = art.prix_achat || '';
document.getElementById('art-prix-vente').value = art.prix_vente || '';
document.getElementById('art-code-barre').value = art.code_barre || '';
updateMargePreview();
document.getElementById('modal-article-title').textContent = '✏ Modifier l\'article';
document.getElementById('art-save-btn').textContent = 'Enregistrer';
document.getElementById('modal-article').classList.add('open');
}

function deleteArticle(id) {
if (window.isEconome && window.isEconome()) { showToast('⚠ Action réservée à l\'administrateur','var(--red)'); return; }
const art = state.articles.find(a => a.id===id);
if (!art) return;
if (!confirm(`Supprimer "${art.designation}" ? Cette action supprimera aussi ses mouvements.`)) return;
state.articles = state.articles.filter(a => a.id!==id);
state.purchases = state.purchases.filter(p => p.article!==art.designation);
state.sorties = state.sorties.filter(s => s.article!==art.designation);
logActivity('article_delete', 'Article supprimé : '+art.designation);
saveState(['articles','purchases','sorties']); renderArticles(); renderDashboard();
showToast(`🗑 Article supprimé : ${art.designation}`, '#f66');
}

function showHistorique(id) {
const art = state.articles.find(a => a.id===id);
if (!art) return;
window._ficheArtId = id;
const entrees = state.purchases.filter(p=>p.article===art.designation).sort((a,b)=>b.date>a.date?1:-1);
const sorties = state.sorties.filter(s=>s.article===art.designation).sort((a,b)=>b.date>a.date?1:-1);
const stock = getStock(art);
const totalAchats = entrees.reduce((s,e)=>s+(e.total||e.prix_ttc*e.quantite||0),0);
const lastP = entrees[0];
const nbSorties = sorties.length;
const consoMoy = nbSorties>=2 ? (() => {
const days=Math.max(1,Math.round((new Date(sorties[0].date)-new Date(sorties[nbSorties-1].date))/86400000));
return sorties.reduce((s,x)=>s+x.quantite,0)/days;
})() : 0;
const ruptureJ = consoMoy>0 ? Math.floor(stock/consoMoy) : null;
const months=[];
for(let i=11;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
const eM={},sM={};
months.forEach(m=>{eM[m]=0;sM[m]=0;});
entrees.forEach(e=>{const m=e.date?.substring(0,7);if(m&&eM[m]!==undefined)eM[m]+=e.quantite;});
sorties.forEach(s=>{const m=s.date?.substring(0,7);if(m&&sM[m]!==undefined)sM[m]+=s.quantite;});
const maxV=Math.max(1,...months.map(m=>Math.max(eM[m],sM[m])));
const bW=16,gap=3,H=72,svgW=months.length*(bW*2+gap+6);
const bars=months.map((m,i)=>{
const x=i*(bW*2+gap+6),he=Math.round((eM[m]/maxV)*H),hs=Math.round((sM[m]/maxV)*H);
return '<rect x="'+x+'" y="'+(H-he)+'" width="'+bW+'" height="'+he+'" fill="rgba(62,207,142,0.75)" rx="2"/>'
+'<rect x="'+(x+bW+2)+'" y="'+(H-hs)+'" width="'+bW+'" height="'+hs+'" fill="rgba(255,102,102,0.75)" rx="2"/>'
+'<text x="'+(x+bW)+'" y="'+(H+11)+'" text-anchor="middle" font-size="7" fill="var(--text3)">'+m.substring(5)+'</text>';
}).join('');
const sc=stock<=0?'var(--red)':stock<(art.stock_min||0)?'var(--orange)':'var(--green)';
const rc=ruptureJ===null?'var(--text3)':ruptureJ<=7?'var(--red)':ruptureJ<=21?'var(--orange)':'var(--green)';
document.getElementById('hist-title').textContent = art.designation;
document.getElementById('hist-body').innerHTML =
'<div style="padding:18px">'
+'<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px">'
+kpiBox('Stock actuel',fmt(stock)+' '+(art.unite||''),sc)
+kpiBox('Total entré',fmt(art.total_entrant||0),'var(--green)',entrees.length+' achat'+(entrees.length>1?'s':''))
+kpiBox('Total sorti',fmt(art.total_sortant||0),'var(--red)',sorties.length+' sortie'+(sorties.length>1?'s':''))
+kpiBox('Rupture dans',ruptureJ===null?'—':ruptureJ+'j',rc,consoMoy>0?fmt(+consoMoy.toFixed(2))+'/jour':'pas de conso')
+kpiBox('Prix achat',art.prix_achat>0?fmtNum(art.prix_achat)+' F':'—','var(--text2)',art.prix_vente>0?'Vente: '+fmtNum(art.prix_vente)+' F':'')
+kpiBox('Marge',margeLabel(art),margeCouleur(art),'sur prix achat')
+kpiBox('Valeur stock',art.prix_achat>0?fmtNum(Math.round(stock*art.prix_achat))+' F':'—','var(--gold)',fmt(stock)+' × '+fmtNum(art.prix_achat||0))
+'</div>'
+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">'
+(art.categorie?'<span class="badge badge-blue">'+art.categorie+'</span>':'')
+(art.unite?'<span class="badge badge-gray">Unité: '+art.unite+'</span>':'')
+(art.stock_min?'<span class="badge badge-orange">Min: '+fmt(art.stock_min)+'</span>':'')
+(lastP?.fournisseur?'<span class="badge badge-gray">Fourn.: '+lastP.fournisseur+'</span>':'')
+(lastP?.prix_ttc?'<span class="badge badge-gray">Dernier prix: '+fmtNum(lastP.prix_ttc)+' F</span>':'')
+(totalAchats>0?'<span class="badge badge-gray">Total investi: '+fmtNum(Math.round(totalAchats))+' F</span>':'')
+'</div>'
+'<div style="display:flex;align-items:center;gap:10px;background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:18px;border:1px solid var(--border)">'
+'<span style="font-size:12px;color:var(--text3)">📷 Code-barres / QR :</span>'
+'<strong style="font-size:13px">'+(art.code_barre||'Non associé')+'</strong>'
+'<span style="flex:1"></span>'
+'<button class="btn btn-outline btn-sm" onclick="openScanner(function(code){const a=state.articles.find(x=>x.id==='+art.id+');if(a){a.code_barre=code;saveState(\'articles\');showHistorique('+art.id+');showToast(\'✓ Code associé\');}},{mode:\'code_only\'})">Scanner</button>'
+(art.code_barre?'<button class="btn btn-outline btn-sm" onclick="printCodeQR('+art.id+')">🖨 Imprimer QR</button>':'<button class="btn btn-outline btn-sm" onclick="generateInternalCode('+art.id+');showHistorique('+art.id+')">Générer QR interne</button>')
+'</div>'
+'<div style="margin-bottom:18px">'
+'<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Mouvements 12 mois &nbsp;<span style="color:var(--green)">■</span> Entrées &nbsp;<span style="color:var(--red)">■</span> Sorties</div>'
+'<div style="overflow-x:auto"><svg viewBox="0 0 '+svgW+' '+(H+16)+'" width="'+Math.min(svgW,740)+'" height="'+(H+16)+'">'+bars+'</svg></div>'
+'</div>'
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
+'<div><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px">↓ Entrées ('+entrees.length+')</div>'
+'<div style="max-height:200px;overflow-y:auto">'
+(entrees.length?entrees.map(e=>'<div class="hist-item"><div class="hist-dot" style="background:var(--green)"></div><div style="flex:1;min-width:0"><div style="font-size:12px"><strong>+'+fmt(e.quantite)+'</strong> '+(art.unite||'')+' <span style="color:var(--text3);font-size:11px">'+fmtDate(e.date)+'</span></div><div style="font-size:11px;color:var(--text3)">'+(e.fournisseur||'')+' '+(e.prix_ttc>0?'· '+fmtNum(e.prix_ttc)+' F/u':'')+' '+(e.facture?'· '+e.facture:'')+'</div></div></div>').join(''):'<div style="color:var(--text3);font-size:12px;padding:8px">Aucune entrée</div>')
+'</div></div>'
+'<div><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px">↑ Sorties ('+sorties.length+')</div>'
+'<div style="max-height:200px;overflow-y:auto">'
+(sorties.length?sorties.map(s=>'<div class="hist-item"><div class="hist-dot" style="background:var(--red)"></div><div style="flex:1;min-width:0"><div style="font-size:12px"><strong>−'+fmt(s.quantite)+'</strong> '+(art.unite||'')+' <span style="color:var(--text3);font-size:11px">'+fmtDate(s.date)+'</span></div><div style="font-size:11px;color:var(--text3)">'+(s.secteur||'')+'</div></div></div>').join(''):'<div style="color:var(--text3);font-size:12px;padding:8px">Aucune sortie</div>')
+'</div></div></div></div>';
document.getElementById('modal-historique').classList.add('open');
}

function exportFicheArticlePDF() {
const art = state.articles.find(a=>a.id===window._ficheArtId);
if (!art) return;
const entrees = state.purchases.filter(p=>p.article===art.designation).sort((a,b)=>b.date>a.date?1:-1);
const sorties = state.sorties.filter(s=>s.article===art.designation).sort((a,b)=>b.date>a.date?1:-1);
const stock = getStock(art);
const totalAchats = entrees.reduce((s,e)=>s+(e.total||0),0);
const eRows = entrees.map(e=>'<tr><td>'+fmtDate(e.date)+'</td><td>+'+fmt(e.quantite)+'</td><td>'+(e.prix_ttc>0?fmtNum(e.prix_ttc)+' F':'—')+'</td><td>'+(e.total>0?fmtNum(Math.round(e.total))+' F':'—')+'</td><td>'+(e.fournisseur||'—')+'</td><td>'+(e.facture||'—')+'</td></tr>').join('') || '<tr><td colspan="6" style="color:#aaa">Aucune entrée</td></tr>';
const sRows = sorties.map(s=>'<tr><td>'+fmtDate(s.date)+'</td><td>−'+fmt(s.quantite)+'</td><td>'+(s.secteur||'—')+'</td><td>'+(s.categorie||'—')+'</td></tr>').join('') || '<tr><td colspan="4" style="color:#aaa">Aucune sortie</td></tr>';
const w = window.open('','_blank');
w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fiche Article</title>'
+'<style>body{font-family:Arial,sans-serif;margin:30px;color:#333;font-size:13px}'
+'h1{font-size:18px;margin-bottom:4px}h3{margin:20px 0 8px;font-size:14px;border-bottom:2px solid #c9a84c;padding-bottom:4px}'
+'.kpis{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}'
+'.kpi{background:#f9f9f9;border:1px solid #ddd;border-radius:8px;padding:10px 16px;text-align:center;min-width:100px}'
+'.kv{font-size:18px;font-weight:700}.kl{font-size:10px;color:#888;text-transform:uppercase}'
+'table{width:100%;border-collapse:collapse;font-size:12px}'
+'th{background:#f5f0e8;padding:6px 10px;text-align:left;border-bottom:2px solid #c9a84c;font-size:11px}'
+'td{padding:5px 10px;border-bottom:1px solid #eee}tr:nth-child(even){background:#fafafa}'
+'@media print{button{display:none}}</style></head><body>'
+'<h1>'+art.designation+'</h1>'
+'<p style="color:#888;font-size:11px">'+state.appName+' · '+new Date().toLocaleDateString('fr-FR')+' · NODAS HUB</p>'
+'<div class="kpis">'
+'<div class="kpi"><div class="kl">Stock</div><div class="kv">'+fmt(stock)+' '+(art.unite||'')+'</div></div>'
+'<div class="kpi"><div class="kl">Total entré</div><div class="kv" style="color:#2ca">'+fmt(art.total_entrant||0)+'</div></div>'
+'<div class="kpi"><div class="kl">Total sorti</div><div class="kv" style="color:#e55">'+fmt(art.total_sortant||0)+'</div></div>'
+'<div class="kpi"><div class="kl">Total investi</div><div class="kv">'+fmtNum(Math.round(totalAchats))+' F</div></div>'
+'<div class="kpi"><div class="kl">Stock min</div><div class="kv">'+fmt(art.stock_min||0)+'</div></div>'
+'</div>'
+'<h3>Entrées ('+entrees.length+')</h3>'
+'<table><thead><tr><th>Date</th><th>Qté</th><th>Prix TTC</th><th>Total</th><th>Fournisseur</th><th>Facture</th></tr></thead><tbody>'+eRows+'</tbody></table>'
+'<h3>Sorties ('+sorties.length+')</h3>'
+'<table><thead><tr><th>Date</th><th>Qté</th><th>Secteur</th><th>Catégorie</th></tr></thead><tbody>'+sRows+'</tbody></table>'
+'<p style="margin-top:30px;font-size:11px;color:#999">Catégorie: '+(art.categorie||'—')+' · Unité: '+(art.unite||'—')+'</p>'
+'</body></html>');
w.document.close();
setTimeout(()=>w.print(),400);
}

function populateArticleFilters() {
const sel = document.getElementById('filter-categorie');
const curr = sel.value;
sel.innerHTML = '<option value="">Toutes catégories</option>' + allCategories().map(c=>`<option value="${c}"${c===curr?' selected':''}>${c}</option>`).join('');
}

function renderArticles() {
const q = document.getElementById('search-articles').value.toLowerCase();
const cat = document.getElementById('filter-categorie').value;
const statut = document.getElementById('filter-statut').value;
let filtered = state.articles.filter(a => {
if (q && !a.designation.toLowerCase().includes(q) && !(a.categorie||'').toLowerCase().includes(q)) return false;
if (cat && a.categorie !== cat) return false;
const s = getStock(a);
if (statut==='alerte' && !(a.stock_min>0&&s<a.stock_min&&s>0)) return false;
if (statut==='ok' && !(s>0&&!(a.stock_min>0&&s<a.stock_min))) return false;
if (statut==='vide' && s>0) return false;
return true;
});
const total = filtered.length;
const pages = Math.ceil(total/state.ROWS_PER_PAGE)||1;
state.articlePage = Math.min(state.articlePage, pages);
const start = (state.articlePage-1)*state.ROWS_PER_PAGE;
const rows = filtered.slice(start, start+state.ROWS_PER_PAGE);
document.getElementById('articles-count-label').textContent = `${total} article${total>1?'s':''}`;
document.getElementById('articles-info').textContent = total ? `${start+1}–${Math.min(start+state.ROWS_PER_PAGE,total)} sur ${total}` : '0 résultat';
document.getElementById('articles-tbody').innerHTML = rows.map(a => {
const s = getStock(a);
const pct = a.stock_min>0 ? Math.min(s/a.stock_min*100,100) : 100;
const barColor = s<=0?'var(--red)':(a.stock_min>0&&s<a.stock_min?'var(--orange)':'var(--green)');
return `<tr>
<td><strong>${a.designation}</strong></td>
<td><span class="badge badge-gray">${a.categorie||'—'}</span></td>
<td style="color:var(--text3)">${a.unite||'—'}</td>
<td>${fmt(a.stock_min)}</td>
<td style="color:var(--text2)">${a.prix_achat>0?fmtNum(a.prix_achat)+' F':'—'}</td>
<td style="color:var(--text2)">${a.prix_vente>0?fmtNum(a.prix_vente)+' F':'—'}</td>
<td style="color:${margeCouleur(a)}">${margeLabel(a)}</td>
<td>
<div style="display:flex;align-items:center;gap:8px">
<span style="font-weight:600;min-width:30px">${fmt(s)}</span>
<div class="stock-bar-wrap"><div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:${barColor}"></div></div></div>
</div>
</td>
<td>${stockBadge(a)}</td>
<td style="white-space:nowrap">
<button class="btn btn-outline btn-sm" onclick="showHistorique(${a.id})" title="Historique">📋</button>
<button class="btn btn-outline btn-sm" onclick="openEntreeForArticle('${a.designation.replace(/'/g,"\\'")}')">+ Entrée</button>
<button class="btn btn-outline btn-sm admin-only-action" onclick="openCorrection(${a.id})" title="Corriger le stock">⚖</button>
<button class="btn btn-outline btn-sm" onclick="editArticle(${a.id})">✏</button>
<button class="btn btn-danger btn-sm" onclick="deleteArticle(${a.id})">🗑</button>
</td>
</tr>`;
}).join('') || '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text3)">Aucun article trouvé</td></tr>';
renderPagination('articles-pages', state.articlePage, pages, 'articlePage', 'renderArticles');
}

function openEntreeForArticle(name) {
openModal('modal-entree');
setTimeout(() => { const el=document.getElementById('entree-article'); if(el) el.value=name; }, 50);
}

function updateMargePreview() { const pa = parseFloat(document.getElementById('art-prix-achat')?.value) || 0; const pv = parseFloat(document.getElementById('art-prix-vente')?.value) || 0; const el = document.getElementById('art-marge-preview'); if (!el) return; if (pa>0 && pv>0) { const m = Math.round((pv-pa)/pa*100); el.innerHTML = 'Marge : <strong style="color:'+(m>=20?'var(--green)':m>0?'var(--orange)':'var(--red)')+'">'+m+'%</strong>' +' &nbsp;·&nbsp; Bénéfice : <strong>'+fmtNum(pv-pa)+' FCFA</strong>'; } else { el.textContent = ''; }
}

document.addEventListener('input', e => {
if (e.target.id==='art-prix-achat'||e.target.id==='art-prix-vente') updateMargePreview();
if (e.target.id === 'correction-qte') updateCorrectionPreview();
});
