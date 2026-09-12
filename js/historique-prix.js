// ============================================================
// NODAS HUB — module: historique-prix.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

// ===== HISTORIQUE DES PRIX =====
function computeHistoriquePrixData() {
const groups = {};
state.purchases.forEach(p => {
if (!p.article || !p.fournisseur || !(p.prix_ttc>0)) return;
const key = p.article+'|||'+p.fournisseur;
if (!groups[key]) groups[key] = { article:p.article, fournisseur:p.fournisseur, achats: [] };
groups[key].achats.push({ date:p.date, prix:p.prix_ttc });
});
return Object.values(groups).map(g => {
const achats = g.achats.slice().sort((a,b)=>a.date>b.date?1:-1);
const last = achats[achats.length-1];
const prev = achats.length>1 ? achats[achats.length-2] : null;
const variation = prev && prev.prix>0 ? (last.prix-prev.prix)/prev.prix*100 : null;
const prices = achats.map(a=>a.prix);
const moy = prices.reduce((s,p)=>s+p,0)/prices.length;
const min = Math.min(...prices), max = Math.max(...prices);
return { article:g.article, fournisseur:g.fournisseur, achats, dernierPrix:last.prix, prixPrecedent:prev?prev.prix:null, variation, moy, min, max, nbAchats:achats.length, derniereDate:last.date };
});
}

function populateHistoriquePrixFilters() {
const sel = document.getElementById('filter-hp-fournisseur');
if (!sel) return;
const curr = sel.value;
const fourns = [...new Set(state.purchases.map(p=>p.fournisseur).filter(Boolean))].sort();
sel.innerHTML = '<option value="">Tous fournisseurs</option>' + fourns.map(f=>`<option value="${f}"${f===curr?' selected':''}>${f}</option>`).join('');
}

function renderHistoriquePrix() {
const q = (document.getElementById('search-hp')?.value||'').toLowerCase();
const fournF = document.getElementById('filter-hp-fournisseur')?.value||'';
const seuil = parseFloat(document.getElementById('hp-seuil')?.value)||15;
let data = computeHistoriquePrixData().filter(d => {
if (q && !d.article.toLowerCase().includes(q) && !d.fournisseur.toLowerCase().includes(q)) return false;
if (fournF && d.fournisseur !== fournF) return false;
return true;
});
data.forEach(d => d.isAnomaly = d.variation!==null && d.variation >= seuil);
data.sort((a,b) => {
if (a.isAnomaly !== b.isAnomaly) return a.isAnomaly ? -1 : 1;
const av = a.variation===null?-999:a.variation, bv = b.variation===null?-999:b.variation;
return bv - av;
});
const nbAnomalies = data.filter(d=>d.isAnomaly).length;
const nbCombos = data.length;
const nbArticles = new Set(data.map(d=>d.article)).size;
const variations = data.filter(d=>d.variation!==null).map(d=>d.variation);
const variationMoy = variations.length ? variations.reduce((s,v)=>s+v,0)/variations.length : null;
document.getElementById('hp-count-label').textContent = `${nbCombos} couple${nbCombos>1?'s':''} article × fournisseur suivi${nbCombos>1?'s':''}`;
const kpiEl = document.getElementById('hp-kpi');
if (kpiEl) kpiEl.innerHTML = `
<div class="analyse-kpi"><div class="analyse-kpi-label">Articles suivis</div><div class="analyse-kpi-val" style="color:var(--gold)">${nbArticles}</div><div class="analyse-kpi-sub">avec au moins un achat prix connu</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Couples suivis</div><div class="analyse-kpi-val" style="color:var(--blue)">${nbCombos}</div><div class="analyse-kpi-sub">article × fournisseur</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Hausses anormales</div><div class="analyse-kpi-val" style="color:${nbAnomalies>0?'var(--red)':'var(--green)'}">${nbAnomalies}</div><div class="analyse-kpi-sub">≥ ${seuil}% sur le dernier achat</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Variation moyenne</div><div class="analyse-kpi-val" style="color:var(--text2);font-size:20px">${variationMoy!==null?(variationMoy>=0?'+':'')+variationMoy.toFixed(1)+'%':'—'}</div><div class="analyse-kpi-sub">tous couples confondus</div></div>`;
document.getElementById('hp-tbody').innerHTML = data.length ? data.map(d => {
const varColor = d.variation===null?'var(--text3)':d.variation>0?(d.isAnomaly?'var(--red)':'var(--orange)'):d.variation<0?'var(--green)':'var(--text3)';
const varLabel = d.variation===null?'—':(d.variation>=0?'+':'')+d.variation.toFixed(1)+'%';
return `<tr style="cursor:pointer" onclick="showPrixDetail('${d.article.replace(/'/g,"\\'")}','${d.fournisseur.replace(/'/g,"\\'")}')">
<td><strong>${d.article}</strong></td>
<td style="color:var(--text2)">${d.fournisseur}</td>
<td style="text-align:right;font-weight:600">${fmtNum(Math.round(d.dernierPrix))} F</td>
<td style="text-align:right;color:var(--text3)">${d.prixPrecedent!==null?fmtNum(Math.round(d.prixPrecedent))+' F':'—'}</td>
<td style="text-align:right;font-weight:700;color:${varColor}">${varLabel}${d.isAnomaly?' ⚠':''}</td>
<td style="text-align:right;font-size:11px;color:var(--text3)">${fmtNum(Math.round(d.moy))} F<br>${fmtNum(Math.round(d.min))}–${fmtNum(Math.round(d.max))} F</td>
<td style="text-align:right">${d.nbAchats}</td>
<td style="font-size:12px;color:var(--text3)">${fmtDate(d.derniereDate)}</td>
<td>${d.isAnomaly?'<span class="badge badge-red">⚠ Hausse</span>':''}</td>
</tr>`;
}).join('') : '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text3)">Aucun historique de prix — enregistrez des entrées avec fournisseur et prix</td></tr>';
}

