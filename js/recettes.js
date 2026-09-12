// ============================================================
// NODAS HUB — module: recettes.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function renderRecettes() {
const q = (document.getElementById('search-recettes')?.value||'').toLowerCase();
const typeF = document.getElementById('filter-recette-type')?.value||'';
const badge = document.getElementById('recette-badge');
if (badge) { badge.textContent = state.recettes.length; badge.style.display = state.recettes.length?'inline':'none'; }
const sub = document.getElementById('recettes-sub');
if (sub) sub.textContent = state.recettes.length+' recette'+(state.recettes.length>1?'s':'')+' enregistrée'+(state.recettes.length>1?'s':'');
const filtered = state.recettes.filter(r => {
if (q && !r.nom.toLowerCase().includes(q)) return false;
if (typeF && r.type !== typeF) return false;
return true;
});
const grid = document.getElementById('recettes-grid');
if (!grid) return;
if (!filtered.length) {
grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text3)">'+(state.recettes.length?'Aucune recette pour ce filtre':'Aucune recette — cliquez sur "+ Nouvelle Recette" pour commencer')+'</div>';
return;
}
grid.innerHTML = filtered.map(r => {
const cout = calcCoutRecette(r);
const pv = r.prix_vente || 0;
const marge = pv > 0 && cout > 0 ? Math.round((pv-cout)/pv*100) : null;
const portionsServies = (state.ventes||[]).filter(v=>v.type==='recette'&&v.nom===r.nom).reduce((acc,v)=>acc+(v.quantite||0),0);
const margeColor = marge===null?'var(--text3)':marge<0?'var(--red)':marge<20?'var(--orange)':'var(--green)';
const typeClass = 'recette-type-'+(r.type||'autre');
return '<div class="recette-card">'
+'<div class="recette-card-header">'
+'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'
+'<strong style="font-size:15px">'+r.nom+'</strong>'
+'<span class="badge '+typeClass+'" style="font-size:10px;padding:3px 8px;border-radius:20px;font-weight:600">'+(r.type||'autre')+'</span>'
+'</div>'
+(r.notes?'<div style="font-size:11px;color:var(--text3)">'+r.notes+'</div>':'')
+'</div>'
+'<div class="recette-card-body">'
+'<div style="font-size:11px;color:var(--text3);margin-bottom:8px">'+((r.ingredients||[]).length)+' ingrédient'+((r.ingredients||[]).length>1?'s':'')+' · '+(r.portions||1)+' portion'+(r.portions>1?'s':'')+'</div>'
+'<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">'
+(r.ingredients||[]).slice(0,4).map(ing=>'<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text2)">'+ing.article+'</span><span style="color:var(--text3)">'+fmt(ing.quantite)+' '+(ing.unite||'')+'</span></div>').join('')
+((r.ingredients||[]).length>4?'<div style="font-size:11px;color:var(--text3)">... et '+((r.ingredients||[]).length-4)+' autres</div>':'')
+'</div>'
+'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding-top:10px;border-top:1px solid var(--border)">'
+'<div style="text-align:center"><div style="font-size:10px;color:var(--text3);margin-bottom:2px">Coût/portion</div><div style="font-size:13px;font-weight:700;color:var(--text)">'+(cout>0?fmtNum(Math.round(cout/(r.portions||1)))+' F':'—')+'</div></div>'
+'<div style="text-align:center"><div style="font-size:10px;color:var(--text3);margin-bottom:2px">Prix vente</div><div style="font-size:13px;font-weight:700;color:var(--text)">'+(pv>0?fmtNum(pv)+' F':'—')+'</div></div>'
+'<div style="text-align:center"><div style="font-size:10px;color:var(--text3);margin-bottom:2px">Marge</div><div style="font-size:13px;font-weight:700;color:'+margeColor+'">'+(marge!==null?marge+'%':'—')+'</div></div>'
+'<div style="text-align:center"><div style="font-size:10px;color:var(--text3);margin-bottom:2px">Portions servies</div><div style="font-size:13px;font-weight:700;color:var(--blue)">'+portionsServies+'</div></div>'
+'</div></div>'
+'<div class="recette-card-footer">'
+'<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();showFicheRecette(\''+r.id+'\')">📄 Fiche</button>'
+'<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();editRecette(\''+r.id+'\')">✏</button>'
+'<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteRecette(\''+r.id+'\')">🗑</button>'
+'</div></div>';
}).join('');
}

function calcCoutRecette(r) {
if (!r.ingredients || !r.ingredients.length) return 0;
return r.ingredients.reduce((total, ing) => {
const art = state.articles.find(a => a.designation === ing.article);
const prixU = art?.prix_achat || 0;
return total + (ing.quantite * prixU);
}, 0);
}

