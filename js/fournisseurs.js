// ============================================================
// NODAS HUB — module: fournisseurs.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function saveFournisseur() {
const editNom = document.getElementById('four-edit-nom').value;
const nom = document.getElementById('four-nom').value.trim();
if (!nom) { showToast('⚠ Nom obligatoire','#f66'); return; }
const data = {
nom, ifu:document.getElementById('four-ifu').value, rc:document.getElementById('four-rc').value,
adresse:document.getElementById('four-adresse').value, email:document.getElementById('four-email').value,
tel1:document.getElementById('four-tel').value, categorie:document.getElementById('four-cat').value
};
if (editNom) {
const idx = state.fournisseurs.findIndex(f => f.nom===editNom);
if (idx>=0) state.fournisseurs[idx] = data;
logActivity('fournisseur_edit', 'Fournisseur modifié : '+nom);
showToast(`✓ Fournisseur modifié : ${nom}`);
} else {
state.fournisseurs.push(data);
logActivity('fournisseur_create', 'Fournisseur ajouté : '+nom);
showToast(`✓ Fournisseur ajouté : ${nom}`);
}
saveState('fournisseurs'); closeModal('modal-fournisseur'); renderFournisseurs();
}

function editFournisseur(nom) {
const f = state.fournisseurs.find(x => x.nom===nom);
if (!f) return;
document.getElementById('four-edit-nom').value = nom;
document.getElementById('four-nom').value = f.nom;
document.getElementById('four-ifu').value = f.ifu||'';
document.getElementById('four-rc').value = f.rc||'';
document.getElementById('four-adresse').value = f.adresse||'';
document.getElementById('four-email').value = f.email||'';
document.getElementById('four-tel').value = f.tel1||'';
document.getElementById('four-cat').value = f.categorie||'';
document.getElementById('modal-four-title').textContent = '✏ Modifier fournisseur';
document.getElementById('four-save-btn').textContent = 'Sauvegarder';
document.getElementById('modal-fournisseur').classList.add('open');
}

function deleteFournisseur(nom) {
if (window.isEconome && window.isEconome()) { showToast('⚠ Action réservée à l\'administrateur','var(--red)'); return; }
if (!confirm(`Supprimer "${nom}" ?`)) return;
state.fournisseurs = state.fournisseurs.filter(f => f.nom!==nom);
logActivity('fournisseur_delete', 'Fournisseur supprimé : '+nom);
saveState('fournisseurs'); renderFournisseurs();
showToast(`🗑 Fournisseur supprimé : ${nom}`, '#f66');
}

