// ============================================================
// NODAS HUB — module: foodcost.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

// ----- Période & contrôles -----
window._fcMode = window._fcMode || 'mensuel';

// ===== FOOD COST =====
function fcEnsureDefaults() {
if (!state.foodCost) state.foodCost = {};
if (!state.foodCost.categoryMap) state.foodCost.categoryMap = {};
if (!state.foodCost.sourceMode) state.foodCost.sourceMode = { achats:'auto', inventaire:'auto', pertes:'auto' };
if (!state.foodCost.manual) state.foodCost.manual = {};
}

function fcMonthKey(year, monthIndex1to12) { return year + '-' + String(monthIndex1to12).padStart(2,'0'); }

function fcGetCategoryType(categorie) {
const c = (categorie||'').trim();
if (!c) return 'food';
return (state.foodCost.categoryMap[c]) || 'food';
}

function fcManualDefaults() {
return {
ventesFood:0, ventesBev:0,
offertClientFood:0, offertDirectionFood:0, offertInviteFood:0, offertPersonnelFood:0,
offertClientBev:0, offertDirectionBev:0, offertInviteBev:0, offertPersonnelBev:0,
vernissageFood:0, vernissageBev:0, cocktailFood:0, cocktailBev:0,
achatsFoodManuel:0, achatsBevManuel:0,
inventaireDebutFoodManuel:0, inventaireDebutBevManuel:0,
inventaireFinFoodManuel:0, inventaireFinBevManuel:0,
pertesFoodManuel:0, pertesBevManuel:0
};
}

function fcGetManual(key) {
fcEnsureDefaults();
state.foodCost.manual[key] = Object.assign(fcManualDefaults(), state.foodCost.manual[key]||{});
return state.foodCost.manual[key];
}

