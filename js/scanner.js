// ============================================================
// NODAS HUB — module: scanner.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

function openScanner(callback, options) {
try {
_scannerCallback = callback;
_scannerOptions = options || {};
const modalEl = document.getElementById('modal-scanner').querySelector('.modal');
modalEl.classList.toggle('scanner-standalone', !!_scannerOptions.standalone);
document.getElementById('scanner-mode-log-wrap').style.display = _scannerOptions.standalone ? 'block' : 'none';
document.getElementById('scanner-exit-fab').style.display = _scannerOptions.standalone ? 'block' : 'none';
const closeBtn = document.getElementById('modal-scanner').querySelector('.modal-close');
if (closeBtn) closeBtn.style.display = _scannerOptions.standalone ? 'none' : '';
document.getElementById('scanner-modal-footer').innerHTML = _scannerOptions.standalone
? '<button class="btn btn-outline" onclick="exitScannerMode()">⏻ Déconnexion</button>'
: '<button class="btn btn-outline" onclick="closeScanner()">Fermer</button>';
const panel = document.getElementById('scanner-resolve-panel');
panel.style.display = 'none';
panel.innerHTML = '';
document.getElementById('scanner-manual-code').value = '';
document.getElementById('scanner-status').textContent = 'Démarrage de la caméra...';
document.getElementById('modal-scanner').classList.add('open');
if (typeof Html5Qrcode === 'undefined') {
document.getElementById('scanner-status').innerHTML = '⚠ Librairie de scan indisponible (pas de connexion, ou bloquée). Utilisez la saisie manuelle ci-dessous.';
return;
}
clearTimeout(window._scannerStartTimeout);
window._scannerStartTimeout = setTimeout(() => {
const statusEl = document.getElementById('scanner-status');
if (statusEl && statusEl.textContent === 'Démarrage de la caméra...') {
statusEl.innerHTML = '⚠ La caméra met du temps à démarrer (ou n\'a pas pu s\'ouvrir). Vous pouvez utiliser la saisie manuelle ci-dessous en attendant.';
}
}, 6000);
try {
_scannerInstance = new Html5Qrcode('scanner-camera-view', {
formatsToSupport: (typeof Html5QrcodeSupportedFormats !== 'undefined') ? [
Html5QrcodeSupportedFormats.QR_CODE,
Html5QrcodeSupportedFormats.EAN_13,
Html5QrcodeSupportedFormats.EAN_8,
Html5QrcodeSupportedFormats.UPC_A,
Html5QrcodeSupportedFormats.UPC_E,
Html5QrcodeSupportedFormats.CODE_128,
Html5QrcodeSupportedFormats.CODE_39,
Html5QrcodeSupportedFormats.CODABAR,
Html5QrcodeSupportedFormats.ITF,
] : undefined,
verbose: false
});
console.log('[Scanner] Html5Qrcode chargé, formats forcés :', typeof Html5QrcodeSupportedFormats !== 'undefined');
_scannerInstance.start(
{ facingMode: 'environment' },
{ fps: 10 },
(decodedText, decodedResult) => { console.log('[Scanner] Code détecté :', decodedText, decodedResult); onScanSuccess(decodedText); },
(errorMessage) => { /* frame sans code détecté — normal, pas d'action */ }
).then(() => {
console.log('[Scanner] Caméra démarrée avec succès.');
document.getElementById('scanner-status').textContent = 'Pointez la caméra vers le code-barres ou QR code';
}).catch((err) => {
console.error('[Scanner] Échec démarrage caméra :', err);
document.getElementById('scanner-status').innerHTML = '⚠ Caméra inaccessible (permission refusée ou indisponible). Utilisez la saisie manuelle ci-dessous.';
});
} catch(e) {
console.error('[Scanner] Erreur d\'initialisation :', e);
document.getElementById('scanner-status').innerHTML = '⚠ Erreur d\'initialisation de la caméra. Utilisez la saisie manuelle ci-dessous.';
}
} catch (outerErr) {
console.error('[Scanner] Erreur générale openScanner:', outerErr);
const modalOpen = document.getElementById('modal-scanner')?.classList.contains('open');
if (modalOpen) {
const el = document.getElementById('scanner-status');
if (el) el.innerHTML = '⚠ Erreur : '+(outerErr && outerErr.message ? outerErr.message : 'erreur inconnue');
} else {
const el = document.getElementById('auth-screen');
if (el) { el.style.display='flex'; el.innerHTML = '<div style="color:#9e9b96;font-family:sans-serif;text-align:center;padding:20px">⚠ Erreur au démarrage du scanner : '+(outerErr && outerErr.message ? outerErr.message : 'erreur inconnue')+'</div>'; }
}
}
}