function showFicheFournisseur(nom, keepFilter) {
const f = state.fournisseurs.find(x=>x.nom===nom);
if (!f) return;
window._ficheFourNom = nom;
let from = '', to = '';
if (keepFilter) {
from = document.getElementById('fiche-four-from')?.value || '';
to = document.getElementById('fiche-four-to')?.value || '';
}
let achats = state.purchases.filter(p=>p.fournisseur===nom);
if (from) achats = achats.filter(p=>p.date>=from);
if (to) achats = achats.filter(p=>p.date<=to);
achats = achats.sort((a,b)=>b.date>a.date?1:-1);
const total = achats.reduce((s,p)=>s+(p.total||0),0);
const nbArt = [...new Set(achats.map(p=>p.article))].length;
const nbFactures = countFactures(achats);
const lastA = achats[0];
const rows = achats.length
? achats.map((p,i)=>'<tr style="background:'+(i%2?'var(--surface2)':'')+'">'
+'<td style="padding:6px 10px;border-bottom:1px solid rgba(46,46,52,0.3)">'+fmtDate(p.date)+'</td>'
+'<td style="padding:6px 10px;border-bottom:1px solid rgba(46,46,52,0.3);font-weight:500">'+p.article+'</td>'
+'<td style="padding:6px 10px;border-bottom:1px solid rgba(46,46,52,0.3);text-align:right">'+fmt(p.quantite)+'</td>'
+'<td style="padding:6px 10px;border-bottom:1px solid rgba(46,46,52,0.3);text-align:right;color:var(--gold)">'+(p.total>0?fmtNum(Math.round(p.total))+' F':'—')+'</td>'
+'<td style="padding:6px 10px;border-bottom:1px solid rgba(46,46,52,0.3);font-size:11px;color:var(--text3)">'+(p.facture||'—')+'</td>'
+'</tr>').join('')
: '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--text3)">Aucun achat sur cette période</td></tr>';
document.getElementById('fiche-four-title').textContent = f.nom;
document.getElementById('fiche-four-body').innerHTML =
'<div style="padding:18px">'
+'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--surface2);border-radius:10px;padding:12px 14px;margin-bottom:18px;border:1px solid var(--border)">'
+'<label style="font-size:11px;color:var(--text3);margin:0;text-transform:none;letter-spacing:0">Période :</label>'
+'<input type="date" class="filter-select" id="fiche-four-from" value="'+from+'" onchange="filterFicheFournisseur()">'
+'<span style="color:var(--text3);font-size:12px">→</span>'
+'<input type="date" class="filter-select" id="fiche-four-to" value="'+to+'" onchange="filterFicheFournisseur()">'
+(from||to?'<button class="btn btn-outline btn-sm" onclick="document.getElementById(\'fiche-four-from\').value=\'\';document.getElementById(\'fiche-four-to\').value=\'\';filterFicheFournisseur()">Réinitialiser</button>':'<span style="font-size:11px;color:var(--text3)">Toutes dates par défaut</span>')
+'</div>'
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">'
+'<div style="background:var(--surface2);border-radius:10px;padding:16px;border:1px solid var(--border)">'
+'<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Coordonnées</div>'
+(f.categorie?'<div style="margin-bottom:10px"><span class="badge badge-gray">'+f.categorie+'</span></div>':'')
+(f.adresse?'<div style="font-size:13px;margin-bottom:6px">📍 '+f.adresse+'</div>':'')
+(f.tel1?'<div style="font-size:13px;margin-bottom:6px">📞 '+f.tel1+'</div>':'')
+(f.email?'<div style="font-size:13px;margin-bottom:6px">✉ '+f.email+'</div>':'')
+(f.ifu?'<div style="font-size:12px;color:var(--text3);margin-bottom:4px">IFU: '+f.ifu+'</div>':'')
+(f.rc?'<div style="font-size:12px;color:var(--text3)">RC: '+f.rc+'</div>':'')
+'</div>'
+'<div style="display:flex;flex-direction:column;gap:10px">'
+kpiBox('Total achats',fmtNum(Math.round(total))+' F','var(--gold)')
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
+kpiBox('Factures',nbFactures)
+kpiBox('Articles',nbArt)
+'</div>'
+(lastA?'<div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border);font-size:12px"><div style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Dernier achat</div><div style="font-weight:600">'+fmtDate(lastA.date)+'</div><div style="color:var(--text3)">'+lastA.article+' · '+fmtNum(lastA.total||0)+' F</div></div>':'')
+'</div></div>'
+'<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:6px">Historique achats ('+achats.length+' ligne'+(achats.length>1?'s':'')+' · '+nbFactures+' facture'+(nbFactures>1?'s':'')+')</div>'
+'<div style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">'
+'<table style="width:100%;border-collapse:collapse;font-size:12px">'
+'<thead><tr>'
+'<th style="background:var(--surface2);padding:7px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Date</th>'
+'<th style="background:var(--surface2);padding:7px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Article</th>'
+'<th style="background:var(--surface2);padding:7px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3);text-align:right">Qté</th>'
+'<th style="background:var(--surface2);padding:7px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3);text-align:right">Total</th>'
+'<th style="background:var(--surface2);padding:7px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Facture</th>'
+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
document.getElementById('modal-fiche-fournisseur').classList.add('open');
}