function fcSetManualField(key, field, value) {
if (window.isEconome && window.isEconome()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
const m = fcGetManual(key);
m[field] = parseFloat(value) || 0;
logActivity('foodcost_manual', 'Food Cost — valeur manuelle modifiée : '+field+' ('+key+')');
saveState('meta');
renderFoodCost();
}

function fcToggleSource(section) {
if (window.isEconome && window.isEconome()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
fcEnsureDefaults();
state.foodCost.sourceMode[section] = state.foodCost.sourceMode[section]==='auto' ? 'manuel' : 'auto';
logActivity('foodcost_manual', 'Food Cost — source '+section+' → '+state.foodCost.sourceMode[section]);
saveState('meta');
renderFoodCost();
}

function fcSetCategoryType(cat, type) {
if (window.isEconome && window.isEconome()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
fcEnsureDefaults();
state.foodCost.categoryMap[cat] = type;
logActivity('foodcost_manual', 'Food Cost — catégorie "'+cat+'" → '+type);
saveState('meta');
renderFoodCost();
}

// ----- Calculs automatiques à partir des données de l'app -----
function fcComputeAchatsAuto(from, to) {
let food=0, bev=0;
state.purchases.forEach(p => {
if (p.date < from || p.date > to) return;
const total = p.total || (p.quantite*(p.prix_ttc||0)) || 0;
const type = fcGetCategoryType(p.categorie);
if (type==='off') return;
if (type==='beverage') bev += total; else food += total;
});
return { food, beverage: bev };
}

// Reconstitue le stock (valorisé au prix d'achat actuel) de chaque article à une date donnée,
// en rejouant tous les mouvements antérieurs ou égaux à cette date.
function fcComputeStockValoriseAt(dateStr) {
let food=0, bev=0;
state.articles.forEach(a => {
let entre=0, sortie=0;
state.purchases.forEach(p=>{ if (p.article===a.designation && p.date<=dateStr) entre+=p.quantite; });
state.sorties.forEach(s=>{ if (s.article===a.designation && s.date<=dateStr) sortie+=s.quantite; });
const qte = entre - sortie;
if (qte<=0) return;
const valeur = qte * (a.prix_achat||0);
const type = fcGetCategoryType(a.categorie);
if (type==='off') return;
if (type==='beverage') bev+=valeur; else food+=valeur;
});
return { food, beverage: bev };
}

// Pertes = sorties dont le secteur contient "Perte" (casse, vol...) sur la période.
function fcComputePertesAuto(from, to) {
let food=0, bev=0;
state.sorties.forEach(s => {
if (s.date < from || s.date > to) return;
if (!/perte/i.test(s.secteur||'')) return;
const art = state.articles.find(a=>a.designation===s.article);
const valeur = s.quantite * (art ? (art.prix_achat||0) : 0);
const type = fcGetCategoryType(s.categorie || (art?art.categorie:''));
if (type==='off') return;
if (type==='beverage') bev+=valeur; else food+=valeur;
});
return { food, beverage: bev };
}

function fcInitControls() {
const monthEl = document.getElementById('fc-month');
if (monthEl && !monthEl.value) monthEl.value = today().substring(0,7);
const yearEl = document.getElementById('fc-year');
if (yearEl && !yearEl.value) yearEl.value = new Date().getFullYear();
const fromEl = document.getElementById('fc-from');
const toEl = document.getElementById('fc-to');
if (fromEl && !fromEl.value) { const d=new Date(); d.setDate(1); fromEl.value = d.toISOString().split('T')[0]; }
if (toEl && !toEl.value) toEl.value = today();
}

function fcSetView(view) {
window._fcView = view;
document.getElementById('fc-view-global').classList.toggle('active', view==='global');
document.getElementById('fc-view-recette').classList.toggle('active', view==='recette');
document.getElementById('fc-global-view').style.display = view==='global' ? '' : 'none';
document.getElementById('fc-recette-view').style.display = view==='recette' ? '' : 'none';
}

function fcRenderAll() {
renderFoodCost();
renderFoodCostRecettes();
}

function fcSetMode(mode) {
window._fcMode = mode;
['mensuel','libre','annuel'].forEach(m => {
document.getElementById('fc-mode-'+m).classList.toggle('active', m===mode);
document.getElementById('fc-controls-'+m).style.display = m===mode ? 'flex' : 'none';
});
fcRenderAll();
}

function renderFoodCostRecettes() {
const period = fcGetPeriodRange();
const ventesPeriode = (state.ventes||[]).filter(v => v.type==='recette' && v.date>=period.from && v.date<=period.to);
const parRecette = {};
ventesPeriode.forEach(v => {
if (!parRecette[v.nom]) parRecette[v.nom] = { nom:v.nom, portionsVendues:0, portionsOffertes:0, caVendu:0, valeurOfferte:0 };
const p = parRecette[v.nom];
if (v.statut==='vendu') { p.portionsVendues += v.quantite; p.caVendu += (v.total||0); }
else { p.portionsOffertes += v.quantite; p.valeurOfferte += (v.total||0); }
});
const rows = Object.values(parRecette).map(p => {
const r = state.recettes.find(x=>x.nom===p.nom);
const coutPortion = r ? (calcCoutRecette(r)/(r.portions||1)) : 0;
const totalPortions = p.portionsVendues + p.portionsOffertes;
const coutTotal = coutPortion * totalPortions;
const marge = p.caVendu - coutTotal;
const foodCostPct = p.caVendu > 0 ? (coutTotal/p.caVendu*100) : null;
return { ...p, type: r?r.type:'—', coutPortion, coutTotal, marge, foodCostPct };
}).sort((a,b) => {
if (a.foodCostPct===null && b.foodCostPct===null) return 0;
if (a.foodCostPct===null) return 1;
if (b.foodCostPct===null) return -1;
return b.foodCostPct - a.foodCostPct;
});
const totalPortionsVendues = rows.reduce((s,r)=>s+r.portionsVendues,0);
const totalCA = rows.reduce((s,r)=>s+r.caVendu,0);
const totalCout = rows.reduce((s,r)=>s+r.coutTotal,0);
const fcMoyen = totalCA>0 ? (totalCout/totalCA*100) : null;
const kpiEl = document.getElementById('fc-rec-kpi');
if (kpiEl) kpiEl.innerHTML = `
<div class="analyse-kpi"><div class="analyse-kpi-label">Portions vendues</div><div class="analyse-kpi-val" style="color:var(--gold)">${fmtNum(totalPortionsVendues)}</div><div class="analyse-kpi-sub">${rows.length} recette(s) actives</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">CA généré</div><div class="analyse-kpi-val" style="color:var(--green);font-size:20px">${fmtNum(Math.round(totalCA))}</div><div class="analyse-kpi-sub">FCFA · vendu uniquement</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Coût matière total</div><div class="analyse-kpi-val" style="color:var(--orange);font-size:20px">${fmtNum(Math.round(totalCout))}</div><div class="analyse-kpi-sub">FCFA · vendu + offert</div></div>
<div class="analyse-kpi"><div class="analyse-kpi-label">Food cost % moyen</div><div class="analyse-kpi-val" style="color:${fcMoyen===null?'var(--text3)':fcMoyen>35?'var(--red)':fcMoyen>25?'var(--orange)':'var(--green)'}">${fcMoyen!==null?fcMoyen.toFixed(1)+'%':'—'}</div><div class="analyse-kpi-sub">coût / CA vendu</div></div>`;
const tbody = document.getElementById('fc-rec-tbody');
if (!tbody) return;
tbody.innerHTML = rows.length ? rows.map(r => {
const fcColor = r.foodCostPct===null?'var(--text3)':r.foodCostPct>35?'var(--red)':r.foodCostPct>25?'var(--orange)':'var(--green)';
return `<tr>
<td><strong>${r.nom}</strong></td>
<td><span class="badge badge-gray">${r.type}</span></td>
<td style="text-align:right;color:var(--green);font-weight:600">${fmt(r.portionsVendues)}</td>
<td style="text-align:right;color:var(--orange)">${fmt(r.portionsOffertes)}</td>
<td style="text-align:right">${r.coutPortion>0?fmtNum(Math.round(r.coutPortion))+' F':'—'}</td>
<td style="text-align:right;font-weight:600">${fmtNum(Math.round(r.caVendu))} F</td>
<td style="text-align:right">${fmtNum(Math.round(r.coutTotal))} F</td>
<td style="text-align:right;color:${r.marge>=0?'var(--green)':'var(--red)'}">${fmtNum(Math.round(r.marge))} F</td>
<td style="text-align:right;font-weight:700;color:${fcColor}">${r.foodCostPct!==null?r.foodCostPct.toFixed(1)+'%':'—'}</td>
</tr>`;
}).join('') : '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text3)">Aucune vente de recette sur cette période — enregistrez des ventes dans l\'onglet Ventes</td></tr>';
}

function fcGetPeriodRange() {
const mode = window._fcMode || 'mensuel';
if (mode==='mensuel') {
const val = document.getElementById('fc-month')?.value || today().substring(0,7);
const [y,m] = val.split('-');
const from = val+'-01';
const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
const to = val+'-'+String(lastDay).padStart(2,'0');
return { from, to, key: val, label: 'Mois : '+fmtDate(from)+' → '+fmtDate(to) };
}
if (mode==='annuel') {
const y = parseInt(document.getElementById('fc-year')?.value) || new Date().getFullYear();
return { from: y+'-01-01', to: y+'-12-31', key: 'annee-'+y, year:y, label: 'Cumul annuel '+y+' · saisie manuelle agrégée depuis les mois (lecture seule)' };
}
const from = document.getElementById('fc-from')?.value || today();
const to = document.getElementById('fc-to')?.value || today();
return { from, to, key: 'libre-'+from+'-'+to, label: 'Période : '+fmtDate(from)+' → '+fmtDate(to) };
}

function fcGetEffectiveManual(period) {
if (window._fcMode==='annuel' && period.year) {
const agg = fcManualDefaults();
for (let m=1;m<=12;m++) {
const mo = fcGetManual(fcMonthKey(period.year, m));
Object.keys(agg).forEach(k => agg[k] += (mo[k]||0));
}
return { data: agg, editable: false };
}
return { data: fcGetManual(period.key), editable: true };
}

// ----- Rendu principal -----
function renderFoodCost() {
fcEnsureDefaults();
const period = fcGetPeriodRange();
document.getElementById('fc-period-label').textContent = period.label;
const manualCtx = fcGetEffectiveManual(period);
const manual = manualCtx.data;
const manualEditable = manualCtx.editable && !(window.isEconome && window.isEconome());
const src = state.foodCost.sourceMode;

const achats = src.achats==='auto' ? fcComputeAchatsAuto(period.from, period.to) : { food:manual.achatsFoodManuel, beverage:manual.achatsBevManuel };
let invDebut, invFin;
if (src.inventaire==='auto') {
const dDebut = new Date(period.from); dDebut.setDate(dDebut.getDate()-1);
invDebut = fcComputeStockValoriseAt(dDebut.toISOString().split('T')[0]);
invFin = fcComputeStockValoriseAt(period.to);
} else {
invDebut = { food:manual.inventaireDebutFoodManuel, beverage:manual.inventaireDebutBevManuel };
invFin = { food:manual.inventaireFinFoodManuel, beverage:manual.inventaireFinBevManuel };
}
const pertes = src.pertes==='auto' ? fcComputePertesAuto(period.from, period.to) : { food:manual.pertesFoodManuel, beverage:manual.pertesBevManuel };
const offertFood = manual.offertClientFood+manual.offertDirectionFood+manual.offertInviteFood+manual.offertPersonnelFood;
const offertBev = manual.offertClientBev+manual.offertDirectionBev+manual.offertInviteBev+manual.offertPersonnelBev;
const ventesFood = manual.ventesFood, ventesBev = manual.ventesBev;

const consoFood = invDebut.food + achats.food - invFin.food;
const consoBev = invDebut.beverage + achats.beverage - invFin.beverage;
const foodCostBrut = ventesFood>0 ? (consoFood/ventesFood*100) : null;
const foodCostNet = ventesFood>0 ? ((consoFood-offertFood-pertes.food)/ventesFood*100) : null;
const bevCostBrut = ventesBev>0 ? (consoBev/ventesBev*100) : null;
const bevCostNet = ventesBev>0 ? ((consoBev-offertBev-pertes.beverage)/ventesBev*100) : null;
const fnbBrut = (foodCostBrut!==null&&bevCostBrut!==null) ? (foodCostBrut+bevCostBrut)/2 : (foodCostBrut!==null?foodCostBrut:bevCostBrut);
const fnbNet = (foodCostNet!==null&&bevCostNet!==null) ? (foodCostNet+bevCostNet)/2 : (foodCostNet!==null?foodCostNet:bevCostNet);

function pctColor(v) { if (v===null||v===undefined||isNaN(v)) return 'var(--text3)'; if (v<=30) return 'var(--green)'; if (v<=40) return 'var(--orange)'; return 'var(--red)'; }
function pctFmt(v) { return (v===null||v===undefined||isNaN(v)) ? '—' : v.toFixed(1)+'%'; }
document.getElementById('fc-kpi-brut').innerHTML =
'<div class="analyse-kpi"><div class="analyse-kpi-label">Food Cost Brut</div><div class="analyse-kpi-val" style="color:'+pctColor(foodCostBrut)+'">'+pctFmt(foodCostBrut)+'</div><div class="analyse-kpi-sub">conso food ÷ ventes food</div></div>'
+'<div class="analyse-kpi"><div class="analyse-kpi-label">Beverage Cost Brut</div><div class="analyse-kpi-val" style="color:'+pctColor(bevCostBrut)+'">'+pctFmt(bevCostBrut)+'</div><div class="analyse-kpi-sub">conso bev ÷ ventes bev</div></div>'
+'<div class="analyse-kpi"><div class="analyse-kpi-label">F&B Cost Brut</div><div class="analyse-kpi-val" style="color:'+pctColor(fnbBrut)+'">'+pctFmt(fnbBrut)+'</div><div class="analyse-kpi-sub">moyenne food + bev</div></div>';
document.getElementById('fc-kpi-net').innerHTML =
'<div class="analyse-kpi"><div class="analyse-kpi-label">Food Cost Net</div><div class="analyse-kpi-val" style="color:'+pctColor(foodCostNet)+'">'+pctFmt(foodCostNet)+'</div><div class="analyse-kpi-sub">hors offerts & pertes</div></div>'
+'<div class="analyse-kpi"><div class="analyse-kpi-label">Beverage Cost Net</div><div class="analyse-kpi-val" style="color:'+pctColor(bevCostNet)+'">'+pctFmt(bevCostNet)+'</div><div class="analyse-kpi-sub">hors offerts & pertes</div></div>'
+'<div class="analyse-kpi"><div class="analyse-kpi-label">F&B Cost Net</div><div class="analyse-kpi-val" style="color:'+pctColor(fnbNet)+'">'+pctFmt(fnbNet)+'</div><div class="analyse-kpi-sub">moyenne food + bev</div></div>';

function srcBadge(section) {
const isAuto = src[section]==='auto';
const isEco = window.isEconome && window.isEconome();
return '<button class="btn btn-outline btn-sm" '+(isEco?'disabled style="opacity:0.5;cursor:not-allowed"':'onclick="fcToggleSource(\''+section+'\')"')+' title="'+(isEco?'Réservé à l\'administrateur':'Cliquer pour changer la source')+'">'+(isAuto?'🔄 Auto':'✏ Manuel')+'</button>';
}
function manualInput(field, val) {
if (!manualEditable) {
const raison = (window.isEconome && window.isEconome()) ? 'Réservé à l\'administrateur' : 'Modifiable depuis la vue Mensuel';
return '<input type="number" class="lc-qte" style="width:100px;text-align:right;opacity:0.6" value="'+(val?Math.round(val):'')+'" placeholder="0" disabled title="'+raison+'">';
}
return '<input type="number" class="lc-qte" style="width:100px;text-align:right" value="'+(val||'')+'" placeholder="0" onchange="fcSetManualField(\''+period.key+'\',\''+field+'\',this.value)">';
}
function rowVal(v) { return v ? fmtNum(Math.round(v)) : '—'; }
let rows = '';
rows += '<tr><td colspan="5" style="background:var(--surface2);font-weight:700;font-size:11px;text-transform:uppercase;color:var(--text3)">Offerts</td></tr>';
[['offertClientFood','offertClientBev','Offert client'],['offertDirectionFood','offertDirectionBev','Offert direction'],['offertInviteFood','offertInviteBev','Offert invité / communication'],['offertPersonnelFood','offertPersonnelBev','Offert personnel']].forEach(function(t){
rows += '<tr><td>'+t[2]+'</td><td style="text-align:right">'+manualInput(t[0],manual[t[0]])+'</td><td style="text-align:right">'+manualInput(t[1],manual[t[1]])+'</td><td style="text-align:right;font-weight:600">'+rowVal((manual[t[0]]||0)+(manual[t[1]]||0))+'</td><td style="text-align:center">✏</td></tr>';
});
rows += '<tr style="background:var(--surface2)"><td><strong>Total offert</strong></td><td style="text-align:right;font-weight:700">'+rowVal(offertFood)+'</td><td style="text-align:right;font-weight:700">'+rowVal(offertBev)+'</td><td style="text-align:right;font-weight:700">'+rowVal(offertFood+offertBev)+'</td><td></td></tr>';

rows += '<tr><td colspan="5" style="background:var(--surface2);font-weight:700;font-size:11px;text-transform:uppercase;color:var(--text3)">Événements</td></tr>';
rows += '<tr><td>Vernissage</td><td style="text-align:right">'+manualInput('vernissageFood',manual.vernissageFood)+'</td><td style="text-align:right">'+manualInput('vernissageBev',manual.vernissageBev)+'</td><td style="text-align:right;font-weight:600">'+rowVal(manual.vernissageFood+manual.vernissageBev)+'</td><td style="text-align:center">✏</td></tr>';
rows += '<tr><td>Cocktail</td><td style="text-align:right">'+manualInput('cocktailFood',manual.cocktailFood)+'</td><td style="text-align:right">'+manualInput('cocktailBev',manual.cocktailBev)+'</td><td style="text-align:right;font-weight:600">'+rowVal(manual.cocktailFood+manual.cocktailBev)+'</td><td style="text-align:center">✏</td></tr>';

rows += '<tr><td colspan="5" style="background:var(--surface2);font-weight:700;font-size:11px;text-transform:uppercase;color:var(--text3)">Pertes '+srcBadge('pertes')+' <span style="text-transform:none;font-weight:400;color:var(--text3)">— astuce : indiquez "Perte" comme secteur d\'une sortie (casse/vol) pour qu\'elle soit comptée ici automatiquement</span></td></tr>';
if (src.pertes==='auto') {
rows += '<tr><td>Pertes (sorties "Perte")</td><td style="text-align:right">'+rowVal(pertes.food)+'</td><td style="text-align:right">'+rowVal(pertes.beverage)+'</td><td style="text-align:right;font-weight:600">'+rowVal(pertes.food+pertes.beverage)+'</td><td style="text-align:center">🔄</td></tr>';
} else {
rows += '<tr><td>Pertes</td><td style="text-align:right">'+manualInput('pertesFoodManuel',manual.pertesFoodManuel)+'</td><td style="text-align:right">'+manualInput('pertesBevManuel',manual.pertesBevManuel)+'</td><td style="text-align:right;font-weight:600">'+rowVal(pertes.food+pertes.beverage)+'</td><td style="text-align:center">✏</td></tr>';
}

rows += '<tr><td colspan="5" style="background:var(--surface2);font-weight:700;font-size:11px;text-transform:uppercase;color:var(--text3)">Inventaire '+srcBadge('inventaire')+'</td></tr>';
if (src.inventaire==='auto') {
rows += '<tr><td>Début période (valorisé au prix d\'achat actuel)</td><td style="text-align:right">'+rowVal(invDebut.food)+'</td><td style="text-align:right">'+rowVal(invDebut.beverage)+'</td><td style="text-align:right;font-weight:600">'+rowVal(invDebut.food+invDebut.beverage)+'</td><td style="text-align:center">🔄</td></tr>';
rows += '<tr><td>Fin période (valorisé au prix d\'achat actuel)</td><td style="text-align:right">'+rowVal(invFin.food)+'</td><td style="text-align:right">'+rowVal(invFin.beverage)+'</td><td style="text-align:right;font-weight:600">'+rowVal(invFin.food+invFin.beverage)+'</td><td style="text-align:center">🔄</td></tr>';
} else {
rows += '<tr><td>Début période</td><td style="text-align:right">'+manualInput('inventaireDebutFoodManuel',manual.inventaireDebutFoodManuel)+'</td><td style="text-align:right">'+manualInput('inventaireDebutBevManuel',manual.inventaireDebutBevManuel)+'</td><td style="text-align:right;font-weight:600">'+rowVal(invDebut.food+invDebut.beverage)+'</td><td style="text-align:center">✏</td></tr>';
rows += '<tr><td>Fin période</td><td style="text-align:right">'+manualInput('inventaireFinFoodManuel',manual.inventaireFinFoodManuel)+'</td><td style="text-align:right">'+manualInput('inventaireFinBevManuel',manual.inventaireFinBevManuel)+'</td><td style="text-align:right;font-weight:600">'+rowVal(invFin.food+invFin.beverage)+'</td><td style="text-align:center">✏</td></tr>';
}

rows += '<tr><td colspan="5" style="background:var(--surface2);font-weight:700;font-size:11px;text-transform:uppercase;color:var(--text3)">Achats '+srcBadge('achats')+'</td></tr>';
if (src.achats==='auto') {
rows += '<tr><td>Achats (entrées enregistrées)</td><td style="text-align:right">'+rowVal(achats.food)+'</td><td style="text-align:right">'+rowVal(achats.beverage)+'</td><td style="text-align:right;font-weight:600">'+rowVal(achats.food+achats.beverage)+'</td><td style="text-align:center">🔄</td></tr>';
} else {
rows += '<tr><td>Achats</td><td style="text-align:right">'+manualInput('achatsFoodManuel',manual.achatsFoodManuel)+'</td><td style="text-align:right">'+manualInput('achatsBevManuel',manual.achatsBevManuel)+'</td><td style="text-align:right;font-weight:600">'+rowVal(achats.food+achats.beverage)+'</td><td style="text-align:center">✏</td></tr>';
}

rows += '<tr style="background:rgba(201,168,76,0.08)"><td><strong>Consommation</strong> <span style="font-size:10px;color:var(--text3)">(début + achats − fin)</span></td><td style="text-align:right;font-weight:700">'+rowVal(consoFood)+'</td><td style="text-align:right;font-weight:700">'+rowVal(consoBev)+'</td><td style="text-align:right;font-weight:700">'+rowVal(consoFood+consoBev)+'</td><td></td></tr>';

rows += '<tr><td colspan="5" style="background:var(--surface2);font-weight:700;font-size:11px;text-transform:uppercase;color:var(--text3)">Ventes <span style="color:var(--text3);font-weight:400;text-transform:none">(toujours manuel — pas de caisse connectée)</span></td></tr>';
rows += '<tr><td>Ventes</td><td style="text-align:right">'+manualInput('ventesFood',manual.ventesFood)+'</td><td style="text-align:right">'+manualInput('ventesBev',manual.ventesBev)+'</td><td style="text-align:right;font-weight:600">'+rowVal(ventesFood+ventesBev)+'</td><td style="text-align:center">✏</td></tr>';
document.getElementById('fc-tbody').innerHTML = rows;

// Vue Bar/Cuisine : consommation par secteur de sortie sur la période
const secteurMap = {};
state.sorties.forEach(s => {
if (s.date<period.from || s.date>period.to) return;
const art = state.articles.find(a=>a.designation===s.article);
const valeur = s.quantite * (art?(art.prix_achat||0):0);
const sec = s.secteur || 'Non renseigné';
secteurMap[sec] = (secteurMap[sec]||0) + valeur;
});
const secteurs = Object.entries(secteurMap).sort((a,b)=>b[1]-a[1]);
const totalSecteurs = secteurs.reduce((s,e)=>s+e[1],0) || 1;
document.getElementById('fc-secteurs').innerHTML = secteurs.length ? secteurs.map(function(e){
return '<div class="chart-bar-row"><div class="chart-bar-label" title="'+e[0]+'">'+e[0]+'</div><div class="chart-bar-bg"><div class="chart-bar-fill" style="width:'+(e[1]/totalSecteurs*100).toFixed(1)+'%;background:var(--blue)"></div></div><div class="chart-bar-val" style="width:auto;font-size:11px">'+fmtNum(Math.round(e[1]))+' F</div></div>';
}).join('') : '<div class="empty"><div class="empty-icon">🍹</div><div class="empty-text">Aucune sortie sur cette période</div></div>';

fcRenderCategoryMap();
}

function fcRenderCategoryMap() {
const el = document.getElementById('fc-categorymap');
if (!el) return;
const cats = allCategories();
if (!cats.length) { el.innerHTML = '<div style="color:var(--text3);font-size:12px">Aucune cat\u00e9gorie d\'article pour le moment.</div>'; return; }
el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">' + cats.map(function(c){
const type = fcGetCategoryType(c);
const mapped = !!state.foodCost.categoryMap[c];
const isOff = type==='off';
return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;'+(isOff?'opacity:0.6':'')+'">'
+'<span style="font-size:12px;'+(mapped?'':'color:var(--orange)')+'">'+c+(mapped?'':' \u26a0')+(isOff?' <span style="color:var(--text3)">(exclu)</span>':'')+'</span>'
+'<select style="width:110px;padding:4px 6px;font-size:12px" '+((window.isEconome&&window.isEconome())?'disabled title="R\u00e9serv\u00e9 \u00e0 l\'administrateur"':'onchange="fcSetCategoryType(\''+c.replace(/'/g,"\\'")+'\',this.value)"')+'>'
+'<option value="food"'+(type==='food'?' selected':'')+'>Food</option>'
+'<option value="beverage"'+(type==='beverage'?' selected':'')+'>Beverage</option>'
+'<option value="off"'+(type==='off'?' selected':'')+'>Off (exclu)</option>'
+'</select></div>';
}).join('') + '</div>';
}

// ----- Export Excel au format annuel (identique à la structure du fichier F&B Annuel) -----
function exportFoodCostXLSX() {
fcEnsureDefaults();
let year = new Date().getFullYear();
if (window._fcMode==='annuel') year = parseInt(document.getElementById('fc-year')?.value)||year;
else if (window._fcMode==='mensuel') year = parseInt((document.getElementById('fc-month')?.value||'').split('-')[0])||year;
const src = state.foodCost.sourceMode;
const months = [];
for (let m=1;m<=12;m++) {
const key = fcMonthKey(year,m);
const from = key+'-01';
const lastDay = new Date(year,m,0).getDate();
const to = key+'-'+String(lastDay).padStart(2,'0');
const manual = fcGetManual(key);
const achats = src.achats==='auto' ? fcComputeAchatsAuto(from,to) : {food:manual.achatsFoodManuel,beverage:manual.achatsBevManuel};
let invDebut, invFin;
if (src.inventaire==='auto') {
const dDebut = new Date(from); dDebut.setDate(dDebut.getDate()-1);
invDebut = fcComputeStockValoriseAt(dDebut.toISOString().split('T')[0]);
invFin = fcComputeStockValoriseAt(to);
} else {
invDebut = {food:manual.inventaireDebutFoodManuel,beverage:manual.inventaireDebutBevManuel};
invFin = {food:manual.inventaireFinFoodManuel,beverage:manual.inventaireFinBevManuel};
}
const pertes = src.pertes==='auto' ? fcComputePertesAuto(from,to) : {food:manual.pertesFoodManuel,beverage:manual.pertesBevManuel};
months.push({ key, manual, achats, invDebut, invFin, pertes });
}
function sumArr(arr) { return arr.reduce(function(a,b){return a+b;},0); }
function r(v) { return Math.round(v||0); }
const rows = [];
rows.push(['Food & Beverage cost    *  NB: Tous les chiffres de ce tableau sont en HT']);
rows.push(['','', ...months.map(function(mo){return mo.key;}), 'Cumul annuel']);
function offVals(food, field) { return months.map(function(mo){ return mo.manual[field]; }); }
const ocf = offVals(true,'offertClientFood'), odf = offVals(true,'offertDirectionFood'), oif = offVals(true,'offertInviteFood'), opf = offVals(true,'offertPersonnelFood');
rows.push(['Offert food','Offert client', ...ocf.map(r), r(sumArr(ocf))]);
rows.push([null,'Offert direction', ...odf.map(r), r(sumArr(odf))]);
rows.push([null,'Offert invité/Com', ...oif.map(r), r(sumArr(oif))]);
rows.push([null,'Offert personnel', ...opf.map(r), r(sumArr(opf))]);
const totFoodOffert = ocf.map(function(v,i){ return v+odf[i]+oif[i]+opf[i]; });
rows.push([null,'Total food offert', ...totFoodOffert.map(r), r(sumArr(totFoodOffert))]);
const ocb = offVals(false,'offertClientBev'), odb = offVals(false,'offertDirectionBev'), oib = offVals(false,'offertInviteBev'), opb = offVals(false,'offertPersonnelBev');
rows.push(['Offert beverage','Offert client', ...ocb.map(r), r(sumArr(ocb))]);
rows.push([null,'Offert direction', ...odb.map(r), r(sumArr(odb))]);
rows.push([null,'Offert invité/Com', ...oib.map(r), r(sumArr(oib))]);
rows.push([null,'Offert personnel', ...opb.map(r), r(sumArr(opb))]);
const totBevOffert = ocb.map(function(v,i){ return v+odb[i]+oib[i]+opb[i]; });
rows.push([null,'Total beverage offert', ...totBevOffert.map(r), r(sumArr(totBevOffert))]);
const vf = months.map(function(mo){return mo.manual.vernissageFood;}), vb = months.map(function(mo){return mo.manual.vernissageBev;});
const cf = months.map(function(mo){return mo.manual.cocktailFood;}), cb = months.map(function(mo){return mo.manual.cocktailBev;});
rows.push(['Evènement/coûts','Vernissage/Food', ...vf.map(r), r(sumArr(vf))]);
rows.push([null,'Vernissage/Bev', ...vb.map(r), r(sumArr(vb))]);
rows.push([null,'Cocktail/Food', ...cf.map(r), r(sumArr(cf))]);
rows.push([null,'Cocktail/Bev', ...cb.map(r), r(sumArr(cb))]);
const pf = months.map(function(mo){return mo.pertes.food;}), pb = months.map(function(mo){return mo.pertes.beverage;});
rows.push(['Pertes','Food', ...pf.map(r), r(sumArr(pf))]);
rows.push([null,'Beverage', ...pb.map(r), r(sumArr(pb))]);
const totPertes = pf.map(function(v,i){return v+pb[i];});
rows.push([null,'Total des pertes', ...totPertes.map(r), r(sumArr(totPertes))]);
const idf_ = months.map(function(mo){return mo.invDebut.food;}), idb_ = months.map(function(mo){return mo.invDebut.beverage;});
const iff_ = months.map(function(mo){return mo.invFin.food;}), ifb_ = months.map(function(mo){return mo.invFin.beverage;});
rows.push(['Inventaire début & fin','Début période/Food', ...idf_.map(r), r(sumArr(idf_))]);
rows.push([null,'Début période/Bev', ...idb_.map(r), r(sumArr(idb_))]);
rows.push([null,'Fin période/Food', ...iff_.map(r), r(sumArr(iff_))]);
rows.push([null,'Fin période/Bev', ...ifb_.map(r), r(sumArr(ifb_))]);
const af = months.map(function(mo){return mo.achats.food;}), ab = months.map(function(mo){return mo.achats.beverage;});
rows.push(['Achat','Food', ...af.map(r), r(sumArr(af))]);
rows.push([null,'Beverage', ...ab.map(r), r(sumArr(ab))]);
const totAchats = af.map(function(v,i){return v+ab[i];});
rows.push([null,'Total', ...totAchats.map(r), r(sumArr(totAchats))]);
const consoF = idf_.map(function(v,i){return v+af[i]-iff_[i];});
const consoB = idb_.map(function(v,i){return v+ab[i]-ifb_[i];});
rows.push(['Consommations = (inventaire début + achat - inventaire fin)','Food', ...consoF.map(r), r(sumArr(consoF))]);
rows.push([null,'Beverages/Liqu/Sobébra', ...consoB.map(r), r(sumArr(consoB))]);
const consoT = consoF.map(function(v,i){return v+consoB[i];});
rows.push([null,'Total', ...consoT.map(r), r(sumArr(consoT))]);
const vef = months.map(function(mo){return mo.manual.ventesFood;}), veb = months.map(function(mo){return mo.manual.ventesBev;});
rows.push(['Ventes','Food', ...vef.map(r), r(sumArr(vef))]);
rows.push([null,'Beverages', ...veb.map(r), r(sumArr(veb))]);
const venT = vef.map(function(v,i){return v+veb[i];});
rows.push([null,'Total', ...venT.map(r), r(sumArr(venT))]);
function pct(a,b) { return b>0 ? (a/b*100) : null; }
function f1(v) { return v===null||v===undefined?'':Math.round(v*10)/10; }
const fcBrut = consoF.map(function(v,i){ return pct(v, vef[i]); });
const fcNet = consoF.map(function(v,i){ return vef[i]>0 ? ((v-totFoodOffert[i]-pf[i])/vef[i]*100) : null; });
const bcBrut = consoB.map(function(v,i){ return pct(v, veb[i]); });
const bcNet = consoB.map(function(v,i){ return veb[i]>0 ? ((v-totBevOffert[i]-pb[i])/veb[i]*100) : null; });
const cVentesF = sumArr(vef), cVentesB = sumArr(veb), cConsoF = sumArr(consoF), cConsoB = sumArr(consoB);
const cOffertF = sumArr(totFoodOffert), cOffertB = sumArr(totBevOffert), cPertesF = sumArr(pf), cPertesB = sumArr(pb);
const cFcBrut = pct(cConsoF, cVentesF), cFcNet = cVentesF>0?((cConsoF-cOffertF-cPertesF)/cVentesF*100):null;
const cBcBrut = pct(cConsoB, cVentesB), cBcNet = cVentesB>0?((cConsoB-cOffertB-cPertesB)/cVentesB*100):null;
rows.push(['Food cost','Brut', ...fcBrut.map(f1), f1(cFcBrut)]);
rows.push([null,'Net', ...fcNet.map(f1), f1(cFcNet)]);
rows.push(['Beverage cost','Brut', ...bcBrut.map(f1), f1(cBcBrut)]);
rows.push([null,'Net', ...bcNet.map(f1), f1(cBcNet)]);
const fnbBrut = fcBrut.map(function(v,i){ return (v!==null&&bcBrut[i]!==null)?(v+bcBrut[i])/2:(v!==null?v:bcBrut[i]); });
const fnbNet = fcNet.map(function(v,i){ return (v!==null&&bcNet[i]!==null)?(v+bcNet[i])/2:(v!==null?v:bcNet[i]); });
const cFnbBrut = (cFcBrut!==null&&cBcBrut!==null)?(cFcBrut+cBcBrut)/2:(cFcBrut!==null?cFcBrut:cBcBrut);
const cFnbNet = (cFcNet!==null&&cBcNet!==null)?(cFcNet+cBcNet)/2:(cFcNet!==null?cFcNet:cBcNet);
rows.push(['F&B cost','Brut', ...fnbBrut.map(f1), f1(cFnbBrut)]);
rows.push([null,'Net', ...fnbNet.map(f1), f1(cFnbNet)]);
const ws = XLSX.utils.aoa_to_sheet(rows);
ws['!cols'] = [{wch:30},{wch:22}].concat(months.map(function(){return {wch:10};})).concat([{wch:12}]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, String(year));
try {
const period = fcGetPeriodRange();
const ventesPeriode = (state.ventes||[]).filter(v => v.type==='recette' && v.date>=period.from && v.date<=period.to);
const parRecette = {};
ventesPeriode.forEach(v => {
if (!parRecette[v.nom]) parRecette[v.nom] = { nom:v.nom, portionsVendues:0, portionsOffertes:0, caVendu:0 };
const p = parRecette[v.nom];
if (v.statut==='vendu') { p.portionsVendues += v.quantite; p.caVendu += (v.total||0); }
else { p.portionsOffertes += v.quantite; }
});
const recRows = Object.values(parRecette).map(p => {
const rc = state.recettes.find(x=>x.nom===p.nom);
const coutPortion = rc ? (calcCoutRecette(rc)/(rc.portions||1)) : 0;
const coutTotal = coutPortion * (p.portionsVendues+p.portionsOffertes);
const fcPct = p.caVendu>0 ? Math.round(coutTotal/p.caVendu*1000)/10 : '';
return [p.nom, rc?rc.type:'', p.portionsVendues, p.portionsOffertes, Math.round(coutPortion), Math.round(p.caVendu), Math.round(coutTotal), Math.round(p.caVendu-coutTotal), fcPct];
}).sort((a,b)=>(typeof b[8]==='number'?b[8]:-1)-(typeof a[8]==='number'?a[8]:-1));
const wsRecFC = XLSX.utils.aoa_to_sheet([
[`Food Cost par recette — ${period.label}`],
['Recette','Type','Portions vendues','Portions offertes','Coût/portion','CA généré','Coût total','Marge','Food cost %'],
...recRows
]);
wsRecFC['!cols'] = [{wch:30},{wch:12},{wch:16},{wch:16},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12}];
XLSX.utils.book_append_sheet(wb, wsRecFC, 'Food Cost par recette');
} catch(e) { console.error('Erreur feuille Food Cost par recette:', e); }
XLSX.writeFile(wb, `${state.appName}_FoodCost_${year}.xlsx`);
showToast('✓ Rapport Food Cost '+year+' exporté');
}

function exportRapportMensuel() {
const from = document.getElementById('analyse-from')?.value || (() => { const d=new Date(); d.setDate(1); return d.toISOString().split('T')[0]; })();
const to = document.getElementById('analyse-to')?.value || today();
const nbJours = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));
const label = `${from} au ${to}`;
try {
const wb = XLSX.utils.book_new();
const alertes = state.articles.filter(a => { const s=getStock(a); return s<=0||(a.stock_min>0&&s<a.stock_min); });
const entreesPeriode = state.purchases.filter(p => p.date >= from && p.date <= to);
const sortiesPeriode = state.sorties.filter(s => s.date >= from && s.date <= to);
const totalValeur = state.articles.reduce((acc, a) => {
const s = getStock(a); if (s <= 0) return acc;
const lp = [...state.purchases].filter(p=>p.article===a.designation&&p.prix_ttc>0).sort((x,y)=>y.date>x.date?1:-1)[0];
return acc + (lp ? s * lp.prix_ttc : 0);
}, 0);
const synthese = [
[`RAPPORT DE STOCK — ${state.appName}`],
[`Période : ${label}`],
[`Généré le : ${new Date().toLocaleDateString('fr-FR')}`],
[],
['INDICATEURS CLÉS', ''],
['Total articles', state.articles.length],
['Alertes stock', alertes.length],
['Entrées (période)', entreesPeriode.length],
['Sorties (période)', sortiesPeriode.length],
['Valeur stock estimée (FCFA)', Math.round(totalValeur)],
[],
['ARTICLES EN ALERTE', '', '', ''],
['Article', 'Stock actuel', 'Stock min', 'Manque'],
...alertes.map(a => { const s=getStock(a); return [a.designation, s, a.stock_min||0, Math.max(0,(a.stock_min||0)-s)]; }),
];
const wsSynth = XLSX.utils.aoa_to_sheet(synthese);
wsSynth['!cols'] = [{wch:35},{wch:18},{wch:14},{wch:14}];
XLSX.utils.book_append_sheet(wb, wsSynth, 'Synthèse');
const prevData = [
['Article','Catégorie','Stock actuel','Unité','Conso/jour','Conso/mois','Jours restants','Date rupture estimée','Statut'],
...state.articles.map(a => {
const sorties = sortiesPeriode.filter(s => s.article === a.designation);
const totalSorti = sorties.reduce((acc, s) => acc + s.quantite, 0);
const consoJour = totalSorti / nbJours;
const stockActuel = getStock(a);
const joursRestants = consoJour > 0 ? Math.floor(stockActuel / consoJour) : null;
const dateRupture = joursRestants !== null ? (() => { const d=new Date(); d.setDate(d.getDate()+joursRestants); return d.toISOString().split('T')[0]; })() : '';
const statut = joursRestants === null ? 'Pas de conso' : joursRestants <= 0 ? 'ÉPUISÉ' : joursRestants <= 7 ? 'CRITIQUE' : joursRestants <= 21 ? 'Attention' : 'OK';
return [a.designation, a.categorie||'', stockActuel, a.unite||'', +consoJour.toFixed(3), Math.round(consoJour*30), joursRestants??'', dateRupture, statut];
}).filter(r => r[2] > 0 || r[4] > 0).sort((a,b) => {
if (a[6]==='' && b[6]==='') return 0; if (a[6]==='') return 1; if (b[6]==='') return -1; return a[6]-b[6];
})
];
const wsPrev = XLSX.utils.aoa_to_sheet(prevData);
wsPrev['!cols'] = [{wch:35},{wch:16},{wch:14},{wch:8},{wch:12},{wch:14},{wch:14},{wch:20},{wch:12}];
XLSX.utils.book_append_sheet(wb, wsPrev, 'Prévisions rupture');
const wsEnt = XLSX.utils.aoa_to_sheet([
['Date','Article','Quantité','Prix TTC','Total','Fournisseur','Facture','Catégorie'],
...entreesPeriode.sort((a,b)=>b.date>a.date?1:-1).map(p=>[p.date,p.article,p.quantite,p.prix_ttc||0,p.total||0,p.fournisseur||'',p.facture||'',p.categorie||''])
]);
wsEnt['!cols'] = [{wch:12},{wch:35},{wch:10},{wch:12},{wch:14},{wch:20},{wch:16},{wch:16}];
XLSX.utils.book_append_sheet(wb, wsEnt, 'Entrées');
const wsSort = XLSX.utils.aoa_to_sheet([
['Date','Article','Quantité','Secteur','Catégorie'],
...sortiesPeriode.sort((a,b)=>b.date>a.date?1:-1).map(s=>[s.date,s.article,s.quantite,s.secteur||'',s.categorie||''])
]);
wsSort['!cols'] = [{wch:12},{wch:35},{wch:10},{wch:20},{wch:16}];
XLSX.utils.book_append_sheet(wb, wsSort, 'Sorties');
const wsStock = XLSX.utils.aoa_to_sheet([
['Article','Catégorie','Unité','Stock min','Total entré','Total sorti','Stock actuel','Statut'],
...state.articles.map(a => {
const s = getStock(a);
const statut = s <= 0 ? 'Épuisé' : (a.stock_min > 0 && s < a.stock_min) ? 'Alerte' : 'OK';
return [a.designation, a.categorie||'', a.unite||'', a.stock_min||0, a.total_entrant||0, a.total_sortant||0, s, statut];
})
]);
wsStock['!cols'] = [{wch:35},{wch:16},{wch:8},{wch:10},{wch:12},{wch:12},{wch:12},{wch:10}];
XLSX.utils.book_append_sheet(wb, wsStock, 'Stock complet');
if (state.recettes.length) {
const wsRec = XLSX.utils.aoa_to_sheet([
['Recette','Type','Portions','Prix vente','Coût revient/portion','Marge (F)','Marge (%)','Nbre ingrédients'],
...state.recettes.map(r => {
const cout = r.ingredients.reduce((s,ing)=>{
const a=state.articles.find(x=>x.designation===ing.article);
return s+(ing.quantite*(a?.prix_achat||0));
},0);
const coutP = r.portions>0?cout/r.portions:cout;
const pv = r.prix_vente||0;
const marge = pv>0&&coutP>0?pv-coutP:null;
const margePct = pv>0&&coutP>0?Math.round(marge/pv*100):null;
return [r.nom,r.type||'',r.portions||1,pv>0?pv:'',coutP>0?Math.round(coutP):'',marge!==null?Math.round(marge):'',margePct!==null?margePct+'%':'',''+r.ingredients.length];
})
]);
wsRec['!cols']=[{wch:30},{wch:12},{wch:10},{wch:14},{wch:20},{wch:12},{wch:12},{wch:16}];
XLSX.utils.book_append_sheet(wb, wsRec, 'Recettes & Marges');
}
XLSX.writeFile(wb, `${state.appName}_rapport_${from}_${to}.xlsx`);
showToast('✓ Rapport Excel généré ('+(5+( state.recettes.length?1:0))+' feuilles)');
} catch(err) {
showToast('⚠ Erreur génération rapport : ' + err.message, 'var(--red)');
}
}