function closeScanner() {
document.getElementById('modal-scanner').classList.remove('open');
if (_scannerInstance) {
try { _scannerInstance.stop().then(()=>_scannerInstance.clear()).catch(()=>{}); } catch(e) {}
_scannerInstance = null;
}
_scannerCallback = null;
_scannerOptions = {};
}

function scannerManualSubmit() {
const v = document.getElementById('scanner-manual-code').value.trim();
if (!v) return;
onScanSuccess(v);
}

function onScanSuccess(code) {
if (_scannerInstance) { try { _scannerInstance.pause(true); } catch(e) {} }
if (_scannerOptions.mode === 'code_only') { finishScan(code); return; }
resolveScannedCode(code);
}

function resolveScannedCode(code) {
const art = state.articles.find(a => a.code_barre === code);
if (art) {
document.getElementById('scanner-status').innerHTML = '✓ Article trouvé : <strong>'+art.designation+'</strong>';
finishScan(art);
return;
}
document.getElementById('scanner-status').innerHTML = '⚠ Code inconnu : <strong>'+code+'</strong>';
const panel = document.getElementById('scanner-resolve-panel');
const sorted = [...state.articles].sort((a,b)=>a.designation.localeCompare(b.designation));
panel.innerHTML = `
<div style="background:var(--surface2);border-radius:10px;padding:14px;border:1px solid var(--border)">
<div style="font-size:12px;font-weight:600;margin-bottom:10px">Associer à un article existant</div>
<div style="display:flex;gap:8px;margin-bottom:16px">
<select id="scanner-assoc-select" style="flex:1">
<option value="">— Choisir un article —</option>
${sorted.map(a=>'<option value="'+a.id+'">'+a.designation+(a.code_barre?' (déjà associé à un autre code)':'')+'</option>').join('')}
</select>
<button class="btn btn-primary btn-sm" onclick="scannerAssociate('${code.replace(/'/g,"\\'")}')">Associer</button>
</div>
<div style="font-size:12px;font-weight:600;margin-bottom:10px;padding-top:10px;border-top:1px solid var(--border)">Ou créer un nouvel article</div>
<div class="form-row" style="margin-bottom:8px">
<input type="text" id="scanner-new-designation" placeholder="Désignation *">
<input type="text" id="scanner-new-unite" placeholder="Unité (kg, L, pièce...)">
</div>
<button class="btn btn-outline btn-sm" onclick="scannerCreateArticle('${code.replace(/'/g,"\\'")}')">+ Créer et associer</button>
</div>`;
panel.style.display = 'block';
}

function scannerAssociate(code) {
const id = parseInt(document.getElementById('scanner-assoc-select').value);
const art = state.articles.find(a=>a.id===id);
if (!art) { showToast('⚠ Choisissez un article','var(--red)'); return; }
art.code_barre = code;
logActivity('article_edit', 'Code associé à '+art.designation+' via scan');
saveState('articles');
showToast('✓ Code associé à : '+art.designation);
finishScan(art);
}

function scannerCreateArticle(code) {
const designation = document.getElementById('scanner-new-designation').value.trim();
if (!designation) { showToast('⚠ Désignation obligatoire','var(--red)'); return; }
if (state.articles.find(a => a.designation.toLowerCase()===designation.toLowerCase())) { showToast('⚠ Cet article existe déjà','var(--red)'); return; }
const unite = document.getElementById('scanner-new-unite').value.trim();
const newArt = { id:Date.now(), designation, categorie:'', unite, stock_min:0, prix_achat:0, prix_vente:0, code_barre:code, total_entrant:0, total_sortant:0 };
state.articles.push(newArt);
logActivity('article_create', 'Article créé via scan : '+designation);
saveState('articles');
showToast('✓ Article créé et code associé : '+designation);
finishScan(newArt);
}