function exportFicheFournisseurPDF() {
const nom = window._ficheFourNom;
const f = state.fournisseurs.find(x=>x.nom===nom);
if (!f) return;
const from = document.getElementById('fiche-four-from')?.value || '';
const to = document.getElementById('fiche-four-to')?.value || '';
let achats = state.purchases.filter(p=>p.fournisseur===nom);
if (from) achats = achats.filter(p=>p.date>=from);
if (to) achats = achats.filter(p=>p.date<=to);
achats = achats.sort((a,b)=>b.date>a.date?1:-1);
const total = achats.reduce((s,p)=>s+(p.total||0),0);
const nbFactures = countFactures(achats);
const periodeLabel = (from||to) ? ('Période : '+(from?fmtDate(from):'…')+' → '+(to?fmtDate(to):'…')) : 'Toutes les dates';
const rows = achats.map(p=>'<tr><td>'+fmtDate(p.date)+'</td><td>'+p.article+'</td><td>'+fmt(p.quantite)+'</td><td>'+(p.prix_ttc>0?fmtNum(p.prix_ttc)+' F':'—')+'</td><td>'+(p.total>0?fmtNum(Math.round(p.total))+' F':'—')+'</td><td>'+(p.facture||'—')+'</td></tr>').join('') || '<tr><td colspan="6" style="color:#aaa">Aucun achat sur cette période</td></tr>';
const w = window.open('','_blank');
w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fiche Fournisseur</title>'
+'<style>body{font-family:Arial,sans-serif;margin:30px;color:#333;font-size:13px}'
+'h1{font-size:18px;color:#c9a84c}.meta{color:#888;font-size:11px;margin-bottom:20px}'
+'.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}'
+'.box{background:#f9f9f9;border:1px solid #ddd;border-radius:8px;padding:14px}'
+'.box h3{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px}'
+'.total{background:#f5f0e8;border-left:4px solid #c9a84c;padding:10px 14px;border-radius:4px;margin-bottom:20px}'
+'table{width:100%;border-collapse:collapse;font-size:12px}'
+'th{background:#f5f0e8;padding:7px 10px;text-align:left;border-bottom:2px solid #c9a84c;font-size:11px}'
+'td{padding:6px 10px;border-bottom:1px solid #eee}tr:nth-child(even){background:#fafafa}'
+'@media print{button{display:none}}</style></head><body>'
+'<h1>◉ '+f.nom+'</h1>'
+'<p class="meta">'+state.appName+' · Fiche générée le '+new Date().toLocaleDateString('fr-FR')+' · '+periodeLabel+' · NODAS HUB</p>'
+'<div class="grid">'
+'<div class="box"><h3>Coordonnées</h3>'
+(f.adresse?'<div>📍 '+f.adresse+'</div>':'')
+(f.tel1?'<div>📞 '+f.tel1+'</div>':'')
+(f.email?'<div>✉ '+f.email+'</div>':'')
+(!f.adresse&&!f.tel1&&!f.email?'<div style="color:#aaa">Non renseignées</div>':'')
+'</div>'
+'<div class="box"><h3>Informations légales</h3>'
+(f.ifu?'<div>IFU : '+f.ifu+'</div>':'')
+(f.rc?'<div>RC : '+f.rc+'</div>':'')
+(f.categorie?'<div>Catégorie : '+f.categorie+'</div>':'')
+(!f.ifu&&!f.rc?'<div style="color:#aaa">Non renseignées</div>':'')
+'</div></div>'
+'<div class="total"><strong>'+nbFactures+' facture'+(nbFactures>1?'s':'')+' enregistrée'+(nbFactures>1?'s':'')+'</strong> ('+achats.length+' ligne'+(achats.length>1?'s':'')+') &nbsp;·&nbsp; Total : <strong style="color:#c9a84c;font-size:15px">'+fmtNum(Math.round(total))+' FCFA</strong></div>'
+'<table><thead><tr><th>Date</th><th>Article</th><th>Qté</th><th>Prix TTC</th><th>Total</th><th>N° Facture</th></tr></thead><tbody>'+rows+'</tbody></table>'
+'</body></html>');
w.document.close();
setTimeout(()=>w.print(),400);
}

function goToHistoriquePrixFournisseur() {
const nom = window._ficheFourNom;
closeModal('modal-fiche-fournisseur');
showPage('historiqueprix');
setTimeout(() => {
const sel = document.getElementById('filter-hp-fournisseur');
if (sel && nom) { sel.value = nom; renderHistoriquePrix(); }
}, 50);
}

function renderFournisseurs() {
const q = document.getElementById('search-fournisseurs').value.toLowerCase();
const filtered = state.fournisseurs.filter(f => !q || f.nom.toLowerCase().includes(q) || (f.adresse||'').toLowerCase().includes(q));
document.getElementById('fournisseurs-grid').innerHTML = filtered.length ? filtered.map(f=>`
<div class="card" style="padding:0">
<div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
<div style="display:flex;align-items:flex-start;gap:10px">
<div style="width:38px;height:38px;border-radius:10px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">◉</div>
<div>
<div style="font-weight:600;font-size:14px;color:var(--text)">${f.nom}</div>
${f.categorie?`<span class="badge badge-gray" style="margin-top:4px">${f.categorie}</span>`:''}
</div>
</div>
<div style="display:flex;gap:6px;flex-shrink:0">
<button class="btn btn-outline btn-sm" onclick="showFicheFournisseur('${f.nom.replace(/'/g,"\\\'")}')">📄 Fiche</button>
<button class="btn btn-outline btn-sm" onclick="editFournisseur('${f.nom.replace(/'/g,"\\'")}')">✏</button>
<button class="btn btn-danger btn-sm" onclick="deleteFournisseur('${f.nom.replace(/'/g,"\\'")}')">🗑</button>
</div>
</div>
<div style="padding:12px 20px;font-size:12px;color:var(--text2);display:flex;flex-direction:column;gap:5px">
${f.adresse?`<div>📍 ${f.adresse}</div>`:''}
${f.email?`<div>✉ ${f.email}</div>`:''}
${f.tel1?`<div>📞 ${f.tel1}</div>`:''}
${f.ifu?`<div style="color:var(--text3)">IFU: ${f.ifu}</div>`:''}
${f.rc?`<div style="color:var(--text3)">RC: ${f.rc}</div>`:''}
</div>
</div>`).join('') : '<div class="empty"><div class="empty-icon">◉</div><div class="empty-text">Aucun fournisseur</div></div>';
}

window.filterFicheFournisseur = function() { showFicheFournisseur(window._ficheFourNom, true); };
