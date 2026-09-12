// ============================================================
// NODAS HUB — module: dashboard.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function renderAujourdhui() {
const todayStr = today();
const dateLbl = document.getElementById('aj-date-label');
if (dateLbl) dateLbl.textContent = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
const receptions = (state.commandes||[]).filter(c => c.statut==='commande' || c.statut==='partiel').sort((a,b) => {
const da = a.date_livraison_prevue || '9999-99-99';
const db = b.date_livraison_prevue || '9999-99-99';
return da<db?-1:da>db?1:0;
});
const enRetard = receptions.filter(c => c.date_livraison_prevue && c.date_livraison_prevue < todayStr);
const aujourdhuiRecept = receptions.filter(c => c.date_livraison_prevue === todayStr);
const alertes = state.articles.filter(a => { const s=getStock(a); return s<=0||(a.stock_min>0&&s<a.stock_min); }).sort((a,b)=>getStock(a)-getStock(b));
const epuises = alertes.filter(a=>getStock(a)<=0);
const seuilPrix = 15;
const dateLimite = new Date(); dateLimite.setDate(dateLimite.getDate()-30);
const dateLimiteStr = dateLimite.toISOString().split('T')[0];
const hausses = computeHistoriquePrixData().filter(d => d.variation!==null && d.variation>=seuilPrix && d.derniereDate>=dateLimiteStr);
const ventesJour = (state.ventes||[]).filter(v=>v.date===todayStr);
const caJour = ventesJour.filter(v=>v.statut==='vendu').reduce((s,v)=>s+(v.total||0),0);
const kpiEl = document.getElementById('aj-kpi');
if (kpiEl) kpiEl.innerHTML = `
<div class="kpi ${enRetard.length?'red':'blue'}"><div class="kpi-label">Réceptions attendues</div><div class="kpi-value">${receptions.length}</div><div class="kpi-sub">${enRetard.length?enRetard.length+' en retard':'aucune en retard'}</div><div class="kpi-icon">📥</div></div>
<div class="kpi ${epuises.length?'red':'orange'}"><div class="kpi-label">Stocks critiques</div><div class="kpi-value">${alertes.length}</div><div class="kpi-sub">${epuises.length} épuisé${epuises.length>1?'s':''}</div><div class="kpi-icon">⚠</div></div>
<div class="kpi orange"><div class="kpi-label">Hausses de prix</div><div class="kpi-value">${hausses.length}</div><div class="kpi-sub">≥ ${seuilPrix}% · 30 derniers jours</div><div class="kpi-icon">📈</div></div>
<div class="kpi green"><div class="kpi-label">CA du jour</div><div class="kpi-value" style="font-size:20px">${fmtNum(Math.round(caJour))}</div><div class="kpi-sub">FCFA · ${ventesJour.length} vente(s)</div><div class="kpi-icon">💰</div></div>`;
const recEl = document.getElementById('aj-receptions');
if (recEl) recEl.innerHTML = receptions.length ? `<table><tbody>` + receptions.slice(0,8).map(c => {
const late = c.date_livraison_prevue && c.date_livraison_prevue < todayStr;
const isToday = c.date_livraison_prevue === todayStr;
return `<tr>
<td><strong>${c.numero}</strong><div style="font-size:11px;color:var(--text3)">${c.fournisseur||'—'}</div></td>
<td style="text-align:right;font-size:12px;color:${late?'var(--red)':isToday?'var(--orange)':'var(--text3)'}">${c.date_livraison_prevue?fmtDate(c.date_livraison_prevue):'Non planifiée'}${late?' ⚠':''}</td>
<td style="text-align:right"><button class="btn btn-outline btn-sm" onclick="openReception('${c.id}')">📥</button></td>
</tr>`;
}).join('') + `</tbody></table>` : '<div class="empty"><div class="empty-icon">✓</div><div class="empty-text">Aucune réception en attente</div></div>';
const stEl = document.getElementById('aj-stocks');
if (stEl) stEl.innerHTML = alertes.length ? `<table><tbody>` + alertes.slice(0,8).map(a => {
const s = getStock(a);
return `<tr>
<td><strong>${a.designation}</strong></td>
<td style="text-align:right;color:${s<=0?'var(--red)':'var(--orange)'};font-weight:600">${fmt(s)} ${a.unite||''}</td>
<td style="text-align:right"><button class="btn btn-outline btn-sm" onclick="openEntreeForArticle('${a.designation.replace(/'/g,"\\'")}')">+ Entrée</button></td>
</tr>`;
}).join('') + `</tbody></table>` : '<div class="empty"><div class="empty-icon">✓</div><div class="empty-text">Aucune alerte de stock</div></div>';
const taches = [];
enRetard.forEach(c => taches.push({ level:'urgent', text:`Bon de commande ${c.numero} (${c.fournisseur||'—'}) en retard de livraison`, action:()=>openReception(c.id), actionLabel:'Réceptionner' }));
epuises.slice(0,5).forEach(a => taches.push({ level:'urgent', text:`${a.designation} en rupture de stock`, action:()=>openEntreeForArticle(a.designation), actionLabel:'+ Entrée' }));
aujourdhuiRecept.forEach(c => taches.push({ level:'normal', text:`Réception prévue aujourd'hui : ${c.numero} (${c.fournisseur||'—'})`, action:()=>openReception(c.id), actionLabel:'Réceptionner' }));
hausses.slice(0,5).forEach(d => taches.push({ level:'normal', text:`Hausse de prix : ${d.article} chez ${d.fournisseur} (${d.variation>=0?'+':''}${d.variation.toFixed(1)}%)`, action:()=>showPage('historiqueprix'), actionLabel:'Voir' }));
const tachesEl = document.getElementById('aj-taches');
if (tachesEl) tachesEl.innerHTML = taches.length ? taches.map((t,i) => `
<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(46,46,52,0.4)">
<span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${t.level==='urgent'?'var(--red)':'var(--orange)'}"></span>
<span style="flex:1;font-size:13px">${t.text}</span>
<button class="btn btn-outline btn-sm" onclick="ajTacheAction(${i})">${t.actionLabel}</button>
</div>`).join('') : '<div class="empty"><div class="empty-icon">🎉</div><div class="empty-text">Aucune tâche prioritaire — tout est sous contrôle</div></div>';
window._ajTaches = taches;
}

