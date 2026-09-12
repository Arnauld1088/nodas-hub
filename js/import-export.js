// ============================================================
// NODAS HUB — module: import-export.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

// ===== EXPORT =====
function buildExportRows(type) {
let rows=[], filename='';
if (!type || type==='mouvements') {
const mouvs=[...state.purchases.map(p=>['Entrée',p.date,p.article,p.quantite,p.prix_ttc||0,p.total||0,p.fournisseur||'',p.facture||'']),
...state.sorties.map(s=>['Sortie',s.date,s.article,s.quantite,'','',s.secteur||'',''])];
rows=[['Type','Date','Article','Quantite','Prix TTC','Total','Tiers','Ref'],...mouvs.sort((a,b)=>b[1]>a[1]?1:-1)];
filename='mouvements';
} else if (type==='articles') {
rows=[['Designation','Categorie','Unite','Stock_min','Total_entrant','Total_sortant','Stock_actuel'],
...state.articles.map(a=>[a.designation,a.categorie||'',a.unite||'',a.stock_min||0,a.total_entrant||0,a.total_sortant||0,getStock(a)])];
filename='articles';
} else if (type==='entrees') {
rows=[['Date','Article','Quantite','Prix_TTC','Total','Fournisseur','Facture'],
...state.purchases.map(p=>[p.date,p.article,p.quantite,p.prix_ttc||0,p.total||0,p.fournisseur||'',p.facture||''])];
filename='entrees';
} else if (type==='sorties') {
rows=[['Date','Article','Quantite','Categorie','Secteur'],
...state.sorties.map(s=>[s.date,s.article,s.quantite,s.categorie||'',s.secteur||''])];
filename='sorties';
} else if (type==='alertes') {
const al=state.articles.filter(a=>{const s=getStock(a);return s<=0||(a.stock_min>0&&s<a.stock_min);});
rows=[['Article','Categorie','Stock_actuel','Stock_min','Manque'],
...al.map(a=>{const s=getStock(a);return [a.designation,a.categorie||'',s,a.stock_min||0,Math.max(0,(a.stock_min||0)-s)];})];
filename='alertes';
} else if (type==='fournisseurs') {
rows=[['Nom','IFU','RC','Adresse','Email','Tel','Categorie'],
...state.fournisseurs.map(f=>[f.nom,f.ifu||'',f.rc||'',f.adresse||'',f.email||'',f.tel1||'',f.categorie||''])];
filename='fournisseurs';
}
return { rows, filename };
}

function exportCSV(type) {
const { rows, filename } = buildExportRows(type);
const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${state.appName}_${filename}_${today()}.csv`; a.click();
showToast(`✓ Export CSV : ${filename}`);
}

// Export Excel natif (.xlsx) — plus fiable qu'un CSV pour ouvrir un vrai tableau
// dans Excel (pas de souci d'encodage accents, ni de séparateur , vs ; selon la langue).
function exportXLSX(type) {
const { rows, filename } = buildExportRows(type);
if (!rows.length) { showToast('⚠ Rien à exporter','var(--red)'); return; }
try {
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);
ws['!cols'] = rows[0].map(()=>({wch:20}));
ws['!freeze'] = { xSplit: 0, ySplit: 1 };
XLSX.utils.book_append_sheet(wb, ws, (filename||'Export').substring(0,31));
XLSX.writeFile(wb, `${state.appName}_${filename}_${today()}.xlsx`);
showToast(`✓ Export Excel : ${filename}`);
} catch(err) {
showToast('⚠ Erreur export Excel : '+err.message,'var(--red)');
}
}

function exportJSON() {
const data={
appName:state.appName, appSub:state.appSub,
articles:state.articles, purchases:state.purchases, sorties:state.sorties,
fournisseurs:state.fournisseurs, recettes:state.recettes, ventes:state.ventes,
commandes:state.commandes, activityLog:state.activityLog,
categoriesArticles:state.categoriesArticles, categoriesOffert:state.categoriesOffert,
notificationEmails:state.notificationEmails, lastAlertEmailDate:state.lastAlertEmailDate,
foodCost:state.foodCost, ROWS_PER_PAGE:state.ROWS_PER_PAGE, lightMode:state.lightMode,
exportedAt:new Date().toISOString(), version:'V6'
};
const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${state.appName}_sauvegarde_${today()}.json`; a.click();
try { localStorage.setItem('gestion_stock_last_manual_backup', String(Date.now())); } catch(e) {}
showToast('✓ Sauvegarde JSON complète téléchargée');
if (document.getElementById('page-parametres')?.classList.contains('active')) renderSettings();
}

