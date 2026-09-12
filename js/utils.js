// ============================================================
// NODAS HUB — module: utils.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function getStock(art) { return (art.total_entrant||0) - (art.total_sortant||0); }

function stockBadge(art) {
const s = getStock(art);
if (s <= 0) return '<span class="badge badge-red">Épuisé</span>';
if (art.stock_min > 0 && s < art.stock_min) return '<span class="badge badge-orange">Alerte</span>';
return '<span class="badge badge-green">OK</span>';
}

function fmt(n) {
if (n === null || n === undefined || n === '') return '—';
const v = Number(n);
return v % 1 === 0 ? String(v) : v.toFixed(2);
}

function fmtNum(n) {
return Number(n).toLocaleString('fr-FR');
}

function fmtDate(d) {
if (!d) return '—';
try { return new Date(d).toLocaleDateString('fr-FR'); } catch(e) { return d; }
}

// Compte le nombre de FACTURES distinctes (et non le nombre de lignes/articles).
// Plusieurs lignes partageant le même numéro de facture ne comptent que pour 1.
// Les lignes sans numéro de facture comptent chacune individuellement.
function countFactures(list) {
const seen = new Set();
let count = 0;
(list||[]).forEach(p => {
const f = (p.facture||'').trim();
if (f) { if (!seen.has(f)) { seen.add(f); count++; } }
else count++;
});
return count;
}

function allCategories() {
ensureCategoriesDefaults();
return [...state.categoriesArticles].sort();
}

function allSecteurs() {
return [...new Set(state.sorties.map(s => s.secteur).filter(Boolean))].sort();
}

function allFournisseurs() {
return [...new Set(state.purchases.map(p => p.fournisseur).filter(Boolean))].sort();
}

function today() { return new Date().toISOString().split('T')[0]; }

function categoryOptionsHTML(selected) {
return '<option value="">— Aucune —</option>' + allCategories().map(c => `<option value="${c}"${c===selected?' selected':''}>${c}</option>`).join('');
}

function kpiBox(label,val,color,sub) {
return '<div style="background:var(--surface2);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border)">'
+'<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">'+label+'</div>'
+'<div style="font-size:20px;font-weight:700;color:'+(color||'var(--text)')+'">'+val+'</div>'
+(sub?'<div style="font-size:11px;color:var(--text3);margin-top:3px">'+sub+'</div>':'')
+'</div>';
}

function generateInternalCode(articleId) {
const art = state.articles.find(a=>a.id===articleId);
if (!art) return;
if (art.code_barre) { if (!confirm('Cet article a déjà un code associé ("'+art.code_barre+'"). Le remplacer par un nouveau code interne ?')) return; }
const code = 'INT-'+art.id;
art.code_barre = code;
logActivity('article_edit', 'Code QR interne généré pour '+art.designation);
saveState('articles');
if (document.getElementById('page-articles')?.classList.contains('active')) renderArticles();
if (document.getElementById('art-code-barre')) document.getElementById('art-code-barre').value = code;
showToast('✓ Code interne généré : '+code);
}

function categoryChipsHTML(list, onRemove) {
if (!list.length) return '<div style="color:var(--text3);font-size:12px">Aucune catégorie définie</div>';
return list.map(c => `<span class="ui-pill">${c}<button type="button" onclick="${onRemove}('${c.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;line-height:1;padding:0;margin-left:2px">×</button></span>`).join('');
}

function renderPagination(containerId, current, total, stateKey, renderFn) {
const el = document.getElementById(containerId);
if (total<=1) { el.innerHTML=''; return; }
let html='';
const prev=Math.max(1,current-1), next=Math.min(total,current+1);
html+=`<div class="page-btn ${current===1?'disabled':''}" onclick="state.${stateKey}=${prev};${renderFn}()">‹</div>`;
for(let i=Math.max(1,current-2);i<=Math.min(total,current+2);i++)
html+=`<div class="page-btn ${i===current?'active':''}" onclick="state.${stateKey}=${i};${renderFn}()">${i}</div>`;
html+=`<div class="page-btn ${current===total?'disabled':''}" onclick="state.${stateKey}=${next};${renderFn}()">›</div>`;
el.innerHTML=html;
}

function margePct(art) { if (!art.prix_achat || !art.prix_vente || art.prix_achat===0) return null; return Math.round((art.prix_vente - art.prix_achat) / art.prix_achat * 100);
}

function margeLabel(art) { const m = margePct(art); if (m === null) return '—'; return (m>=0?'+':'')+m+'%';
}

function margeCouleur(art) { const m = margePct(art); if (m === null) return 'var(--text3)'; if (m <= 0) return 'var(--red)'; if (m < 20) return 'var(--orange)'; return 'var(--green)';
}