function ajTacheAction(i) {
const t = window._ajTaches && window._ajTaches[i];
if (t && t.action) t.action();
}

function renderDashboard() {
const alertes = state.articles.filter(a => { const s=getStock(a); return s<=0||(a.stock_min>0&&s<a.stock_min); });
document.getElementById('kpi-total').textContent = state.articles.length;
document.getElementById('kpi-ok').textContent = state.articles.length - alertes.length;
document.getElementById('kpi-alerte').textContent = alertes.length;
document.getElementById('kpi-mouvements').textContent = state.purchases.length + state.sorties.length;
const b=document.getElementById('alert-badge');b.textContent=alertes.length;b.style.display=alertes.length?'inline':'none';
let valeur = 0;
state.articles.forEach(a => {
const s = getStock(a);
if (s > 0) {
if (a.prix_achat>0) { valeur += s*a.prix_achat; } else { const lp=[...state.purchases].filter(p=>p.article===a.designation&&p.prix_ttc>0).sort((x,y)=>y.date>x.date?1:-1)[0]; if(lp) valeur+=s*lp.prix_ttc; }
}
});
document.getElementById('kpi-valeur').textContent = valeur > 0 ? fmtNum(Math.round(valeur)) : '—';
const sortieMap = {};
state.sorties.forEach(s => { sortieMap[s.article] = (sortieMap[s.article]||0) + s.quantite; });
const top = Object.entries(sortieMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
const maxS = top[0]?.[1]||1;
document.getElementById('chart-sorties').innerHTML = top.length ? top.map(([name,qty])=>`
<div class="chart-bar-row">
<div class="chart-bar-label" title="${name}">${name}</div>
<div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${(qty/maxS*100).toFixed(1)}%;background:var(--gold)"></div></div>
<div class="chart-bar-val">${fmt(qty)}</div>
</div>`).join('') : '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Aucune sortie enregistrée</div></div>';
document.getElementById('dash-alertes').innerHTML = alertes.slice(0,5).map(a=>{
const s=getStock(a);
return `<tr><td><strong>${a.designation}</strong></td><td style="color:${s<=0?'var(--red)':'var(--orange)'}"><b>${fmt(s)}</b></td><td>${fmt(a.stock_min)}</td><td>${stockBadge(a)}</td></tr>`;
}).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text3)">✓ Aucune alerte</td></tr>';
const mouvs = [
...state.purchases.map(p=>({date:p.date,type:'entree',article:p.article,qte:p.quantite,cat:p.categorie,detail:p.fournisseur||''})),
...state.sorties.map(s=>({date:s.date,type:'sortie',article:s.article,qte:s.quantite,cat:s.categorie,detail:s.secteur||''}))
].sort((a,b)=>b.date>a.date?1:-1).slice(0,15);
document.getElementById('dash-mouvements').innerHTML = mouvs.map(m=>`<tr>
<td>${fmtDate(m.date)}</td>
<td><span class="badge ${m.type==='entree'?'badge-green':'badge-red'}">${m.type==='entree'?'↓ Entrée':'↑ Sortie'}</span></td>
<td><strong>${m.article}</strong></td>
<td style="color:${m.type==='entree'?'var(--green)':'var(--red)'};font-weight:600">${m.type==='entree'?'+':'-'}${fmt(m.qte)}</td>
<td>${m.cat?`<span class="badge badge-gray">${m.cat}</span>`:'—'}</td>
<td style="color:var(--text3);font-size:12px">${m.detail||'—'}</td>
</tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3)">Aucun mouvement</td></tr>';
}

function renderAlertes() {
const q = (document.getElementById('search-alertes')?.value||'').toLowerCase();
const catF = document.getElementById('filter-alertes-cat')?.value||'';
const statF = document.getElementById('filter-alertes-statut')?.value||'';
const catSel = document.getElementById('filter-alertes-cat');
if (catSel) {
const curr = catSel.value;
const cats = allCategories();
catSel.innerHTML = '<option value="">Toutes catégories</option>' + cats.map(c=>`<option value="${c}"${c===curr?' selected':''}>${c}</option>`).join('');
}
const allAlertes = state.articles.filter(a => { const s=getStock(a); return s<=0||(a.stock_min>0&&s<a.stock_min); });
document.getElementById('alert-badge').textContent = allAlertes.length;
document.getElementById('alert-badge').style.display = allAlertes.length ? 'inline' : 'none';
const epuises = allAlertes.filter(a=>getStock(a)<=0).length;
const critiques = allAlertes.filter(a=>{const s=getStock(a);return s>0&&a.stock_min>0&&s<a.stock_min;}).length;
const totalManque = allAlertes.reduce((acc,a)=>acc+Math.max(0,(a.stock_min||0)-getStock(a)),0);
const kpi = document.getElementById('alertes-kpi');
if (kpi) kpi.innerHTML = `
<div class="analyse-kpi"><div class="analyse-kpi-label">Total alertes</div><div class="analyse-kpi-val" style="color:var(--red)">${allAlertes.length}</div><div class="analyse-kpi-sub">articles à réapprovisionner</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Épuisés</div><div class="analyse-kpi-val" style="color:var(--red)">${epuises}</div><div class="analyse-kpi-sub">stock zéro</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">En dessous du min</div><div class="analyse-kpi-val" style="color:var(--orange)">${critiques}</div><div class="analyse-kpi-sub">stock insuffisant</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Unités manquantes</div><div class="analyse-kpi-val" style="color:var(--text2);font-size:20px">${fmt(Math.round(totalManque))}</div><div class="analyse-kpi-sub">total à commander</div></div>`;
const sub = document.getElementById('alertes-sub');
if (sub) sub.textContent = `${allAlertes.length} article${allAlertes.length>1?'s':''} nécessitant un réapprovisionnement`;
const filtered = allAlertes.filter(a => {
const s=getStock(a);
if (q && !a.designation.toLowerCase().includes(q)) return false;
if (catF && a.categorie!==catF) return false;
if (statF==='epuise' && s>0) return false;
if (statF==='critique' && s<=0) return false;
return true;
}).sort((a,b)=>getStock(a)-getStock(b));
document.getElementById('alertes-tbody').innerHTML = filtered.length ? filtered.map(a => {
const s=getStock(a); const manque=Math.max(0,(a.stock_min||0)-s);
const lastP=[...state.purchases].filter(p=>p.article===a.designation).sort((x,y)=>y.date>x.date?1:-1)[0];
const fourn=lastP?.fournisseur||'—';
return `<tr>
<td><strong>${a.designation}</strong></td>
<td><span class="badge badge-gray">${a.categorie||'—'}</span></td>
<td style="color:${s<=0?'var(--red)':'var(--orange)'};font-weight:700">${fmt(s)} <span style="font-size:11px;font-weight:400">${a.unite||''}</span></td>
<td>${fmt(a.stock_min||0)} ${a.unite||''}</td>
<td style="color:var(--red);font-weight:600">${manque>0?'+ '+fmt(manque)+' '+(a.unite||''):'—'}</td>
<td style="font-size:12px;color:var(--text3)">${fourn}</td>
<td style="color:var(--gold);font-size:12px">${a.prix_achat>0?fmtNum(Math.round(s*a.prix_achat))+' F':'—'}</td>
<td>${stockBadge(a)}</td>
<td style="display:flex;gap:6px">
<button class="btn btn-outline btn-sm" onclick="openEntreeForArticle('${a.designation.replace(/'/g,"\\'")}')">+ Entrée</button>
<button class="btn btn-outline btn-sm admin-only-action" onclick="openCorrection(${a.id})">⚖</button>
</td></tr>`;
}).join('') : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)">✓ Aucune alerte${q||catF||statF?' pour ce filtre':''}</td></tr>`;
}