function showPrixDetail(article, fournisseur) {
const data = computeHistoriquePrixData().find(d => d.article===article && d.fournisseur===fournisseur);
if (!data) return;
const achats = data.achats;
const prices = achats.map(a=>a.prix);
const maxP = Math.max(...prices), minP = Math.min(...prices);
const range = maxP-minP || 1;
const W = Math.max(300, achats.length*60), H = 120, pad=20;
const pts = achats.map((a,i) => {
const x = pad + (i/(Math.max(1,achats.length-1)))*(W-2*pad);
const y = pad + (1-(a.prix-minP)/range)*(H-2*pad);
return {x,y,a};
});
const polyline = pts.map(p=>p.x+','+p.y).join(' ');
const circles = pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--gold)"><title>${fmtDate(p.a.date)} : ${fmtNum(p.a.prix)} F</title></circle>`).join('');
const labels = pts.map((p,i) => (i===0||i===pts.length-1||i===Math.floor(pts.length/2)) ? `<text x="${p.x}" y="${H-4}" text-anchor="middle" font-size="9" fill="var(--text3)">${fmtDate(p.a.date)}</text>` : '').join('');
document.getElementById('hp-detail-title').textContent = article+' — '+fournisseur;
const rows = achats.slice().reverse().map((a,i,arr) => {
const next = arr[i+1];
const varr = next && next.prix>0 ? (a.prix-next.prix)/next.prix*100 : null;
return `<tr><td>${fmtDate(a.date)}</td><td style="text-align:right;font-weight:600">${fmtNum(Math.round(a.prix))} F</td><td style="text-align:right;color:${varr===null?'var(--text3)':varr>0?'var(--orange)':varr<0?'var(--green)':'var(--text3)'}">${varr===null?'—':(varr>=0?'+':'')+varr.toFixed(1)+'%'}</td></tr>`;
}).join('');
document.getElementById('hp-detail-body').innerHTML = `
<div style="padding:18px">
<div style="overflow-x:auto;margin-bottom:20px;background:var(--surface2);border-radius:10px;padding:14px;border:1px solid var(--border)">
<svg viewBox="0 0 ${W} ${H}" width="${Math.min(W,700)}" height="${H}">
<polyline points="${polyline}" fill="none" stroke="var(--gold)" stroke-width="2"/>
${circles}
${labels}
</svg>
</div>
<div style="max-height:280px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
<table style="width:100%;border-collapse:collapse;font-size:12px">
<thead><tr><th style="background:var(--surface2);padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Date</th><th style="background:var(--surface2);padding:7px 10px;text-align:right;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Prix</th><th style="background:var(--surface2);padding:7px 10px;text-align:right;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Variation vs achat précédent</th></tr></thead>
<tbody>${rows}</tbody></table></div></div>`;
document.getElementById('modal-prix-detail').classList.add('open');
}