function finishScan(result) {
const cb = _scannerCallback;
closeScanner();
if (cb) cb(result);
}

function printCodeQR(articleId) {
const art = state.articles.find(a=>a.id===articleId);
if (!art) return;
if (!art.code_barre) { showToast('⚠ Aucun code associé à cet article','var(--orange)'); return; }
if (typeof QRCode === 'undefined') { showToast('⚠ Librairie QR indisponible (hors-ligne)','var(--red)'); return; }
const w = window.open('', '_blank', 'width=420,height=520');
w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR — '+art.designation+'</title>'
+'<style>body{font-family:Arial,sans-serif;text-align:center;margin:30px}h2{font-size:16px;margin-bottom:4px}p{color:#888;font-size:12px;margin-top:0}#qr{margin:20px auto;display:inline-block}@media print{button{display:none}}</style>'
+'<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script></head><body>'
+'<h2>'+art.designation+'</h2><p>'+art.code_barre+'</p><div id="qr"></div>'
+'<script>new QRCode(document.getElementById("qr"), { text: '+JSON.stringify(art.code_barre)+', width:200, height:200 });<\/script>'
+'<div style="margin-top:20px"><button onclick="window.print()">🖨 Imprimer</button></div>'
+'</body></html>');
w.document.close();
}

function enterScannerMode() {
document.getElementById('auth-screen').style.display = 'none';
scannerModeNext();
}

function scannerModeNext() {
openScanner(function(result) {
const label = (result && result.designation) ? result.designation : String(result);
scannerModeLog(label, true);
if (typeof window.depositScanInbox === 'function' && result && result.code_barre) {
window.depositScanInbox(result.code_barre, label);
}
setTimeout(scannerModeNext, 700);
}, { mode: 'resolve', standalone: true });
}

function scannerModeLog(label, ok) {
const list = document.getElementById('scanner-mode-log');
if (!list) return;
const item = document.createElement('div');
item.style.cssText = 'padding:8px 10px;background:var(--surface2);border-radius:8px;font-size:12px;border-left:3px solid '+(ok?'var(--green)':'var(--red)');
item.textContent = (ok?'✓ ':'⚠ ') + label + ' — ' + new Date().toLocaleTimeString('fr-FR');
list.prepend(item);
while (list.children.length > 15) list.removeChild(list.lastChild);
}

function exitScannerMode() {
if (typeof window.authLogout === 'function') window.authLogout();
}

function onRemoteScanReceived(inbox) {
const art = state.articles.find(a => a.code_barre === inbox.code);
const label = art ? art.designation : (inbox.label || inbox.code);
showRemoteScanBanner(label, art, inbox.by, inbox.code);
}