function restoreJSON(input) {
const file=input.files[0]; if(!file) return;
const reader=new FileReader();
reader.onload=e=>{
try {
const d=JSON.parse(e.target.result);
if(!confirm(`Restaurer la sauvegarde du ${d.exportedAt?new Date(d.exportedAt).toLocaleDateString('fr-FR'):'?'} ?\nCela REMPLACE entièrement les données actuelles par celles du fichier (aucun doublon possible — ce n'est pas un ajout, mais un remplacement complet).`)) return;
state.articles = d.articles || [];
state.purchases = d.purchases || [];
state.sorties = d.sorties || [];
state.fournisseurs = d.fournisseurs || [];
state.recettes = d.recettes || [];
state.ventes = d.ventes || [];
state.commandes = d.commandes || [];
state.activityLog = d.activityLog || [];
state.categoriesArticles = d.categoriesArticles || [];
state.categoriesOffert = d.categoriesOffert || [];
state.notificationEmails = d.notificationEmails || [];
state.lastAlertEmailDate = d.lastAlertEmailDate || '';
state.foodCost = d.foodCost || null;
if (d.appName) state.appName = d.appName;
if (d.appSub) state.appSub = d.appSub;
if (d.ROWS_PER_PAGE) state.ROWS_PER_PAGE = d.ROWS_PER_PAGE;
fcEnsureDefaults();
ensureCategoriesDefaults();
logActivity('restore', 'Restauration d\'une sauvegarde JSON'+(d.exportedAt?' du '+new Date(d.exportedAt).toLocaleDateString('fr-FR'):''));
saveState('all'); applyAppName(); renderDashboard();
if (window.flushSyncNow) window.flushSyncNow();
showToast('✓ Données restaurées et synchronisées avec succès');
} catch(err) { showToast('⚠ Fichier JSON invalide','#f66'); }
};
reader.readAsText(file);
input.value='';
}

function downloadTemplate(type) {
const TEMPLATES = {
articles: {
filename: 'template_articles.xlsx',
sheetName: 'Articles',
headers: ['designation','categorie','unite','stock_min','prix_achat','prix_vente','total_entrant','total_sortant'],
examples: [
['Riz parfumé 25kg','Céréales','sac',10,12500,18000,50,20],
['Huile végétale 5L','Huiles','bidon',5,3500,5000,30,12],
['Sucre cristallisé 50kg','Épicerie','sac',8,22000,30000,25,10],
]
},
entrees: {
filename: 'template_entrees.xlsx',
sheetName: 'Entrées',
headers: ['date','article','quantite','prix_ttc','total','fournisseur','facture','categorie'],
examples: [
['2024-06-01','Riz parfumé 25kg',10,12500,125000,'SOBEMAP','FAC-2024-001','Céréales'],
['2024-06-02','Huile végétale 5L',20,3500,70000,'CDTA','FAC-2024-002','Huiles'],
['2024-06-03','Sucre cristallisé 50kg',5,22000,110000,'SOBEMAP','FAC-2024-003','Épicerie'],
]
},
sorties: {
filename: 'template_sorties.xlsx',
sheetName: 'Sorties',
headers: ['date','article','quantite','secteur','categorie'],
examples: [
['2024-06-05','Riz parfumé 25kg',3,'Cuisine','Céréales'],
['2024-06-06','Huile végétale 5L',5,'Bar','Huiles'],
['2024-06-07','Sucre cristallisé 50kg',2,'Pâtisserie','Épicerie'],
]
},
fournisseurs: {
filename: 'template_fournisseurs.xlsx',
sheetName: 'Fournisseurs',
headers: ['nom','ifu','rc','adresse','email','tel1','categorie'],
examples: [
['SOBEMAP','1234567890123','RC-BJ-2010-001','Cotonou, Akpakpa','sobemap@email.bj','97000001','Grossiste'],
['CDTA','9876543210987','RC-BJ-2015-042','Porto-Novo, Centre','cdta@email.bj','96000002','Distribution'],
]
}
};
const tpl = TEMPLATES[type];
if (!tpl) return;
try {
const wb = XLSX.utils.book_new();
const data = [tpl.headers, ...tpl.examples];
const ws = XLSX.utils.aoa_to_sheet(data);
ws['!cols'] = tpl.headers.map(() => ({ wch: 22 }));
ws['!freeze'] = { xSplit: 0, ySplit: 1 };
XLSX.utils.book_append_sheet(wb, ws, tpl.sheetName);
XLSX.writeFile(wb, tpl.filename);
showToast(`✓ Template "${tpl.filename}" téléchargé`);
} catch(err) {
showToast('⚠ Erreur génération template : ' + err.message, 'var(--red)');
}
}