function showListeCourses() {
const alertes = state.articles.filter(a=>{const s=getStock(a);return s<=0||(a.stock_min>0&&s<a.stock_min);})
.sort((a,b)=>a.categorie.localeCompare(b.categorie)||a.designation.localeCompare(b.designation));
if (!alertes.length){showToast('✓ Aucun article en alerte — stock OK !','var(--green)');return;}
const groups={};
alertes.forEach(a=>{
const cat=a.categorie||'Divers'; if(!groups[cat])groups[cat]=[];
const s=getStock(a); const manque=Math.max(0,(a.stock_min||0)-s);
const lastP=[...state.purchases].filter(p=>p.article===a.designation).sort((x,y)=>y.date>x.date?1:-1)[0];
groups[cat].push({a,s,manque,fourn:lastP?.fournisseur||'',prixRef:lastP?.prix_ttc||0});
});
let html=Object.entries(groups).map(([cat,items])=>`
<div class="lc-group">
<div class="lc-group-title">📦 ${cat} <span style="font-weight:400;color:var(--text3)">(${items.length} article${items.length>1?'s':''})</span></div>
${items.map(it=>`<div class="lc-row" id="lcrow-${it.a.id}" data-article="${it.a.designation.replace(/"/g,'&quot;')}" data-fournisseur="${(it.fourn||'').replace(/"/g,'&quot;')}" data-prix="${it.prixRef||0}" data-unite="${(it.a.unite||'').replace(/"/g,'&quot;')}">
<input type="checkbox" class="lc-check" onchange="this.closest('.lc-row').classList.toggle('checked',this.checked)">
<span class="lc-nom">${it.a.designation}</span>
<span class="lc-manque">${it.s<=0?'ÉPUISÉ':'−'+fmt(it.manque)}</span>
<input type="number" class="lc-qte" id="lcqte-${it.a.id}" value="${Math.max(it.manque,it.a.stock_min||1)}" min="0" step="0.1">
<span class="lc-unite">${it.a.unite||'u.'}</span>
<span class="lc-fourn">${it.fourn||'—'}</span>
${it.prixRef>0?`<span style="font-size:11px;color:var(--text3);min-width:90px;text-align:right">Réf: ${fmtNum(it.prixRef)} F</span>`:''}
</div>`).join('')}
</div>`).join('');
document.getElementById('liste-courses-body').innerHTML=html;
document.getElementById('liste-courses-date').textContent=`Générée le ${new Date().toLocaleDateString('fr-FR')}`;
document.getElementById('liste-courses-card').style.display='block';
document.getElementById('liste-courses-card').scrollIntoView({behavior:'smooth',block:'start'});
}