function showRemoteScanBanner(label, art, by, code) {
const el = document.getElementById('remote-scan-banner');
if (!el) return;
el.innerHTML = '📷 Scan reçu'+(by?' de '+by:'')+' : <strong>'+label+'</strong>'
+(art
? ' <button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="applyRemoteScanToOpenModal('+art.id+')">Utiliser</button>'
: ' <button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="resolveRemoteScanCode(\''+String(code||'').replace(/'/g,"\\'")+'\')">Traiter (code inconnu)</button>')
+'<button onclick="document.getElementById(\'remote-scan-banner\').style.display=\'none\'" style="margin-left:8px;background:none;border:1px solid currentColor;color:inherit;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px">Fermer</button>';
el.style.display = 'flex';
clearTimeout(window._remoteScanBannerTimer);
window._remoteScanBannerTimer = setTimeout(()=>{ el.style.display='none'; }, 25000);
}

function resolveRemoteScanCode(code) {
document.getElementById('remote-scan-banner').style.display = 'none';
const modalEl = document.getElementById('modal-scanner').querySelector('.modal');
modalEl.classList.remove('scanner-standalone');
document.getElementById('scanner-mode-log-wrap').style.display = 'none';
document.getElementById('scanner-modal-footer').innerHTML = '<button class="btn btn-outline" onclick="closeScanner()">Fermer</button>';
document.getElementById('scanner-camera-view').innerHTML = '';
document.getElementById('modal-scanner').classList.add('open');
_scannerCallback = function(article) { applyRemoteScanToOpenModal(article.id); };
_scannerOptions = {};
resolveScannedCode(code);
}

function applyRemoteScanToOpenModal(articleId) {
const art = state.articles.find(a=>a.id===articleId);
if (!art) return;
let applied = false;
['entree-article','sortie-article'].forEach(id => {
const el = document.getElementById(id);
const modal = el && el.closest('.modal-overlay');
if (el && modal && modal.classList.contains('open')) { el.value = art.designation; applied = true; }
});
const venteModal = document.getElementById('modal-vente');
if (!applied && venteModal && venteModal.classList.contains('open')) {
venteSetType('article');
document.getElementById('vente-nom').value = art.designation;
venteOnNomChange();
applied = true;
}
if (!applied) showHistorique(art.id);
document.getElementById('remote-scan-banner').style.display = 'none';
}

function openPairingModal() {
document.getElementById('pairing-qr').innerHTML = '';
document.getElementById('pairing-status').textContent = 'Génération du QR...';
document.getElementById('pairing-expiry').textContent = '';
document.getElementById('modal-pairing').classList.add('open');
if (typeof window.startPairing === 'function') window.startPairing();
}

function closePairingModal() {
document.getElementById('modal-pairing').classList.remove('open');
clearInterval(window._pairingExpiryTimer);
if (typeof window.stopPairing === 'function') window.stopPairing();
}

function showPairingQR(pairId, expiresAt) {
if (typeof QRCode === 'undefined') { document.getElementById('pairing-status').innerHTML = '⚠ Librairie QR indisponible (hors-ligne)'; return; }
const url = location.origin + location.pathname + '?pair=' + pairId;
document.getElementById('pairing-qr').innerHTML = '';
new QRCode(document.getElementById('pairing-qr'), { text: url, width: 220, height: 220 });
document.getElementById('pairing-status').textContent = 'En attente de connexion du téléphone...';
const updateExpiry = () => {
const mins = Math.max(0, Math.round((expiresAt-Date.now())/60000));
const el = document.getElementById('pairing-expiry');
if (el) el.textContent = mins>0 ? 'Expire dans '+mins+' min' : 'Expiré — fermez et relancez un nouveau pairage';
};
updateExpiry();
clearInterval(window._pairingExpiryTimer);
window._pairingExpiryTimer = setInterval(updateExpiry, 30000);
}

// ===== Écran du téléphone appairé (Option B — aucun accès aux données) =====
function showPairedScannerUI(pairId) {
console.log('[Pairing] showPairedScannerUI, pairId=', pairId);
try {
document.getElementById('auth-screen').style.display = 'none';
pairedScannerNext(pairId);
} catch (e) {
console.error('[Pairing] Erreur showPairedScannerUI:', e);
const el = document.getElementById('auth-screen');
if (el) { el.style.display='flex'; el.innerHTML = '<div style="color:#9e9b96;font-family:sans-serif;text-align:center;padding:20px">⚠ Erreur d\'affichage du scanner : '+(e&&e.message?e.message:'')+'</div>'; }
}
}

function pairedScannerNext(pairId) {
try {
openScanner(function(code) {
scannerModeLog(String(code), true);
if (typeof window.depositPairingScan === 'function') {
window.depositPairingScan(pairId, code).then(ok => { if (!ok) scannerModeLog('Échec envoi : '+code, false); });
}
setTimeout(()=>pairedScannerNext(pairId), 700);
}, { mode: 'code_only', standalone: true });
} catch (e) {
console.error('[Pairing] Erreur openScanner:', e);
const modalOpen = document.getElementById('modal-scanner')?.classList.contains('open');
if (modalOpen) {
const el = document.getElementById('scanner-status');
if (el) el.innerHTML = '⚠ Erreur : '+(e&&e.message?e.message:'erreur inconnue');
} else {
const el = document.getElementById('auth-screen');
if (el) { el.style.display='flex'; el.innerHTML = '<div style="color:#9e9b96;font-family:sans-serif;text-align:center;padding:20px">⚠ Erreur au démarrage du scanner : '+(e&&e.message?e.message:'erreur inconnue')+'</div>'; }
}
}
}