// ===== IMPORT UNIVERSEL =====
(function(){
// État interne du module import universel
let UI = {
type: 'articles',
currentStep: 1,
WB: null,
currentSheet: null,
allSheets: {},
rawRows: [],
colNames: [],
mappedData: [],
};
// Schéma de champs par type
const SCHEMAS = {
articles: {
hint: 'Articles du catalogue : désignation, catégorie, unité de mesure, stock minimum',
fields: [
{ id:'f-designation', label:'Désignation / Nom article', required:true, patterns:['design','libel','nom','produit','article','item','référence','ref'] },
{ id:'f-categorie', label:'Catégorie', required:false, patterns:['catég','categ','famille','groupe','type','rubrique'] },
{ id:'f-unite', label:'Unité (kg, L, pièce…)', required:false, patterns:['unit','mesure','uom','conditionnement','unité'] },
{ id:'f-stock_min', label:'Stock minimum', required:false, patterns:['stock.min','mini','seuil','min','alerte'] },
{ id:'f-prix_achat', label:'Prix d\'achat (FCFA)', required:false, patterns:['prix.achat','prix_achat','achat','pa','cout','coût','pu.achat'] },
{ id:'f-prix_vente', label:'Prix de vente (FCFA)', required:false, patterns:['prix.vente','prix_vente','vente','pv','tarif','pvente'] },
{ id:'f-total_entrant', label:'Quantité entrante initiale', required:false, patterns:['entrant','entrée','entr','in','reçu','initial'] },
{ id:'f-total_sortant', label:'Quantité sortante initiale', required:false, patterns:['sortant','sortie','sort','out','consommé'] },
{ id:'f-code_barre', label:'Code-barres / QR', required:false, patterns:['code.?barre','barcode','ean','ean13','gtin','qr','code_?barre'] },
]
},
entrees: {
hint: 'Entrées de stock (achats/livraisons) : date, article, quantité, prix, fournisseur',
fields: [
{ id:'f-date', label:'Date', required:true, patterns:['date','jour','day','dat'] },
{ id:'f-article', label:'Article / Désignation', required:true, patterns:['article','design','produit','libel','item','réf','ref','nom'] },
{ id:'f-quantite', label:'Quantité', required:true, patterns:['quant','qté','qte','qty','nombre','volume','quantité'] },
{ id:'f-prix_ttc', label:'Prix TTC (FCFA)', required:false, patterns:['prix','price','pu','pv','tarif','montant.unit','cout','coût','ttc'] },
{ id:'f-total', label:'Total (FCFA)', required:false, patterns:['^total$','montant','somme','amount','valeur'] },
{ id:'f-fournisseur', label:'Fournisseur', required:false, patterns:['fourn','vendor','supplier','provide','source'] },
{ id:'f-facture', label:'N° Facture / Bon', required:false, patterns:['facture','fact','invoice','bon','bl','numéro','ref.doc'] },
{ id:'f-categorie', label:'Catégorie', required:false, patterns:['catég','categ','famille','groupe','type'] },
]
},
sorties: {
hint: 'Sorties de stock (consommations/distributions) : date, article, quantité, secteur',
fields: [
{ id:'f-date', label:'Date', required:true, patterns:['date','jour','day','dat'] },
{ id:'f-article', label:'Article / Désignation', required:true, patterns:['article','design','produit','libel','item','réf','ref','nom'] },
{ id:'f-quantite', label:'Quantité', required:true, patterns:['quant','qté','qte','qty','nombre','volume','quantité'] },
{ id:'f-secteur', label:'Secteur / Destination', required:false, patterns:['secteur','section','service','dest','lieu','cuisine','bar','departement'] },
{ id:'f-categorie', label:'Catégorie', required:false, patterns:['catég','categ','famille','groupe','type'] },
]
},
fournisseurs: {
hint: 'Fournisseurs : nom, IFU, RC, adresse, email, téléphone, catégorie',
fields: [
{ id:'f-nom', label:'Nom du fournisseur', required:true, patterns:['nom','name','raison','société','fourn','vendor','supplier','entreprise'] },
{ id:'f-ifu', label:'IFU', required:false, patterns:['ifu','identif.fiscal','num.fiscal','taxid','nif'] },
{ id:'f-rc', label:'RC (Registre Commerce)', required:false, patterns:['rc','rccm','registre','commerce','numéro.rc'] },
{ id:'f-adresse', label:'Adresse', required:false, patterns:['adresse','address','localité','ville','quartier','lieu'] },
{ id:'f-email', label:'Email', required:false, patterns:['email','mail','courriel','e-mail'] },
{ id:'f-tel1', label:'Téléphone', required:false, patterns:['tel','tél','phone','mobile','gsm','contact','num','fixe'] },
{ id:'f-categorie', label:'Catégorie', required:false, patterns:['catég','categ','famille','type'] },
]
}
};
function uiLog(step, msg, cls='') {
const el = document.getElementById('ui-log'+step);
if (!el) return;
el.style.display = 'block';
el.innerHTML += `<div class="${cls}">${msg}</div>`;
el.scrollTop = el.scrollHeight;
}
function uiClearLog(step) {
const el = document.getElementById('ui-log'+step);
if (el) { el.innerHTML=''; el.style.display='none'; }
}
window.uiSelectType = function(type) {
UI.type = type;
document.querySelectorAll('.ui-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type===type));
const schema = SCHEMAS[type];
document.getElementById('ui-type-hint').textContent = schema ? schema.hint : '';
if (UI.currentStep >= 3) uiBuildMappingGrid();
};
window.uiHandleDrop = function(e) {
e.preventDefault();
document.getElementById('ui-drop-zone').classList.remove('over');
const f = e.dataTransfer.files[0];
if (f) uiLoadFile(f);
};
window.uiLoadFile = function(file) {
if (!file) return;
uiClearLog(1);
uiLog(1, `📂 Lecture de <strong>${file.name}</strong> (${(file.size/1024).toFixed(1)} Ko)`, 'info');
UI.WB = null; UI.allSheets = {};
const isCSV = /\.(csv|tsv|txt)$/i.test(file.name);
if (isCSV) {
const r = new FileReader();
r.onload = ev => {
try {
const text = ev.target.result;
const sep = text.includes('\t') ? '\t' : (text.includes(';') ? ';' : ',');
const rows = text.split(/\r?\n/).map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g,'')));
UI.allSheets['Données'] = { data: rows, info: `${rows.length} lignes` };
uiLog(1, `✓ CSV lu · ${rows.length} lignes · séparateur : "${sep==='\t'?'tabulation':sep}"`, 'ok');
uiSetupSheets(); uiGoStep(2);
} catch(err) { uiLog(1, '⚠ Erreur CSV : '+err.message, 'err'); }
};
r.readAsText(file, 'UTF-8');
return;
}
const r = new FileReader();
r.onload = ev => {
try {
const opts = { type:'array', cellDates:true, cellNF:true, cellStyles:false, sheetRows:0 };
UI.WB = XLSX.read(ev.target.result, opts);
uiLog(1, `✓ Classeur ouvert · <strong>${UI.WB.SheetNames.length} feuille(s)</strong> : ${UI.WB.SheetNames.join(', ')}`, 'ok');
UI.WB.SheetNames.forEach(sn => {
const ws = UI.WB.Sheets[sn];
const ref = ws['!ref'];
if (!ref) { UI.allSheets[sn] = { data:[], info:'vide' }; return; }
const range = XLSX.utils.decode_range(ref);
const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false, dateNF:'YYYY-MM-DD', blankrows:true });
UI.allSheets[sn] = { data:rows, info:`${rows.length} lignes × ${range.e.c-range.s.c+1} col.`, ws };
uiLog(1, `Feuille "${sn}" : ${rows.length} lignes`);
});
uiSetupSheets(); uiGoStep(2);
} catch(err) {
uiLog(1, '⚠ Erreur : '+err.message+' — Tentative mode compatibilité…', 'warn');
try {
const wb2 = XLSX.read(ev.target.result, { type:'array', cellDates:false, raw:true });
UI.WB = wb2;
UI.WB.SheetNames.forEach(sn => {
const rows = XLSX.utils.sheet_to_json(wb2.Sheets[sn], { header:1, defval:'', raw:true });
UI.allSheets[sn] = { data:rows, info:`${rows.length} lignes (compat.)`, ws:wb2.Sheets[sn] };
});
uiLog(1, '✓ Lecture mode compatibilité réussie', 'ok');
uiSetupSheets(); uiGoStep(2);
} catch(err2) { uiLog(1, '✗ Échec total : '+err2.message, 'err'); }
}
};
r.readAsArrayBuffer(file);
};
function uiSetupSheets() {
const grid = document.getElementById('ui-sheets-grid');
grid.innerHTML = Object.keys(UI.allSheets).map((sn, i) =>
`<button class="ui-sheet-btn${i===0?' active':''}" id="usb-${sn.replace(/\W/g,'_')}" onclick="uiSelectSheet('${sn.replace(/'/g,"\\'")}')">📋 ${sn} <span style="font-size:10px;opacity:0.6;margin-left:4px">${UI.allSheets[sn].info}</span></button>`
).join('');
uiSelectSheet(Object.keys(UI.allSheets)[0]);
}
window.uiSelectSheet = function(sn) {
document.querySelectorAll('.ui-sheet-btn').forEach(b => b.classList.remove('active'));
const btn = document.getElementById('usb-'+sn.replace(/\W/g,'_'));
if (btn) btn.classList.add('active');
UI.currentSheet = sn;
uiClearLog(2);
uiRepreview();
};
window.uiRepreview = function() {
if (!UI.currentSheet) return;
const headerRow = parseInt(document.getElementById('ui-opt-header').value||1) - 1;
const skipRows = parseInt(document.getElementById('ui-opt-skip').value||0);
const allRows = UI.allSheets[UI.currentSheet].data || [];
let bestHeaderIdx = headerRow;
if (headerRow === 0) {
let bestScore = 0;
allRows.slice(0, 15).forEach((row, i) => {
const score = row.filter(c => c !== '' && c !== null && c !== undefined).length;
if (score > bestScore) { bestScore = score; bestHeaderIdx = i; }
});
}
const header = allRows[bestHeaderIdx] || [];
UI.rawRows = allRows.slice(bestHeaderIdx + 1 + skipRows).filter(r => r.some(c => c !== '' && c !== null));
UI.colNames = header.map((h, i) => h || `Col ${i+1}`);
document.getElementById('ui-preview-info').textContent = `${UI.rawRows.length} lignes · ${UI.colNames.length} colonnes`;
const previewRows = UI.rawRows.slice(0, 15);
const thead = `<tr>${UI.colNames.map(h => `<th style="background:var(--surface2);padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);font-size:11px;color:var(--text3);white-space:nowrap;position:sticky;top:0">${h||'<em>vide</em>'}</th>`).join('')}</tr>`;
const tbody = previewRows.map(row => `<tr>${UI.colNames.map((_,i) => {
const v = row[i]; const vs = String(v||'');
if (v===''||v===null||v===undefined) return `<td style="padding:5px 10px;color:var(--text3);font-style:italic;border-bottom:1px solid rgba(46,46,52,0.3);font-size:12px">—</td>`;
if (!isNaN(parseFloat(vs)) && vs.trim()!=='') return `<td style="padding:5px 10px;color:var(--blue);text-align:right;border-bottom:1px solid rgba(46,46,52,0.3);font-size:12px">${vs}</td>`;
if (/\d{2,4}[-/]\d{1,2}[-/]\d{1,4}/.test(vs)) return `<td style="padding:5px 10px;color:var(--green);border-bottom:1px solid rgba(46,46,52,0.3);font-size:12px">${vs}</td>`;
return `<td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3);font-size:12px" title="${vs}">${vs.length>28?vs.substring(0,28)+'…':vs}</td>`;
}).join('')}</tr>`).join('');
document.getElementById('ui-preview-wrap').innerHTML = `<table style="width:100%;border-collapse:collapse"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
uiLog(2, `✓ Feuille "${UI.currentSheet}" — en-tête ligne ${bestHeaderIdx+1} · ${UI.rawRows.length} lignes de données`, 'ok');
};
window.uiGoStep = function(n) {
if (n === 3) uiBuildMappingGrid();
document.querySelectorAll('.ui-panel').forEach((p,i) => p.classList.toggle('active', i+1===n));
document.querySelectorAll('.ui-step').forEach((s,i) => {
s.classList.toggle('active', i+1===n);
s.classList.toggle('done', i+1<n);
});
UI.currentStep = n;
};
function uiBuildMappingGrid() {
const schema = SCHEMAS[UI.type];
if (!schema) return;
uiClearLog(3);
const none = '<option value="">— Non mappé —</option>';
const opts = UI.colNames.map((h,i) => `<option value="${i}">${h||'Col '+(i+1)}</option>`).join('');
const hs = UI.colNames.map(h => String(h).toLowerCase().trim());
const find = patterns => { for(let p of patterns){ const i=hs.findIndex(h=>new RegExp(p,'i').test(h)); if(i>=0) return i; } return -1; };
const grid = document.getElementById('ui-mapping-grid');
grid.innerHTML = schema.fields.map(f => `
<div class="ui-map-row">
<div class="ui-map-label">${f.label}${f.required?' <span style="color:var(--gold)">*</span>':''}</div>
<select class="ui-map-select${f.required?' ui-map-required':''}" id="${f.id}">${none}${opts}</select>
</div>
`).join('');
let mappedCount = 0;
schema.fields.forEach(f => {
const idx = find(f.patterns);
if (idx >= 0) { document.getElementById(f.id).value = idx; mappedCount++; }
});
uiLog(3, `✓ Auto-mapping : <strong>${mappedCount}/${schema.fields.length}</strong> colonnes détectées automatiquement`, mappedCount>0?'ok':'warn');
if (mappedCount < schema.fields.filter(f=>f.required).length) {
uiLog(3, '⚠ Certains champs obligatoires n\'ont pas été détectés — vérifiez les sélecteurs ci-dessus', 'warn');
}
}
window.uiDoImport = function() {
uiClearLog(4);
const schema = SCHEMAS[UI.type];
if (!schema) return;
const gi = id => { const v=document.getElementById(id)?.value; return (v===''||v===null||v===undefined)?-1:parseInt(v); };
const gv = (row, idx) => idx >= 0 ? String(row[idx]||'').trim() : '';
const missing = schema.fields.filter(f => f.required && gi(f.id) < 0).map(f => f.label);
if (missing.length) {
uiLog(4, '✗ Champs obligatoires non mappés : '+missing.join(', '), 'err');
uiGoStep(4); return;
}
UI.mappedData = [];
let ok=0, skipped=0, dateErr=0;
if (UI.type === 'articles') {
const iDesig=gi('f-designation'), iCat=gi('f-categorie'), iUnite=gi('f-unite');
const iMin=gi('f-stock_min'), iPrixA=gi('f-prix_achat'), iPrixV=gi('f-prix_vente');
const iEntrant=gi('f-total_entrant'), iSortant=gi('f-total_sortant'), iCodeBarre=gi('f-code_barre');
UI.rawRows.forEach(row => {
const d = gv(row, iDesig);
if (!d) { skipped++; return; }
UI.mappedData.push({
designation: d, categorie: gv(row, iCat), unite: gv(row, iUnite),
stock_min: uiParseNum(row[iMin]) || 0,
prix_achat: uiParseNum(row[iPrixA]) || 0,
prix_vente: uiParseNum(row[iPrixV]) || 0,
total_entrant: uiParseNum(row[iEntrant]) || 0,
total_sortant: uiParseNum(row[iSortant]) || 0,
code_barre: gv(row, iCodeBarre),
});
ok++;
});
} else if (UI.type === 'entrees') {
const iDate=gi('f-date'), iArt=gi('f-article'), iQte=gi('f-quantite');
const iPrix=gi('f-prix_ttc'), iTotal=gi('f-total'), iFourn=gi('f-fournisseur');
const iFacture=gi('f-facture'), iCat=gi('f-categorie');
UI.rawRows.forEach(row => {
const article = gv(row, iArt);
const dateStr = uiParseDate(row[iDate]);
const qte = uiParseNum(row[iQte]);
if (!article) { skipped++; return; }
if (!dateStr) { dateErr++; return; }
if (!qte) { skipped++; return; }
UI.mappedData.push({
date: dateStr, article, quantite: qte,
prix_ttc: uiParseNum(row[iPrix]) || 0,
total: uiParseNum(row[iTotal]) || 0,
fournisseur: gv(row, iFourn), facture: gv(row, iFacture),
categorie: gv(row, iCat),
});
ok++;
});
} else if (UI.type === 'sorties') {
const iDate=gi('f-date'), iArt=gi('f-article'), iQte=gi('f-quantite');
const iSecteur=gi('f-secteur'), iCat=gi('f-categorie');
UI.rawRows.forEach(row => {
const article = gv(row, iArt);
const dateStr = uiParseDate(row[iDate]);
const qte = uiParseNum(row[iQte]);
if (!article) { skipped++; return; }
if (!dateStr) { dateErr++; return; }
if (!qte) { skipped++; return; }
UI.mappedData.push({
date: dateStr, article, quantite: qte,
secteur: gv(row, iSecteur), categorie: gv(row, iCat),
});
ok++;
});
} else if (UI.type === 'fournisseurs') {
const iNom=gi('f-nom'), iIfu=gi('f-ifu'), iRc=gi('f-rc');
const iAdr=gi('f-adresse'), iEmail=gi('f-email'), iTel=gi('f-tel1'), iCat=gi('f-categorie');
UI.rawRows.forEach(row => {
const nom = gv(row, iNom);
if (!nom) { skipped++; return; }
UI.mappedData.push({
nom, ifu: gv(row, iIfu), rc: gv(row, iRc),
adresse: gv(row, iAdr), email: gv(row, iEmail),
tel1: gv(row, iTel), categorie: gv(row, iCat),
});
ok++;
});
}
uiLog(4, `📊 Lignes analysées : <strong>${UI.rawRows.length}</strong>`, 'info');
uiLog(4, `✓ Lignes valides : <strong>${ok}</strong>`, 'ok');
if (skipped) uiLog(4, `⚠ Ignorées (données manquantes) : ${skipped}`, 'warn');
if (dateErr) uiLog(4, `⚠ Dates non reconnues : ${dateErr} ligne(s) ignorée(s)`, 'warn');
const pillsHtml = [
`<span class="ui-pill info">📋 ${ok} ligne(s)</span>`,
skipped ? `<span class="ui-pill warn">⚠ ${skipped} ignorée(s)</span>` : '',
dateErr ? `<span class="ui-pill warn">📅 ${dateErr} date(s) invalide(s)</span>` : '',
`<span class="ui-pill">${({articles:'▦ Articles', entrees:'↓ Entrées', sorties:'↑ Sorties', fournisseurs:'◉ Fournisseurs'})[UI.type]}</span>`,
].filter(Boolean).join('');
document.getElementById('ui-result-pills').innerHTML = pillsHtml;
if (UI.mappedData.length) {
document.getElementById('ui-result-card').style.display = 'block';
document.getElementById('ui-result-count').textContent = `(${UI.mappedData.length} lignes)`;
const keys = Object.keys(UI.mappedData[0]);
const thead = `<tr>${keys.map(k=>`<th style="background:var(--surface2);padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);font-size:11px;color:var(--text3);position:sticky;top:0">${k}</th>`).join('')}</tr>`;
const tbody = UI.mappedData.slice(0,30).map(row=>`<tr>${keys.map(k=>{const v=String(row[k]||'');return`<td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3);font-size:12px" title="${v}">${v.length>25?v.substring(0,25)+'…':v||'—'}</td>`}).join('')}</tr>`).join('');
document.getElementById('ui-result-table').innerHTML = `<table style="width:100%;border-collapse:collapse"><thead>${thead}</thead><tbody>${tbody}${UI.mappedData.length>30?`<tr><td colspan="${keys.length}" style="padding:8px 10px;font-size:11px;color:var(--text3)">…et ${UI.mappedData.length-30} autres lignes</td></tr>`:''}</tbody></table>`;
} else {
document.getElementById('ui-result-card').style.display = 'none';
uiLog(4, '✗ Aucune donnée valide — vérifiez le mapping des colonnes', 'err');
}
uiGoStep(4);
};
window.uiConfirmImport = function() {
if (!UI.mappedData.length) { showToast('⚠ Aucune donnée à importer', 'var(--red)'); return; }
let added = 0, skipped = 0;
if (UI.type === 'articles') {
UI.mappedData.forEach(r => {
const d = r.designation.trim();
if (!d) { skipped++; return; }
if (state.articles.find(a => a.designation.toLowerCase()===d.toLowerCase())) { skipped++; return; }
state.articles.push({ id: Date.now()+Math.random(), designation:d, categorie:r.categorie||'', unite:r.unite||'', stock_min:r.stock_min||0, prix_achat:r.prix_achat||0, prix_vente:r.prix_vente||0, code_barre:r.code_barre||'', total_entrant:r.total_entrant||0, total_sortant:r.total_sortant||0 });
added++;
});
} else if (UI.type === 'entrees') {
UI.mappedData.forEach(r => {
state.purchases.push({ date:r.date, article:r.article, quantite:r.quantite, prix_ttc:r.prix_ttc||0, total:r.total||0, fournisseur:r.fournisseur||'', facture:r.facture||'', categorie:r.categorie||'' });
const art = state.articles.find(a => a.designation.toLowerCase()===r.article.toLowerCase());
if (art) art.total_entrant = (art.total_entrant||0) + r.quantite;
added++;
});
} else if (UI.type === 'sorties') {
UI.mappedData.forEach(r => {
state.sorties.push({ date:r.date, article:r.article, quantite:r.quantite, secteur:r.secteur||'', categorie:r.categorie||'' });
const art = state.articles.find(a => a.designation.toLowerCase()===r.article.toLowerCase());
if (art) art.total_sortant = (art.total_sortant||0) + r.quantite;
added++;
});
} else if (UI.type === 'fournisseurs') {
UI.mappedData.forEach(r => {
if (state.fournisseurs.find(f => f.nom.toLowerCase()===r.nom.toLowerCase())) { skipped++; return; }
state.fournisseurs.push({ nom:r.nom, ifu:r.ifu||'', rc:r.rc||'', adresse:r.adresse||'', email:r.email||'', tel1:r.tel1||'', categorie:r.categorie||'' });
added++;
});
}
logActivity('import', 'Import '+UI.type+' : '+added+' ajouté(s)'+(skipped?', '+skipped+' doublon(s) ignoré(s)':''));
// Le domaine à synchroniser dépend du type importé ; entrées/sorties touchent aussi les
// articles (mise à jour de total_entrant/total_sortant sur les articles existants).
const IMPORT_DOMAINS = { articles:['articles'], entrees:['purchases','articles'], sorties:['sorties','articles'], fournisseurs:['fournisseurs'] };
saveState(IMPORT_DOMAINS[UI.type] || 'all'); renderDashboard();
showToast(`✓ Import ${UI.type} : ${added} ajouté(s)${skipped?', '+skipped+' doublon(s) ignoré(s)':''}`, 'var(--green)');
UI.mappedData = [];
document.getElementById('ui-result-card').style.display = 'none';
uiLog(4, `✓ <strong>${added}</strong> enregistrement(s) ajouté(s) au stock${skipped?' · '+skipped+' doublon(s) ignoré(s)':''}`, 'ok');
};
window.uiResetImport = function() {
UI.WB=null; UI.currentSheet=null; UI.allSheets={}; UI.rawRows=[]; UI.colNames=[]; UI.mappedData=[];
[1,2,3,4].forEach(i => uiClearLog(i));
document.getElementById('ui-preview-wrap').innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text3);font-size:13px">Sélectionnez une feuille</div>';
document.getElementById('ui-sheets-grid').innerHTML = '';
document.getElementById('ui-result-pills').innerHTML = '';
document.getElementById('ui-result-card').style.display = 'none';
const mg = document.getElementById('ui-mapping-grid'); if(mg) mg.innerHTML='';
document.getElementById('ui-file-in').value = '';
document.querySelectorAll('.ui-panel').forEach((p,i) => p.classList.toggle('active', i===0));
document.querySelectorAll('.ui-step').forEach((s,i) => { s.classList.toggle('active', i===0); s.classList.remove('done'); });
UI.currentStep = 1;
};
function uiParseDate(v) {
if (!v && v!==0) return null;
if (v instanceof Date) return uiFmtDate(v);
if (typeof v==='number' && v>40000 && v<80000) { return uiFmtDate(new Date(Math.round((v-25569)*86400*1000))); }
const s = String(v).trim().replace(/\./g,'/');
const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
if (ymd) return `${ymd[1]}-${ymd[2].padStart(2,'0')}-${ymd[3].padStart(2,'0')}`;
const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
const dmy2 = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
if (dmy2) { const y=parseInt(dmy2[3]); const yy=y<50?2000+y:1900+y; return `${yy}-${dmy2[2].padStart(2,'0')}-${dmy2[1].padStart(2,'0')}`; }
const d = new Date(s);
if (!isNaN(d.getTime()) && d.getFullYear()>2000) return uiFmtDate(d);
return null;
}
function uiFmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function uiParseNum(v) {
if (!v && v!==0) return null;
if (typeof v==='number') return Math.abs(v);
const s = String(v).replace(/\s/g,'').replace(/[^\d,.\-+]/g,'').replace(',','.');
const n = parseFloat(s); return isNaN(n) ? null : Math.abs(n);
}
window.addEventListener('DOMContentLoaded', () => {
const schema = SCHEMAS[UI.type];
const hint = document.getElementById('ui-type-hint');
if (hint && schema) hint.textContent = schema.hint;
});
})();