function addIngredientRow(article, quantite, unite) {
const list = document.getElementById('rec-ingredients-list');
if (!list) return;
const id = 'ing-'+Date.now()+Math.random().toString(36).slice(2,6);
const artOptions = state.articles.map(a => '<option value="'+a.designation+'">').join('');
const row = document.createElement('div');
row.className = 'ing-row'; row.id = id;
row.innerHTML = '<input type="text" class="ing-art" list="dl-ing-art" placeholder="Article..." value="'+(article||'')+'" oninput="updateRecetteMarge()" autocomplete="off">'
+'<datalist id="dl-ing-art">'+artOptions+'</datalist>'
+'<input type="number" class="ing-qte" placeholder="Qté" min="0" step="0.001" value="'+(quantite||'')+'" oninput="updateRecetteMarge()">'
+'<input type="text" class="ing-unite" placeholder="unité" value="'+(unite||'')+'">'
+'<span class="ing-cout" id="cout-'+id+'">—</span>'
+'<button class="ing-del" type="button" onclick="document.getElementById(\''+id+'\').remove();updateRecetteMarge()">×</button>';
list.appendChild(row);
updateRecetteMarge();
}

function updateRecetteMarge() {
const pv = parseFloat(document.getElementById('rec-prix-vente')?.value)||0;
const portions = parseInt(document.getElementById('rec-portions')?.value)||1;
let cout = 0;
document.querySelectorAll('#rec-ingredients-list .ing-row').forEach(row => {
const art = row.querySelector('.ing-art')?.value;
const qte = parseFloat(row.querySelector('.ing-qte')?.value)||0;
const a = state.articles.find(x=>x.designation===art);
const prix = a?.prix_achat||0;
const ligneC = qte*prix;
cout += ligneC;
const coutSpan = row.querySelector('[id^="cout-"]');
if (coutSpan) coutSpan.textContent = prix>0?fmtNum(Math.round(ligneC))+' F':'—';
});
const coutPortion = portions>0?cout/portions:cout;
document.getElementById('rec-cout-val').textContent = cout>0?fmtNum(Math.round(coutPortion))+' F/portion':'—';
document.getElementById('rec-pv-val').textContent = pv>0?fmtNum(pv)+' F':'—';
if (pv>0 && cout>0) {
const marge = pv - coutPortion;
const margePct = Math.round(marge/pv*100);
const color = margePct<0?'var(--red)':margePct<20?'var(--orange)':'var(--green)';
document.getElementById('rec-marge-val').innerHTML = '<span style="color:'+color+'">'+fmtNum(Math.round(marge))+' F ('+margePct+'%)</span>';
} else {
document.getElementById('rec-marge-val').textContent = '—';
}
}

function saveRecette() {
const nom = document.getElementById('rec-nom').value.trim();
if (!nom) { showToast('⚠ Nom obligatoire','var(--red)'); return; }
const ingredients = [];
document.querySelectorAll('#rec-ingredients-list .ing-row').forEach(row => {
const article = row.querySelector('.ing-art')?.value.trim();
const quantite = parseFloat(row.querySelector('.ing-qte')?.value)||0;
const unite = row.querySelector('.ing-unite')?.value.trim()||'';
if (article && quantite>0) ingredients.push({ article, quantite, unite });
});
const data = {
nom, type: document.getElementById('rec-type').value,
prix_vente: parseFloat(document.getElementById('rec-prix-vente').value)||0,
portions: parseInt(document.getElementById('rec-portions').value)||1,
notes: document.getElementById('rec-notes').value.trim(),
ingredients
};
const editId = document.getElementById('rec-edit-id').value;
if (editId) {
const idx = state.recettes.findIndex(r=>r.id===editId);
if (idx>=0) { state.recettes[idx] = { ...state.recettes[idx], ...data }; logActivity('recette_edit', 'Recette modifiée : '+nom); showToast('✓ Recette modifiée : '+nom); }
} else {
data.id = 'rec-'+Date.now();
state.recettes.push(data);
logActivity('recette_create', 'Recette créée : '+nom);
showToast('✓ Recette créée : '+nom);
}
saveState('recettes'); closeModal('modal-recette'); renderRecettes();
}

function editRecette(id) {
const r = state.recettes.find(x=>x.id===id);
if (!r) return;
document.getElementById('rec-nom').value = r.nom;
document.getElementById('rec-type').value = r.type||'plat';
document.getElementById('rec-prix-vente').value = r.prix_vente||0;
document.getElementById('rec-portions').value = r.portions||1;
document.getElementById('rec-notes').value = r.notes||'';
document.getElementById('rec-edit-id').value = r.id;
document.getElementById('rec-ingredients-list').innerHTML = '';
(r.ingredients||[]).forEach(ing => addIngredientRow(ing.article, ing.quantite, ing.unite));
document.getElementById('modal-recette-title').textContent = '✏ Modifier : '+r.nom;
updateRecetteMarge();
document.getElementById('modal-recette').classList.add('open');
}