function exportListeCourses(format) {
const alertes=state.articles.filter(a=>{const s=getStock(a);return s<=0||(a.stock_min>0&&s<a.stock_min);});
if(!alertes.length){showToast('Aucun article en alerte','var(--orange)');return;}
if(format==='csv'){
const rows=alertes.map(a=>{
const s=getStock(a);const manque=Math.max(0,(a.stock_min||0)-s);
const qi=document.getElementById('lcqte-'+a.id);const qc=qi?parseFloat(qi.value)||manque:manque;
const lp=[...state.purchases].filter(p=>p.article===a.designation).sort((x,y)=>y.date>x.date?1:-1)[0];
return `"${a.designation}","${a.categorie||''}","${fmt(s)}","${a.unite||''}","${fmt(manque)}","${fmt(qc)}","${lp?.fournisseur||''}","${lp?.prix_ttc||''}"`;
});
const csv='\uFEFF'+'Article,Catégorie,Stock actuel,Unité,Manque,Qté à commander,Dernier fournisseur,Prix référence\n'+rows.join('\n');
const el=document.createElement('a');el.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
el.download=`liste_courses_${today()}.csv`;el.click();
showToast('✓ Liste de courses exportée en CSV');return;
}
if(format==='xlsx'){
const header=['Article','Catégorie','Stock actuel','Unité','Manque','Qté à commander','Dernier fournisseur','Prix référence'];
const aoa=[header];
alertes.forEach(a=>{
const s=getStock(a);const manque=Math.max(0,(a.stock_min||0)-s);
const qi=document.getElementById('lcqte-'+a.id);const qc=qi?parseFloat(qi.value)||manque:manque;
const lp=[...state.purchases].filter(p=>p.article===a.designation).sort((x,y)=>y.date>x.date?1:-1)[0];
aoa.push([a.designation, a.categorie||'', s, a.unite||'', manque, qc, lp?.fournisseur||'', lp?.prix_ttc||'']);
});
try {
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(aoa);
ws['!cols'] = header.map(()=>({wch:20}));
ws['!freeze'] = { xSplit: 0, ySplit: 1 };
XLSX.utils.book_append_sheet(wb, ws, 'Liste de courses');
XLSX.writeFile(wb, `${state.appName}_liste_courses_${today()}.xlsx`);
showToast('✓ Liste de courses exportée en Excel');
} catch(err) {
showToast('⚠ Erreur export Excel : '+err.message,'var(--red)');
}
return;
}
if(format==='pdf'){
const groups={};
alertes.forEach(a=>{
const cat=a.categorie||'Divers';if(!groups[cat])groups[cat]=[];
const s=getStock(a);const manque=Math.max(0,(a.stock_min||0)-s);
const qi=document.getElementById('lcqte-'+a.id);const qc=qi?parseFloat(qi.value)||manque:manque;
const lp=[...state.purchases].filter(p=>p.article===a.designation).sort((x,y)=>y.date>x.date?1:-1)[0];
groups[cat].push({a,s,manque,qc,fourn:lp?.fournisseur||'',prix:lp?.prix_ttc||0});
});
const dateStr=new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
const gHtml=Object.entries(groups).map(([cat,items])=>`
<div style="margin-bottom:20px">
<div style="background:#f5f0e8;padding:6px 12px;font-weight:700;font-size:13px;border-left:4px solid #c9a84c;margin-bottom:8px">${cat}</div>
<table style="width:100%;border-collapse:collapse;font-size:12px">
<thead><tr style="background:#f9f9f9">
<th style="padding:6px;border-bottom:1px solid #ddd;width:24px">☐</th>
<th style="padding:6px;text-align:left;border-bottom:1px solid #ddd">Article</th>
<th style="padding:6px;text-align:right;border-bottom:1px solid #ddd">Stock</th>
<th style="padding:6px;text-align:right;border-bottom:1px solid #ddd">À commander</th>
<th style="padding:6px;text-align:left;border-bottom:1px solid #ddd">Unité</th>
<th style="padding:6px;text-align:left;border-bottom:1px solid #ddd">Fournisseur</th>
<th style="padding:6px;text-align:right;border-bottom:1px solid #ddd">Prix réf.</th>
</tr></thead>
<tbody>${items.map((it,i)=>`<tr style="background:${i%2?'#fafafa':'white'}">
<td style="padding:6px;border-bottom:1px solid #eee;text-align:center">☐</td>
<td style="padding:6px;border-bottom:1px solid #eee;font-weight:500">${it.a.designation}</td>
<td style="padding:6px;border-bottom:1px solid #eee;text-align:right;color:${it.s<=0?'#e53':'#e67e22'}">${fmt(it.s)}</td>
<td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${fmt(it.qc)}</td>
<td style="padding:6px;border-bottom:1px solid #eee;color:#888">${it.a.unite||'u.'}</td>
<td style="padding:6px;border-bottom:1px solid #eee;color:#666;font-style:italic">${it.fourn||'—'}</td>
<td style="padding:6px;border-bottom:1px solid #eee;text-align:right;color:#888">${it.prix>0?fmtNum(it.prix)+' F':'—'}</td>
</tr>`).join('')}</tbody>
</table>
</div>`).join('');
const win=window.open('','_blank','width=900,height=700');
win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liste de courses</title>
<style>body{font-family:Arial,sans-serif;margin:30px;color:#333}@media print{button{display:none}}</style></head>
<body><h2>🛒 Liste de courses — ${state.appName}</h2>
<p style="color:#888;font-size:12px">Générée le ${dateStr} · ${alertes.length} article${alertes.length>1?'s':''}</p>
${gHtml}
<div style="margin-top:30px;border-top:2px solid #333;padding-top:16px;font-size:12px;color:#666">
<strong>Signature :</strong> _________________ &nbsp;&nbsp;
<strong>Date :</strong> _________________ &nbsp;&nbsp;
<strong>Total estimé :</strong> _________________
</div>
<script>window.onload=()=>window.print()<\/script></body></html>`);
win.document.close();
}
}

function creerCommandesDepuisListeCourses() {
const rows = document.querySelectorAll('#liste-courses-body .lc-row:not(.checked)');
if (!rows.length) { showToast('⚠ Aucun article à commander (tout est coché)','var(--orange)'); return; }
const groups = {};
rows.forEach(row => {
const article = row.dataset.article;
const fournisseur = row.dataset.fournisseur || '';
const prix = parseFloat(row.dataset.prix)||0;
const unite = row.dataset.unite || '';
const qteInput = row.querySelector('.lc-qte');
const qte = parseFloat(qteInput?.value)||0;
if (!article || qte<=0) return;
const key = fournisseur || '__sans_fournisseur__';
if (!groups[key]) groups[key] = { fournisseur, lignes: [] };
groups[key].lignes.push({ article, quantite_commandee: qte, quantite_recue: 0, prix_unitaire_estime: prix, unite });
});
const keys = Object.keys(groups);
if (!keys.length) { showToast('⚠ Aucune quantité valide à commander','var(--orange)'); return; }
let nb = 0, sansFournisseur = 0;
keys.forEach(key => {
const g = groups[key];
const numero = cmdGenerateNumero();
const total = g.lignes.reduce((s,l)=>s+l.quantite_commandee*l.prix_unitaire_estime,0);
state.commandes.push({ id:'cmd-'+Date.now()+Math.random().toString(36).slice(2,5), numero, date: today(), fournisseur: g.fournisseur, lignes: g.lignes, statut:'commande', note: 'Généré depuis la liste de courses', montant_estime: total });
nb++;
if (!g.fournisseur) sansFournisseur++;
});
saveState('commandes');
showToast(`✓ ${nb} bon${nb>1?'s':''} de commande créé${nb>1?'s':''}`+(sansFournisseur?` (dont ${sansFournisseur} sans fournisseur assigné, à compléter)`:''));
showPage('commandes');
}