function deleteRecette(id) {
if (window.isEconome && window.isEconome()) { showToast('⚠ Action réservée à l\'administrateur','var(--red)'); return; }
const r = state.recettes.find(x=>x.id===id);
if (!r || !confirm('Supprimer "'+r.nom+'" ?')) return;
state.recettes = state.recettes.filter(x=>x.id!==id);
logActivity('recette_delete', 'Recette supprimée : '+r.nom);
saveState('recettes'); renderRecettes();
showToast('🗑 Recette supprimée');
}

function showFicheRecette(id) {
const r = state.recettes.find(x=>x.id===id);
if (!r) return;
const cout = calcCoutRecette(r);
const coutP = r.portions>0?cout/r.portions:cout;
const pv = r.prix_vente||0;
const marge = pv>0&&cout>0?pv-coutP:null;
const margePct = pv>0&&cout>0?Math.round(marge/pv*100):null;
const mc = margePct===null?'var(--text3)':margePct<0?'var(--red)':margePct<20?'var(--orange)':'var(--green)';
const typeClass = 'recette-type-'+(r.type||'autre');
const w = window.open('','_blank');
const ingRows = (r.ingredients||[]).map(ing => {
const art = state.articles.find(a=>a.designation===ing.article);
const pu = art?.prix_achat||0;
const total = ing.quantite*pu;
return '<tr><td>'+ing.article+'</td><td style="text-align:right">'+fmt(ing.quantite)+'</td><td>'+ing.unite+'</td>'
+'<td style="text-align:right">'+(pu>0?fmtNum(pu)+' F':'—')+'</td>'
+'<td style="text-align:right;font-weight:600">'+(total>0?fmtNum(Math.round(total))+' F':'—')+'</td></tr>';
}).join('');
w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+r.nom+'</title>'
+'<style>body{font-family:Arial,sans-serif;margin:30px;color:#333;font-size:13px}'
+'h1{font-size:20px;margin-bottom:4px}.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}'
+'.kpis{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.kpi{background:#f9f9f9;border:1px solid #ddd;border-radius:8px;padding:10px 16px;text-align:center;min-width:110px}'
+'.kv{font-size:18px;font-weight:700}.kl{font-size:10px;color:#888;text-transform:uppercase;margin-bottom:4px}'
+'table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f5f0e8;padding:7px 10px;text-align:left;border-bottom:2px solid #c9a84c;font-size:11px}'
+'td{padding:6px 10px;border-bottom:1px solid #eee}tr:nth-child(even){background:#fafafa}'
+'.total-row{font-weight:700;background:#f5f0e8!important}'
+'@media print{button{display:none}}</style></head><body>'
+'<h1>'+r.nom+'</h1>'
+'<p style="color:#888;font-size:11px">'+state.appName+' · '+(r.type||'autre')+' · '+new Date().toLocaleDateString('fr-FR')+' · NODAS HUB</p>'
+(r.notes?'<p style="color:#666;font-style:italic">'+r.notes+'</p>':'')
+'<div class="kpis">'
+'<div class="kpi"><div class="kl">Portions</div><div class="kv">'+r.portions+'</div></div>'
+'<div class="kpi"><div class="kl">Coût/portion</div><div class="kv">'+(cout>0?fmtNum(Math.round(coutP))+' F':'—')+'</div></div>'
+'<div class="kpi"><div class="kl">Prix vente</div><div class="kv">'+(pv>0?fmtNum(pv)+' F':'—')+'</div></div>'
+'<div class="kpi"><div class="kl">Marge</div><div class="kv" style="color:'+(mc.replace('var(--red)','#e55').replace('var(--orange)','#e6720a').replace('var(--green)','#2ca'))+'">'+(margePct!==null?margePct+'%':'—')+'</div></div>'
+'<div class="kpi"><div class="kl">Bénéfice/portion</div><div class="kv">'+(marge!==null?fmtNum(Math.round(marge))+' F':'—')+'</div></div>'
+'</div>'
+'<h3 style="margin-top:20px;border-bottom:2px solid #c9a84c;padding-bottom:6px">Ingrédients ('+((r.ingredients||[]).length)+')</h3>'
+'<table><thead><tr><th>Article</th><th style="text-align:right">Quantité</th><th>Unité</th><th style="text-align:right">Prix unitaire</th><th style="text-align:right">Total</th></tr></thead>'
+'<tbody>'+ingRows
+'<tr class="total-row"><td colspan="4" style="text-align:right">Coût total ('+r.portions+' portion'+(r.portions>1?'s':'')+')</td><td style="text-align:right">'+(cout>0?fmtNum(Math.round(cout))+' F':'—')+'</td></tr>'
+'</tbody></table>'
+'</body></html>');
w.document.close();
setTimeout(()=>w.print(),400);
}
