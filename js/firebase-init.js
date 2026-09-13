
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, enableIndexedDbPersistence, serverTimestamp, onSnapshot, query, where, orderBy, limit, writeBatch, arrayUnion } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcUeC7x4E4iVUTa2_ZDgZkO2nfSb0nfF8",
  authDomain: "nodas-hub.firebaseapp.com",
  projectId: "nodas-hub",
  storageBucket: "nodas-hub.firebasestorage.app",
  messagingSenderId: "380292298288",
  appId: "1:380292298288:web:59eaeb348f2ea4d58b9ff5"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
window._fbApp = fbApp;
window._auth = auth;
window._db = db;

enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistance offline désactivée (plusieurs onglets ouverts)');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistance offline non supportée par ce navigateur');
  }
});

// ===== Option B : appairage par QR sans compte =====
// Si l'URL contient ?pair=XXXX (venant du QR affiché sur le poste principal), on se connecte
// en anonyme — ce compte anonyme n'a accès QU'à ce document de pairing précis (voir règles
// Firestore dédiées), jamais aux données de l'établissement.
window._pendingPairId = new URLSearchParams(location.search).get('pair');
if (window._pendingPairId) {
  // On masque tout de suite l'écran de connexion normal pour éviter qu'il ne s'affiche
  // même brièvement pendant que la connexion anonyme se met en place.
  const authScreenEl = document.getElementById('auth-screen');
  const appRootEl = document.getElementById('app-root');
  if (appRootEl) appRootEl.style.display = 'none';
  if (authScreenEl) {
    authScreenEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;width:100%;color:#9e9b96;font-family:sans-serif;text-align:center;padding:20px">Connexion à la session de scan...</div>';
  }
  signInAnonymously(auth).catch(err => {
    console.error('Échec de connexion anonyme pour le pairage:', err);
    if (authScreenEl) {
      const isDisabled = err && (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation');
      authScreenEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;width:100%;color:#9e9b96;font-family:sans-serif;text-align:center;padding:20px;line-height:1.6">'
        + (isDisabled
          ? "⚠ La connexion anonyme n'est pas activée sur ce projet.<br>Demandez à l'administrateur d'activer \"Anonyme\" dans Firebase Console → Authentication → Sign-in method."
          : '⚠ Impossible de démarrer la session de scan.<br>Redemandez un nouveau QR depuis le poste principal.')
        + '</div>';
    }
  });
}

let authMode = 'login';

function authErrorMsg(code) {
  const map = {
    'auth/invalid-email': 'Adresse email invalide',
    'auth/user-not-found': 'Aucun compte avec cet email',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/invalid-credential': 'Email ou mot de passe incorrect',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet email',
    'auth/weak-password': 'Mot de passe trop court (6 caractères minimum)',
    'auth/too-many-requests': 'Trop de tentatives — réessayez plus tard',
    'auth/missing-password': 'Mot de passe requis',
    'auth/network-request-failed': 'Erreur réseau — vérifiez votre connexion',
  };
  return map[code] || ('Erreur : ' + code);
}

window.authSwitchTab = function(mode) {
  authMode = mode;
  document.getElementById('auth-tab-login').classList.toggle('active', mode==='login');
  document.getElementById('auth-tab-register').classList.toggle('active', mode==='register');
  document.getElementById('auth-submit-btn').textContent = mode==='login' ? 'Se connecter' : 'Créer mon compte';
  document.getElementById('auth-confirm-group').style.display = mode==='register' ? 'block' : 'none';
  document.getElementById('auth-password-confirm').value = '';
  const err = document.getElementById('auth-error');
  err.style.display = 'none';
  err.style.color = 'var(--red)';
};

window.authSubmit = function() {
  const email = document.getElementById('auth-email').value.trim();
  const pwd = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.style.color = 'var(--red)';
  errEl.style.display = 'none';
  if (!email || !pwd) { errEl.textContent='⚠ Email et mot de passe requis'; errEl.style.display='block'; return; }
  if (authMode==='register') {
    const confirm = document.getElementById('auth-password-confirm').value;
    if (pwd !== confirm) { errEl.textContent='⚠ Les mots de passe ne correspondent pas'; errEl.style.display='block'; return; }
  }
  const btn = document.getElementById('auth-submit-btn');
  btn.disabled = true;
  const action = authMode==='login'
    ? signInWithEmailAndPassword(auth, email, pwd)
    : createUserWithEmailAndPassword(auth, email, pwd);
  action.catch(err => {
    errEl.textContent = '⚠ ' + authErrorMsg(err.code);
    errEl.style.display = 'block';
  }).finally(() => { btn.disabled = false; });
};

window.authResetPassword = function() {
  const email = document.getElementById('auth-email').value.trim();
  const errEl = document.getElementById('auth-error');
  if (!email) { errEl.style.color='var(--red)'; errEl.textContent='⚠ Saisissez votre email ci-dessus puis cliquez à nouveau'; errEl.style.display='block'; return; }
  sendPasswordResetEmail(auth, email).then(() => {
    errEl.style.color = 'var(--green)';
    errEl.textContent = '✓ Email de réinitialisation envoyé à ' + email;
    errEl.style.display = 'block';
  }).catch(err => {
    errEl.style.color = 'var(--red)';
    errEl.textContent = '⚠ ' + authErrorMsg(err.code);
    errEl.style.display = 'block';
  });
};

window.authChangePassword = function() {
  const user = window._currentUser;
  if (!user || !user.email) return;
  if (!confirm('Envoyer un email de réinitialisation de mot de passe à '+user.email+' ?')) return;
  sendPasswordResetEmail(auth, user.email).then(() => {
    showToast('✓ Email envoyé à '+user.email);
  }).catch(err => {
    showToast('⚠ '+authErrorMsg(err.code), 'var(--red)');
  });
};

window.authLogout = function() {
  if (!confirm('Se déconnecter de l\'application ?')) return;
  signOut(auth);
};

window.setSyncStatus = function(status, label) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  if (!dot || !lbl) return;
  dot.classList.remove('ok','pending','err');
  if (status) dot.classList.add(status);
  lbl.textContent = label || '';
};

const ADMIN_EMAIL = 'arnsog@gmail.com';
// isAdmin() = super-admin Anthropic/éditeur de l'app (Vue Admin toutes structures).
// À ne pas confondre avec le rôle 'admin' d'un établissement (isEconome()/window._role).
window.isAdmin = function() {
  return !!(window._currentUser && window._currentUser.email === ADMIN_EMAIL);
};
// Rôle de l'utilisateur au sein de SON établissement : 'admin' (propriétaire) ou 'econome'.
window.isEconome = function() {
  return window._role === 'econome';
};
window.isScanner = function() {
  return window._role === 'scanner';
};
// Responsable de secteur : rôle restreint à UN secteur précis (window._secteurActif), qui ne
// peut enregistrer que des sorties/ventes pour ce secteur, et des retours vers l'Économat —
// jamais de distribution (Économat → secteur), réservée à l'admin/économe.
window.isSecteurResponsable = function() {
  return window._role === 'secteur';
};

// Détermine à quel établissement (users/{etablissementId}) l'utilisateur connecté doit accéder,
// et avec quel rôle. Un compte économe est lié via un document accountLinks/{uid}.
async function resolveAccountContext(user) {
  window._etablissementId = user.uid;
  window._role = 'admin';
  window._secteurActif = null;
  window._accountDisabled = false;
  try {
    const linkSnap = await getDoc(doc(db, 'accountLinks', user.uid));
    if (linkSnap.exists()) {
      const link = linkSnap.data();
      window._etablissementId = link.etablissementId || user.uid;
      window._role = link.role || 'admin';
      window._secteurActif = link.secteur || null;
      window._accountDisabled = link.disabled === true;
    }
  } catch (e) {
    console.warn('Impossible de résoudre le lien de compte, mode admin par défaut :', e);
  }
}

// ===== Synchro cloud PAR DOMAINE (P1 — Firestore en sous-collections) =====
// Chaque domaine (articles, ventes, commandes...) a son propre timer de debounce et son
// propre document Firestore : modifier un article ne déclenche plus jamais une écriture des
// ventes/commandes/journal. Voir README.md pour le schéma complet.
const DOMAIN_ARRAY_KEYS = {
  articles: 'articles', purchases: 'purchases', sorties: 'sorties',
  fournisseurs: 'fournisseurs', recettes: 'recettes', ventes: 'ventes', commandes: 'commandes',
  transferts: 'transferts'
};
let cloudSaveTimers = {};
let _pendingDomains = new Set();
window._syncPending = false;

window.cloudSync = function(domain) {
  if (!window._currentUser) return;
  domain = domain || 'meta';
  _pendingDomains.add(domain);
  window._syncPending = true;
  window.setSyncStatus('pending','Sauvegarde en cours...');
  clearTimeout(cloudSaveTimers[domain]);
  cloudSaveTimers[domain] = setTimeout(() => cloudSaveNow(domain), 400);
};
// Force l'envoi immédiat (sans attendre le debounce) — utilisé à la fermeture de l'onglet,
// quand l'app passe en arrière-plan, ou via le bouton manuel "Synchroniser maintenant".
window.flushSyncNow = function() {
  if (!window._currentUser) return;
  const domains = Array.from(_pendingDomains);
  domains.forEach(d => clearTimeout(cloudSaveTimers[d]));
  return Promise.all(domains.map(d => cloudSaveNow(d)));
};

async function cloudSaveNow(domain) {
  if (!window._currentUser || !window._etablissementId) return;
  domain = domain || 'meta';
  try {
    if (domain === 'meta') {
      const data = {
        categoriesArticles: state.categoriesArticles || [],
        emplacements: state.emplacements || ['Économat'],
        categoriesOffert: state.categoriesOffert || [],
        notificationEmails: state.notificationEmails || [],
        lastAlertEmailDate: state.lastAlertEmailDate || '',
        members: state.members || [],
        foodCost: state.foodCost || null,
        appName: state.appName || 'STOCK',
        appSub: state.appSub || 'Gestion de Stock',
        lightMode: !!state.lightMode,
        ROWS_PER_PAGE: state.ROWS_PER_PAGE || 20,
        email: window._currentUser.email,
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', window._etablissementId), data, { merge: true });
    } else if (DOMAIN_ARRAY_KEYS[domain]) {
      const key = DOMAIN_ARRAY_KEYS[domain];
      if (window._migrationPending) {
        // Établissement pas encore migré : continuer à écrire à l'ANCIEN format (champ plat
        // sur le document principal), exactement comme avant P1. Écrire directement dans la
        // sous-collection ici casserait silencieusement les établissements non migrés : la
        // prochaine lecture (loadUserData, tant que migratedAt est absent) ne regarde que les
        // champs plats et ne verrait jamais ces écritures.
        await setDoc(doc(db, 'users', window._etablissementId), {
          [key]: state[key] || [], updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', window._etablissementId, 'data', domain), {
          items: state[key] || [], updatedAt: serverTimestamp()
        });
      }
    } else {
      console.warn('cloudSaveNow: domaine inconnu ignoré :', domain);
      return;
    }
    _pendingDomains.delete(domain);
    if (_pendingDomains.size === 0) {
      window._syncPending = false;
      window.setSyncStatus('ok','Toutes les modifications sont sauvegardées');
    }
  } catch (e) {
    console.error('Erreur de synchronisation Firestore ('+domain+'):', e);
    window.setSyncStatus('err','⚠ Échec de synchronisation — cliquez pour réessayer');
  }
}
window.cloudSaveNow = cloudSaveNow;

// Journal d'activité : chaque entrée est désormais un document individuel dans la
// sous-collection users/{id}/activityLog — écriture immédiate (petit document), pas de
// plafond, et suppression possible entrée par entrée. Pour un établissement PAS ENCORE
// migré, on continue d'écrire dans le tableau plat (ancien format) via arrayUnion, pour
// rester lisible par loadUserData() tant que migratedAt est absent.
window.saveActivityLogEntry = async function(entry) {
  if (!window._currentUser || !window._etablissementId) return;
  try {
    if (window._migrationPending) {
      await setDoc(doc(db, 'users', window._etablissementId), {
        activityLog: arrayUnion(entry)
      }, { merge: true });
    } else {
      await setDoc(doc(db, 'users', window._etablissementId, 'activityLog', entry.id), {
        ts: entry.ts, user: entry.user, action: entry.action, label: entry.label,
        createdAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.error("Erreur d'écriture du journal d'activité:", e);
  }
};

// Remplace ENTIÈREMENT le journal d'activité d'un établissement (pas incrémental —
// l'existant est écrasé). Utilisé par la restauration d'une sauvegarde serveur et par
// l'import d'une sauvegarde JSON. isMigrated est passé explicitement (pas déduit de
// window._migrationPending) car cette fonction peut agir sur un établissement qui n'est
// pas celui de l'utilisateur actuellement connecté (cas de la Vue Admin Plateforme).
async function replaceActivityLogFull(etablissementId, isMigrated, log) {
  log = log || [];
  if (isMigrated) {
    await deleteCollectionBatched(collection(db, 'users', etablissementId, 'activityLog'));
    for (let i = 0; i < log.length; i += 400) {
      const batch = writeBatch(db);
      log.slice(i, i+400).forEach(entry => {
        const entryId = entry.id || ('log-'+(entry.ts||Date.now())+'-'+Math.random().toString(36).slice(2,6));
        batch.set(doc(db, 'users', etablissementId, 'activityLog', entryId), {
          ts: entry.ts, user: entry.user, action: entry.action, label: entry.label, createdAt: serverTimestamp()
        });
      });
      await batch.commit();
    }
  } else {
    await setDoc(doc(db, 'users', etablissementId), { activityLog: log }, { merge: true });
  }
}
// Version pour l'établissement de l'utilisateur actuellement connecté (import JSON local).
window.restoreActivityLogFull = async function(logArray) {
  if (!window._currentUser || !window._etablissementId) return;
  await replaceActivityLogFull(window._etablissementId, !window._migrationPending, logArray);
};

// Supprime tous les documents d'une (sous-)collection par lots de 400 (limite Firestore :
// 500 opérations par batch). Réutilisé pour vider le journal d'activité et pour la
// suppression complète d'un établissement.
async function deleteCollectionBatched(colRef) {
  let snap = await getDocs(colRef);
  while (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.slice(0,400).forEach(d => batch.delete(d.ref));
    await batch.commit();
    if (snap.docs.length <= 400) break;
    snap = await getDocs(colRef);
  }
}

// Vide le journal d'activité côté cloud : ancien format = vider le tableau plat, nouveau
// format = supprimer tous les documents de la sous-collection.
window.clearActivityLogCloud = async function() {
  if (!window._currentUser || !window._etablissementId) return;
  try {
    if (window._migrationPending) {
      await setDoc(doc(db, 'users', window._etablissementId), { activityLog: [] }, { merge: true });
    } else {
      await deleteCollectionBatched(collection(db, 'users', window._etablissementId, 'activityLog'));
    }
  } catch (e) {
    console.error("Erreur lors du vidage du journal d'activité:", e);
  }
};

// ===== Migration vers les sous-collections (P1) =====
// Opération non destructive : copie les tableaux existants du document users/{id} vers les
// nouvelles sous-collections, sans rien supprimer de l'ancien format. Marque le document avec
// migratedAt une fois terminé — c'est ce flag qui fait basculer loadUserData() vers la lecture
// des sous-collections. Idempotent : si déjà migré, ne fait rien.
window.migrateToSubcollections = async function() {
  if (window.isEconome() || window.isScanner()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
  const id = window._etablissementId;
  const metaRef = doc(db, 'users', id);
  let snap;
  try { snap = await getDoc(metaRef); } catch (e) { showToast('⚠ Erreur : '+e.message, 'var(--red)'); return; }
  if (!snap.exists()) { showToast('⚠ Aucune donnée à migrer', 'var(--red)'); return; }
  const d = snap.data();
  if (d.migratedAt) { showToast('✓ Cet établissement est déjà migré'); return; }
  if (!confirm('Migrer les données de cet établissement vers le nouveau format (sous-collections) ?\n\nRien n\'est supprimé : c\'est une copie. Cette opération peut prendre quelques secondes selon le volume de données.\n\nContinuer ?')) return;
  showToast('Migration en cours...');
  try {
    for (const dom of Object.keys(DOMAIN_ARRAY_KEYS)) {
      const key = DOMAIN_ARRAY_KEYS[dom];
      await setDoc(doc(db, 'users', id, 'data', dom), { items: d[key] || [], updatedAt: serverTimestamp() });
    }
    const log = d.activityLog || [];
    for (let i = 0; i < log.length; i += 400) {
      const batch = writeBatch(db);
      log.slice(i, i+400).forEach(entry => {
        const entryId = entry.id || ('log-'+(entry.ts||Date.now())+'-'+Math.random().toString(36).slice(2,6));
        batch.set(doc(db, 'users', id, 'activityLog', entryId), {
          ts: entry.ts, user: entry.user, action: entry.action, label: entry.label, createdAt: serverTimestamp()
        });
      });
      await batch.commit();
    }
    await setDoc(metaRef, { migratedAt: serverTimestamp() }, { merge: true });
    showToast('✓ Migration terminée — rechargez la page pour repasser sur le nouveau format');
  } catch (e) {
    console.error('Erreur de migration:', e);
    showToast('⚠ Erreur pendant la migration : '+e.message, 'var(--red)');
  }
};

// Charge les 7 domaines + le journal depuis les sous-collections (établissement déjà migré).
async function loadEstablishmentSubcollections(metaData) {
  const id = window._etablissementId;
  const domains = Object.keys(DOMAIN_ARRAY_KEYS);
  const results = await Promise.all(domains.map(dm => getDoc(doc(db, 'users', id, 'data', dm))));
  domains.forEach((dm, i) => {
    state[dm] = (results[i].exists() ? results[i].data().items : []) || [];
  });
  try {
    const q = query(collection(db, 'users', id, 'activityLog'), orderBy('ts','desc'), limit(500));
    const logSnap = await getDocs(q);
    state.activityLog = logSnap.docs.map(docu => ({ id: docu.id, ...docu.data() })).reverse();
  } catch (e) {
    console.warn('Chargement du journal impossible:', e);
    state.activityLog = [];
  }
  state.categoriesArticles = metaData.categoriesArticles || [];
  state.emplacements = (metaData.emplacements && metaData.emplacements.length) ? metaData.emplacements : ['Économat'];
  state.categoriesOffert = metaData.categoriesOffert || [];
  state.notificationEmails = metaData.notificationEmails || [];
  state.lastAlertEmailDate = metaData.lastAlertEmailDate || '';
  state.members = metaData.members || [];
  state.foodCost = metaData.foodCost || null;
  fcEnsureDefaults();
  ensureCategoriesDefaults();
  state.appName = metaData.appName || 'STOCK';
  state.appSub = metaData.appSub || 'Gestion de Stock';
  state.lightMode = !!metaData.lightMode;
  state.ROWS_PER_PAGE = metaData.ROWS_PER_PAGE || 20;
}

// Filets de sécurité contre la perte de données : le debounce normal (400ms) peut ne jamais
// se déclencher si l'onglet est fermé/mis en arrière-plan juste après une modification.
// On force alors un envoi immédiat dès que le navigateur signale que la page devient invisible.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && window._syncPending) {
    window.flushSyncNow && window.flushSyncNow();
  }
});
window.addEventListener('pagehide', () => {
  if (window._syncPending) window.flushSyncNow && window.flushSyncNow();
});
window.addEventListener('beforeunload', (e) => {
  if (window._syncPending) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ===== Détection multi-appareils / multi-onglets =====
// Le filet de sécurité ci-dessus ne protège que contre une fermeture trop rapide sur le MÊME
// appareil. Il ne peut pas détecter qu'un autre appareil (téléphone, autre PC, autre onglet)
// est en train de modifier les mêmes données en parallèle — c'est ce qui peut faire perdre des
// changements en silence (le dernier qui sauvegarde écrase l'autre). On rend donc cette
// situation visible via une "présence" légère stockée dans le document Firestore.
const _sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
function _deviceLabel() {
  const ua = navigator.userAgent || '';
  if (/Mobi|Android/i.test(ua)) return 'Mobile';
  if (/iPad|Tablet/i.test(ua)) return 'Tablette';
  return 'Ordinateur';
}
let _presenceTimer = null;
async function updatePresence() {
  if (!window._currentUser || !window._etablissementId) return;
  try {
    const ref = doc(db, 'users', window._etablissementId);
    const snap = await getDoc(ref);
    const sessions = (snap.exists() && snap.data().activeSessions) || {};
    const now = Date.now();
    // Purge des sessions inactives depuis plus de 90s pour ne pas accumuler indéfiniment.
    Object.keys(sessions).forEach(k => { if (!sessions[k] || now - sessions[k].lastSeen > 90000) delete sessions[k]; });
    const others = Object.entries(sessions).filter(([sid]) => sid !== _sessionId);
    sessions[_sessionId] = { email: window._currentUser.email, device: _deviceLabel(), lastSeen: now };
    await setDoc(ref, { activeSessions: sessions }, { merge: true });
    showMultiSessionBanner(others.length ? others.map(([,s]) => s) : null);
  } catch (e) { /* silencieux : la présence est un confort, pas une fonction critique */ }
}
function showMultiSessionBanner(others) {
  const el = document.getElementById('multi-session-banner');
  if (!el) return;
  if (others && others.length) {
    const desc = others.map(s => (s.email||'quelqu\'un') + ' (' + (s.device||'appareil') + ')').join(', ');
    el.innerHTML = '⚠ Cette application est aussi ouverte ailleurs en ce moment : ' + desc + '. Travaillez de préférence sur un seul appareil à la fois pour éviter d\'écraser des modifications. <button onclick="document.getElementById(\'multi-session-banner\').style.display=\'none\'" style="margin-left:10px;background:none;border:1px solid currentColor;color:inherit;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px">Compris</button>';
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}
async function removePresence() {
  if (!window._currentUser || !window._etablissementId) return;
  try {
    const ref = doc(db, 'users', window._etablissementId);
    const snap = await getDoc(ref);
    const sessions = (snap.exists() && snap.data().activeSessions) || {};
    delete sessions[_sessionId];
    await setDoc(ref, { activeSessions: sessions }, { merge: true });
  } catch (e) {}
}
window._startPresence = function() {
  updatePresence();
  clearInterval(_presenceTimer);
  _presenceTimer = setInterval(updatePresence, 30000);
};
window.addEventListener('pagehide', () => { removePresence(); });

// ===== Relais de scan (compte Scanner → poste principal) =====
// Le compte Scanner dépose chaque code scanné dans un champ léger du document de
// l'établissement (écriture merge, ne touche à rien d'autre). Les postes admin/économe
// écoutent ce champ en temps réel via onSnapshot et affichent une bannière dès qu'un
// nouveau scan arrive.
window.depositScanInbox = async function(code, label) {
  if (!window._currentUser || !window._etablissementId) return;
  try {
    const ref = doc(db, 'users', window._etablissementId);
    await setDoc(ref, { scanInbox: { code, label: label||'', ts: Date.now(), by: window._currentUser.email, id: Date.now()+'-'+Math.random().toString(36).slice(2,6) } }, { merge: true });
  } catch (e) { console.error('Erreur dépôt scan:', e); }
};
let _scanRelayUnsub = null;
let _lastScanInboxId = null;
window.startScanRelayListener = function() {
  if (!window._etablissementId) return;
  if (_scanRelayUnsub) { _scanRelayUnsub(); _scanRelayUnsub = null; }
  const ref = doc(db, 'users', window._etablissementId);
  _scanRelayUnsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const inbox = snap.data().scanInbox;
    if (!inbox || !inbox.id || inbox.id === _lastScanInboxId) return;
    _lastScanInboxId = inbox.id;
    if (Date.now() - inbox.ts > 120000) return; // ignore les scans trop anciens
    if (inbox.by === (window._currentUser && window._currentUser.email)) return; // pas de rebond sur soi-même
    if (typeof window.onRemoteScanReceived === 'function') window.onRemoteScanReceived(inbox);
  }, (err) => { console.warn('Écoute du relais de scan interrompue:', err); });
};

// ===== Option B : appairage par QR sans compte =====
// Poste principal : crée une session de pairage à durée limitée et écoute les scans déposés
// par le téléphone appairé (connexion anonyme, accès limité à ce seul document — voir règles
// Firestore dédiées `pairings/{pairingId}`).
let _pairingUnsub = null;
let _lastPairingScanId = null;
window.startPairing = async function() {
  if (!window._etablissementId) return;
  const pairId = 'pair-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  const expiresAt = Date.now() + 15*60*1000;
  try {
    await setDoc(doc(db, 'pairings', pairId), {
      etablissementId: window._etablissementId,
      createdAt: serverTimestamp(),
      expiresAt,
      createdBy: window._currentUser ? window._currentUser.email : '',
      lastScan: null
    });
    if (typeof window.showPairingQR === 'function') window.showPairingQR(pairId, expiresAt);
    if (_pairingUnsub) { _pairingUnsub(); _pairingUnsub = null; }
    _lastPairingScanId = null;
    _pairingUnsub = onSnapshot(doc(db, 'pairings', pairId), (snap) => {
      if (!snap.exists()) return;
      const scan = snap.data().lastScan;
      if (!scan || !scan.id || scan.id === _lastPairingScanId) return;
      _lastPairingScanId = scan.id;
      if (typeof window.onRemoteScanReceived === 'function') window.onRemoteScanReceived({ code: scan.code, ts: scan.ts, by: 'téléphone appairé (sans compte)' });
    }, (err) => { console.warn('Écoute du pairage interrompue:', err); });
  } catch (e) {
    if (typeof showToast === 'function') showToast('⚠ Erreur lors de la création du pairage : '+e.message, 'var(--red)');
  }
};
window.stopPairing = function() {
  if (_pairingUnsub) { _pairingUnsub(); _pairingUnsub = null; }
};

// Téléphone appairé : vérifie la session puis affiche l'écran caméra (aucun accès aux données).
window.enterPairedScannerMode = async function() {
  const pairId = window._pendingPairId;
  const authScreenEl = document.getElementById('auth-screen');
  const msg = (text) => {
    if (authScreenEl) {
      authScreenEl.style.display = 'flex';
      authScreenEl.style.alignItems = 'center';
      authScreenEl.style.justifyContent = 'center';
      authScreenEl.innerHTML = '<div style="color:#9e9b96;font-family:sans-serif;text-align:center;padding:20px;line-height:1.6;max-width:90vw">'+text+'</div>';
    }
  };
  console.log('[Pairing] enterPairedScannerMode, pairId=', pairId);
  if (!pairId) { msg('Lien de connexion invalide.'); return; }
  msg('Vérification de la session de scan...');
  try {
    const snap = await getDoc(doc(db, 'pairings', pairId));
    console.log('[Pairing] pairing doc exists:', snap.exists(), snap.exists() ? snap.data() : null);
    if (!snap.exists() || !snap.data().expiresAt || snap.data().expiresAt < Date.now()) {
      msg('⚠ Ce QR de connexion a expiré.<br>Redemandez-en un nouveau depuis le poste principal.');
      return;
    }
  } catch (e) {
    console.error('[Pairing] Erreur vérification pairing:', e);
    msg('⚠ Impossible de vérifier la session de pairage.<br><span style="font-size:11px;opacity:0.7">'+(e && e.message ? e.message : '')+'</span>');
    return;
  }
  try {
    if (typeof window.showPairedScannerUI === 'function') {
      window.showPairedScannerUI(pairId);
    } else {
      msg('⚠ Erreur interne : interface de scan indisponible.');
    }
  } catch (e) {
    console.error('[Pairing] Erreur affichage scanner:', e);
    msg('⚠ Erreur au démarrage de la caméra.<br><span style="font-size:11px;opacity:0.7">'+(e && e.message ? e.message : '')+'</span>');
  }
};
window.depositPairingScan = async function(pairId, code) {
  try {
    await setDoc(doc(db, 'pairings', pairId), { lastScan: { code, ts: Date.now(), id: Date.now()+'-'+Math.random().toString(36).slice(2,6) } }, { merge: true });
    return true;
  } catch (e) { console.error('Erreur dépôt scan pairé:', e); return false; }
};

// ===== Notifications par email =====
// Écrit un document dans la collection "mail", surveillée par l'extension Firebase
// officielle "Trigger Email from Firestore" (à installer et configurer séparément avec
// un fournisseur SMTP — voir Paramètres). L'appli ne fait qu'écrire la demande d'envoi ;
// l'envoi réel est géré entièrement par cette extension côté Firebase.
window.writeMailDoc = async function(to, subject, text, html) {
  try {
    const ref = doc(collection(db, 'mail'));
    await setDoc(ref, {
      to: to,
      message: { subject, text, html },
      createdAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    console.error('Erreur écriture email:', e);
    return false;
  }
};

function resetLocalState() {
  state.articles = []; state.purchases = []; state.sorties = [];
  state.fournisseurs = []; state.recettes = []; state.ventes = []; state.commandes = []; state.activityLog = [];
  state.categoriesArticles = []; state.categoriesOffert = []; state.emplacements = ['Économat']; state.transferts = [];
  state.notificationEmails = []; state.lastAlertEmailDate = '';
  state.members = []; state.foodCost = null;
  state.appName = 'STOCK'; state.appSub = 'Gestion de Stock';
  state.lightMode = false; state.ROWS_PER_PAGE = 20;
  state.articlePage = 1; state.entreePage = 1; state.sortiePage = 1;
}
window.resetLocalState = resetLocalState;

async function loadUserData(user) {
  window.setSyncStatus('pending','Chargement...');
  await resolveAccountContext(user);
  if (window._accountDisabled) {
    const authScreenEl = document.getElementById('auth-screen');
    if (authScreenEl) {
      authScreenEl.style.display = 'flex';
      authScreenEl.style.alignItems = 'center';
      authScreenEl.style.justifyContent = 'center';
      authScreenEl.innerHTML = '<div style="color:#9e9b96;font-family:sans-serif;text-align:center;padding:20px;line-height:1.6;max-width:90vw">⚠ Ce compte a été désactivé.<br>Contactez votre administrateur pour plus d\'informations.</div>';
    }
    const appRootEl = document.getElementById('app-root');
    if (appRootEl) appRootEl.style.display = 'none';
    await signOut(auth);
    return;
  }
  if (window.pushLocalSnapshot) window.pushLocalSnapshot('avant_connexion');
  try {
    const snap = await getDoc(doc(db, 'users', window._etablissementId));
    if (snap.exists()) {
      const d = snap.data();
      // Filet de sécurité : si cet appareil a des données locales enregistrées APRÈS la dernière
      // synchronisation cloud connue (ex: l'onglet a été fermé avant l'envoi), on prévient plutôt
      // que d'écraser silencieusement du travail non sauvegardé.
      let useLocal = false;
      try {
        const localTs = parseInt(localStorage.getItem('gestion_stock_v2_savedAt')||'0', 10);
        const remoteTs = (d.updatedAt && d.updatedAt.seconds) ? d.updatedAt.seconds*1000 : 0;
        if (localTs > remoteTs + 5000) {
          const saved = localStorage.getItem('gestion_stock_v2');
          if (saved) {
            useLocal = confirm(
              'Des données enregistrées sur cet appareil le ' + new Date(localTs).toLocaleString('fr-FR') +
              ' n\'ont peut-être pas été envoyées vers le cloud (dernière synchronisation connue : ' +
              (remoteTs ? new Date(remoteTs).toLocaleString('fr-FR') : 'inconnue') + ').\n\n' +
              'OK = conserver ces données locales et les synchroniser maintenant.\n' +
              'Annuler = charger quand même la version du cloud (les données locales plus récentes seront perdues).'
            );
          }
        }
      } catch(e) {}
      const isMigrated = !!d.migratedAt;
      window._migrationPending = !isMigrated;

      if (useLocal) {
        const p = JSON.parse(localStorage.getItem('gestion_stock_v2'));
        state.articles = p.articles || [];
        state.purchases = p.purchases || [];
        state.sorties = p.sorties || [];
        state.fournisseurs = p.fournisseurs || [];
        state.recettes = p.recettes || [];
        state.ventes = p.ventes || [];
        state.commandes = p.commandes || [];
        state.activityLog = p.activityLog || [];
        state.categoriesArticles = p.categoriesArticles || [];
        state.emplacements = (p.emplacements && p.emplacements.length) ? p.emplacements : ['Économat'];
        state.transferts = p.transferts || [];
        state.categoriesOffert = p.categoriesOffert || [];
        state.notificationEmails = p.notificationEmails || [];
        state.lastAlertEmailDate = p.lastAlertEmailDate || '';
        state.members = d.members || [];
        state.foodCost = p.foodCost || null;
        fcEnsureDefaults();
        ensureCategoriesDefaults();
        state.appName = p.appName || 'STOCK';
        state.appSub = p.appSub || 'Gestion de Stock';
        state.lightMode = !!p.lightMode;
        state.ROWS_PER_PAGE = p.ROWS_PER_PAGE || 20;
        // Si déjà migré, on renvoie chaque domaine vers sa sous-collection ; sinon, ancien format.
        await saveState(isMigrated ? 'all' : undefined);
        if (!isMigrated) await cloudSaveNow('meta');
        showToast('✓ Données locales conservées et synchronisées');
      } else if (isMigrated) {
        // ===== Établissement déjà migré : lecture depuis les sous-collections (P1) =====
        await loadEstablishmentSubcollections(d);
        window.setSyncStatus('ok','Toutes les modifications sont sauvegardées');
      } else {
      // ===== Ancien format (pas encore migré) : lecture directe des tableaux, comme avant =====
      state.articles = d.articles || [];
      state.purchases = d.purchases || [];
      state.sorties = d.sorties || [];
      state.fournisseurs = d.fournisseurs || [];
      state.recettes = d.recettes || [];
      state.ventes = d.ventes || [];
      state.commandes = d.commandes || [];
      state.activityLog = d.activityLog || [];
      state.categoriesArticles = d.categoriesArticles || [];
      state.emplacements = (d.emplacements && d.emplacements.length) ? d.emplacements : ['Économat'];
      state.transferts = d.transferts || [];
      state.categoriesOffert = d.categoriesOffert || [];
      state.notificationEmails = d.notificationEmails || [];
      state.lastAlertEmailDate = d.lastAlertEmailDate || '';
      state.members = d.members || [];
      state.foodCost = d.foodCost || null;
      fcEnsureDefaults();
      ensureCategoriesDefaults();
      state.appName = d.appName || 'STOCK';
      state.appSub = d.appSub || 'Gestion de Stock';
      state.lightMode = !!d.lightMode;
      state.ROWS_PER_PAGE = d.ROWS_PER_PAGE || 20;
      window.setSyncStatus('ok','Toutes les modifications sont sauvegardées');
      }
    } else {
      let migrated = false;
      try {
        const saved = localStorage.getItem('gestion_stock_v2');
        if (saved) {
          const p = JSON.parse(saved);
          state.articles = p.articles || [];
          state.purchases = p.purchases || [];
          state.sorties = p.sorties || [];
          state.fournisseurs = p.fournisseurs || [];
          state.recettes = p.recettes || [];
          state.ventes = p.ventes || [];
          state.commandes = p.commandes || [];
          state.activityLog = p.activityLog || [];
          state.categoriesArticles = p.categoriesArticles || [];
        state.emplacements = (p.emplacements && p.emplacements.length) ? p.emplacements : ['Économat'];
        state.transferts = p.transferts || [];
          state.categoriesOffert = p.categoriesOffert || [];
          state.notificationEmails = p.notificationEmails || [];
          state.lastAlertEmailDate = p.lastAlertEmailDate || '';
          state.foodCost = p.foodCost || null;
          state.appName = p.appName || 'STOCK';
          state.appSub = p.appSub || 'Gestion de Stock';
          state.lightMode = p.lightMode || false;
          state.ROWS_PER_PAGE = p.ROWS_PER_PAGE || 20;
          migrated = state.articles.length>0 || state.purchases.length>0 || state.sorties.length>0 || state.fournisseurs.length>0;
        }
      } catch(e) {}
      // Nouvel établissement : on démarre directement au format sous-collections (P1),
      // pas besoin de passer par la case migration.
      window._migrationPending = false;
      await setDoc(doc(db, 'users', window._etablissementId), { migratedAt: serverTimestamp() }, { merge: true });
      await saveState('all');
      if (migrated) showToast('✓ Données locales migrées vers votre compte');
    }
  } catch (e) {
    console.error('Erreur de chargement Firestore:', e);
    window.setSyncStatus('err','Hors-ligne — données en cache');
  }
  if (window._role === 'admin' && !(state.members||[]).length) {
    state.members = [{ uid: window._etablissementId, email: user.email, role: 'admin' }];
    cloudSaveNow('meta'); // persiste immédiatement pour les comptes qui existaient avant la V5
  }
  state.articlePage = 1; state.entreePage = 1; state.sortiePage = 1; state.ventePage = 1;
  fcEnsureDefaults();
  ensureCategoriesDefaults();
  applyTheme(); applyAppName(); renderDashboard();
  if (window._role === 'scanner') {
    document.getElementById('app-root').style.display = 'none';
    if (typeof enterScannerMode === 'function') enterScannerMode();
    window.setSyncStatus('ok','Connecté');
    return;
  }
  // Restreindre l'interface pour un compte économe : pas d'accès aux Paramètres, pas de suppression.
  const navParam = document.getElementById('nav-parametres');
  if (navParam) navParam.style.display = (window.isEconome() || window.isSecteurResponsable()) ? 'none' : '';
  document.body.classList.toggle('role-econome', window.isEconome());
  document.body.classList.toggle('role-secteur', window.isSecteurResponsable());
  if (window.isSecteurResponsable()) {
    // Accès restreint à un seul secteur : masquer tout ce qui ne concerne pas son périmètre
    // (achats/fournisseurs/prix/analyses/administration). Voir README, section "Rôles".
    const pagesInterdites = ['dashboard','entrees','commandes','historiqueprix','fournisseurs','analyse','foodcost','recettes','import'];
    document.querySelectorAll('.nav-item').forEach(el => {
      const oc = el.getAttribute('onclick') || '';
      if (pagesInterdites.some(p => oc.includes("showPage('"+p+"')"))) el.style.display = 'none';
    });
  }
  showPage('aujourdhui');
  if (typeof checkAndSendStockAlertEmail === 'function') checkAndSendStockAlertEmail();
  if (typeof checkAndWriteServerBackup === 'function') checkAndWriteServerBackup();
}

window.onUserReady = function(user) {
  loadUserData(user).then(() => {
    if (window._startPresence) window._startPresence();
    if (window._role !== 'scanner' && window.startScanRelayListener) window.startScanRelayListener();
  });
};

// ===== GESTION DES COMPTES ÉCONOME (multi-utilisateurs par établissement) =====
// Un compte "économe" a accès complet à l'application sauf : suppression et Paramètres.
// L'admin crée le compte économe (email + mot de passe) directement depuis les Paramètres.
// Techniquement : on utilise une app Firebase secondaire pour créer le compte sans
// déconnecter la session de l'admin, puis on enregistre un lien accountLinks/{uid}
// qui pointe vers l'établissement de l'admin (son propre uid) avec le rôle 'econome'.
window.createEconomeAccount = async function() {
  if (window.isEconome() || window.isSecteurResponsable()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
  const emailEl = document.getElementById('econome-email');
  const pwdEl = document.getElementById('econome-password');
  const email = emailEl.value.trim();
  const pwd = pwdEl.value;
  if (!email || !pwd) { showToast('⚠ Email et mot de passe requis','var(--red)'); return; }
  if (pwd.length < 6) { showToast('⚠ Mot de passe trop court (6 caractères min.)','var(--red)'); return; }
  try {
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary-'+Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pwd);
    const newUid = cred.user.uid;
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    await setDoc(doc(db, 'accountLinks', newUid), {
      etablissementId: window._etablissementId,
      role: 'econome',
      email,
      createdAt: serverTimestamp()
    });
    state.members = state.members || [];
    state.members.push({ uid: newUid, email, role: 'econome' });
    saveState('meta');
    renderSettings();
    emailEl.value = ''; pwdEl.value = '';
    showToast('✓ Compte économe créé : '+email);
  } catch (err) {
    showToast('⚠ '+authErrorMsg(err.code||''), 'var(--red)');
  }
};

// Crée un compte "Scanner" : même mécanisme qu'un compte économe, mais avec le rôle 'scanner'.
// Ce compte, une fois connecté (typiquement sur un téléphone), atterrit sur l'écran plein écran
// "Mode Scanner" au lieu de l'interface normale — voir onAuthStateChanged plus bas.
window.createScannerAccount = async function() {
  if (window.isEconome() || window.isScanner() || window.isSecteurResponsable()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
  const emailEl = document.getElementById('scanner-account-email');
  const pwdEl = document.getElementById('scanner-account-password');
  const email = emailEl.value.trim();
  const pwd = pwdEl.value;
  if (!email || !pwd) { showToast('⚠ Email et mot de passe requis','var(--red)'); return; }
  if (pwd.length < 6) { showToast('⚠ Mot de passe trop court (6 caractères min.)','var(--red)'); return; }
  try {
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary-'+Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pwd);
    const newUid = cred.user.uid;
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    await setDoc(doc(db, 'accountLinks', newUid), {
      etablissementId: window._etablissementId,
      role: 'scanner',
      email,
      createdAt: serverTimestamp()
    });
    state.members = state.members || [];
    state.members.push({ uid: newUid, email, role: 'scanner' });
    saveState('meta');
    renderSettings();
    emailEl.value = ''; pwdEl.value = '';
    showToast('✓ Compte Scanner créé : '+email);
  } catch (err) {
    showToast('⚠ '+authErrorMsg(err.code||''), 'var(--red)');
  }
};

// Crée un compte "Responsable de secteur" : lié à UN secteur précis (parmi ceux définis dans
// Paramètres). Ce compte ne pourra enregistrer que des sorties/ventes pour ce secteur, et des
// retours vers l'Économat — jamais recevoir de distribution (voir isSecteurResponsable() et
// les restrictions dans entrees-sorties.js/ventes.js/transferts.js/ui-core.js).
window.createSecteurAccount = async function() {
  if (window.isEconome() || window.isScanner() || window.isSecteurResponsable()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
  const emailEl = document.getElementById('secteur-account-email');
  const pwdEl = document.getElementById('secteur-account-password');
  const secteurEl = document.getElementById('secteur-account-secteur');
  const email = emailEl.value.trim();
  const pwd = pwdEl.value;
  const secteur = secteurEl.value;
  if (!email || !pwd || !secteur) { showToast('⚠ Email, mot de passe et secteur requis','var(--red)'); return; }
  if (pwd.length < 6) { showToast('⚠ Mot de passe trop court (6 caractères min.)','var(--red)'); return; }
  try {
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary-'+Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pwd);
    const newUid = cred.user.uid;
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    await setDoc(doc(db, 'accountLinks', newUid), {
      etablissementId: window._etablissementId,
      role: 'secteur',
      secteur,
      email,
      createdAt: serverTimestamp()
    });
    state.members = state.members || [];
    state.members.push({ uid: newUid, email, role: 'secteur', secteur });
    saveState('meta');
    renderSettings();
    emailEl.value = ''; pwdEl.value = '';
    showToast('✓ Compte Responsable de secteur créé : '+email+' ('+secteur+')');
  } catch (err) {
    showToast('⚠ '+authErrorMsg(err.code||''), 'var(--red)');
  }
};

window.removeEconomeAccount = async function(uid, email) {
  if (window.isEconome() || window.isSecteurResponsable()) { showToast('⚠ Réservé à l\'administrateur','var(--red)'); return; }
  if (!confirm('Retirer l\'accès de '+email+' à cet établissement ?\n(Le compte lui-même n\'est pas supprimé, il ne pourra simplement plus se connecter à ces données.)')) return;
  try {
    await deleteDoc(doc(db, 'accountLinks', uid));
    state.members = (state.members||[]).filter(m => m.uid !== uid);
    saveState('meta');
    renderSettings();
    showToast('✓ Accès retiré pour '+email);
  } catch (err) {
    showToast('⚠ Erreur : '+err.message, 'var(--red)');
  }
};

function adminGetStock(a) { return (a.total_entrant||0) - (a.total_sortant||0); }

// ===== Actions admin plateforme (arnsog@gmail.com uniquement, vérifié côté règles Firestore) =====

// Active/désactive un compte (admin d'établissement, économe ou scanner). Crée le document
// accountLinks s'il n'existait pas encore (cas du tout premier compte admin d'un établissement,
// qui n'en a normalement pas besoin — voir resolveAccountContext).
window.setAccountDisabled = async function(uid, etablissementId, role, disabled) {
  try {
    await setDoc(doc(db, 'accountLinks', uid), { etablissementId, role, disabled }, { merge: true });
    return true;
  } catch (e) {
    console.error('Erreur setAccountDisabled:', e);
    if (typeof showToast === 'function') showToast('⚠ Erreur : '+e.message, 'var(--red)');
    return false;
  }
};

window.adminSendPasswordReset = async function(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    if (typeof showToast === 'function') showToast('✓ Email de réinitialisation envoyé à '+email);
    return true;
  } catch (e) {
    if (typeof showToast === 'function') showToast('⚠ '+authErrorMsg(e.code||''), 'var(--red)');
    return false;
  }
};

window.adminRenameEtablissement = async function(etablissementId, appName, appSub) {
  try {
    await setDoc(doc(db, 'users', etablissementId), { appName, appSub }, { merge: true });
    if (typeof showToast === 'function') showToast('✓ Établissement renommé');
    return true;
  } catch (e) {
    if (typeof showToast === 'function') showToast('⚠ Erreur : '+e.message, 'var(--red)');
    return false;
  }
};

window.adminDeleteEtablissement = async function(etablissementId) {
  try {
    const linksSnap = await getDocs(query(collection(db, 'accountLinks'), where('etablissementId', '==', etablissementId)));
    for (const d of linksSnap.docs) { await deleteDoc(d.ref); }
    const backupsSnap = await getDocs(collection(db, 'users', etablissementId, 'backups'));
    for (const d of backupsSnap.docs) { await deleteDoc(d.ref); }
    // P1 : les sous-collections data/{domaine} et activityLog ne sont pas supprimées
    // automatiquement avec le document parent — il faut les vider explicitement.
    for (const dom of Object.keys(DOMAIN_ARRAY_KEYS)) {
      await deleteDoc(doc(db, 'users', etablissementId, 'data', dom)).catch(() => {});
    }
    await deleteCollectionBatched(collection(db, 'users', etablissementId, 'activityLog'));
    await deleteDoc(doc(db, 'users', etablissementId));
    if (typeof showToast === 'function') showToast('🗑 Établissement supprimé définitivement', 'var(--red)');
    return true;
  } catch (e) {
    if (typeof showToast === 'function') showToast('⚠ Erreur : '+e.message, 'var(--red)');
    return false;
  }
};

// Sauvegarde serveur automatique (indépendante des instantanés locaux, qui restent sur
// l'appareil et sont invisibles pour l'admin plateforme). Rotation sur 14 créneaux — au bout
// de 14 jours d'usage, chaque nouvelle sauvegarde écrase automatiquement celle d'il y a 14
// jours, sans logique de purge à gérer séparément.
window.writeServerBackup = async function(etablissementId, snapshotData) {
  try {
    const slot = 'slot-' + (Math.floor(Date.now()/86400000) % 14);
    await setDoc(doc(db, 'users', etablissementId, 'backups', slot), {
      data: JSON.stringify(snapshotData),
      savedAt: Date.now()
    });
    return true;
  } catch (e) {
    console.error('Erreur sauvegarde serveur:', e);
    return false;
  }
};
window.listServerBackups = async function(etablissementId) {
  try {
    const snap = await getDocs(query(collection(db, 'users', etablissementId, 'backups'), orderBy('savedAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, savedAt: d.data().savedAt, data: d.data().data }));
  } catch (e) {
    console.error('Erreur liste sauvegardes:', e);
    return [];
  }
};
// Restaure une sauvegarde serveur choisie par l'admin (parmi les 14 disponibles pour cet
// établissement). Détecte automatiquement si l'établissement est migré (sous-collections, P1)
// ou non, et restaure au bon endroit — sans jamais toucher au flag migratedAt lui-même,
// pour ne pas faire "revenir en arrière" un établissement déjà migré.
window.restoreServerBackup = async function(etablissementId, backupData) {
  try {
    const parsed = JSON.parse(backupData);
    const metaRef = doc(db, 'users', etablissementId);
    const currentSnap = await getDoc(metaRef);
    const isMigrated = currentSnap.exists() && !!currentSnap.data().migratedAt;

    if (isMigrated) {
      // ===== Établissement migré : restaurer dans les sous-collections =====
      for (const [dom, key] of Object.entries(DOMAIN_ARRAY_KEYS)) {
        await setDoc(doc(db, 'users', etablissementId, 'data', dom), {
          items: parsed[key] || [], updatedAt: serverTimestamp()
        });
      }
      // Le journal de la sauvegarde remplace entièrement l'existant.
      await replaceActivityLogFull(etablissementId, true, parsed.activityLog);
      // merge:true + pas de champ migratedAt dans l'objet => le flag reste intact.
      await setDoc(metaRef, {
        categoriesArticles: parsed.categoriesArticles || [],
        emplacements: (parsed.emplacements && parsed.emplacements.length) ? parsed.emplacements : ['Économat'],
        categoriesOffert: parsed.categoriesOffert || [],
        notificationEmails: parsed.notificationEmails || [],
        lastAlertEmailDate: parsed.lastAlertEmailDate || '',
        foodCost: parsed.foodCost || null,
        appName: parsed.appName || 'STOCK',
        appSub: parsed.appSub || 'Gestion de Stock',
        lightMode: !!parsed.lightMode,
        ROWS_PER_PAGE: parsed.ROWS_PER_PAGE || 20,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      // ===== Ancien format : comportement historique inchangé =====
      await setDoc(metaRef, parsed, { merge: false });
    }
    return true;
  } catch (e) {
    console.error('Erreur restauration sauvegarde serveur:', e);
    return false;
  }
};

window.loadAdminUsers = async function() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody || !window.isAdmin()) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text3)">Chargement...</td></tr>';
  try {
    const snap = await getDocs(collection(db, 'users'));
    window._adminData = {};
    const rows = [];
    // Vue Admin Plateforme : pour un établissement migré (P1), les tableaux (articles, ventes...)
    // ne sont plus sur le document principal mais dans des sous-collections users/{id}/data/{domaine}.
    // On les recharge ici pour que les KPIs plateforme restent corrects après migration.
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      if (d.migratedAt) {
        try {
          const [aSnap, pSnap, sSnap, fSnap, rSnap] = await Promise.all([
            getDoc(doc(db, 'users', docSnap.id, 'data', 'articles')),
            getDoc(doc(db, 'users', docSnap.id, 'data', 'purchases')),
            getDoc(doc(db, 'users', docSnap.id, 'data', 'sorties')),
            getDoc(doc(db, 'users', docSnap.id, 'data', 'fournisseurs')),
            getDoc(doc(db, 'users', docSnap.id, 'data', 'recettes')),
          ]);
          d.articles = aSnap.exists() ? (aSnap.data().items||[]) : [];
          d.purchases = pSnap.exists() ? (pSnap.data().items||[]) : [];
          d.sorties = sSnap.exists() ? (sSnap.data().items||[]) : [];
          d.fournisseurs = fSnap.exists() ? (fSnap.data().items||[]) : [];
          d.recettes = rSnap.exists() ? (rSnap.data().items||[]) : [];
        } catch (e) {
          console.warn('Lecture sous-collections échouée pour', docSnap.id, e);
        }
      }
      window._adminData[docSnap.id] = d;
      const articles = d.articles || [];
      let valeur = 0, alertes = 0;
      articles.forEach(a => {
        const s = adminGetStock(a);
        if (s<=0 || (a.stock_min>0 && s<a.stock_min)) alertes++;
        if (s>0 && a.prix_achat>0) valeur += s*a.prix_achat;
      });
      const mouvements = (d.purchases||[]).length + (d.sorties||[]).length;
      let lastSync = null;
      if (d.updatedAt && d.updatedAt.seconds) lastSync = new Date(d.updatedAt.seconds*1000);
      rows.push({
        uid: docSnap.id, email: d.email || docSnap.id, appName: d.appName || 'STOCK',
        nbArticles: articles.length, nbFourn: (d.fournisseurs||[]).length, nbRecettes: (d.recettes||[]).length,
        mouvements, alertes, valeur, lastSync
      });
    }
    rows.sort((a,b)=>(a.email||'').localeCompare(b.email||''));
    const totalUsers = rows.length;
    const totalArticles = rows.reduce((s,r)=>s+r.nbArticles,0);
    const totalAlertes = rows.reduce((s,r)=>s+r.alertes,0);
    const totalValeur = rows.reduce((s,r)=>s+r.valeur,0);
    document.getElementById('admin-kpi').innerHTML =
      '<div class="kpi gold"><div class="kpi-label">Utilisateurs</div><div class="kpi-value">'+totalUsers+'</div><div class="kpi-sub">comptes actifs</div></div>'
      +'<div class="kpi blue"><div class="kpi-label">Articles (total)</div><div class="kpi-value">'+totalArticles+'</div><div class="kpi-sub">toutes structures</div></div>'
      +'<div class="kpi red"><div class="kpi-label">Alertes (total)</div><div class="kpi-value">'+totalAlertes+'</div><div class="kpi-sub">articles à réappro.</div></div>'
      +'<div class="kpi orange"><div class="kpi-label">Valeur stock (total)</div><div class="kpi-value" style="font-size:20px">'+(totalValeur>0?fmtNum(Math.round(totalValeur)):'—')+'</div><div class="kpi-sub">FCFA estimé</div></div>';
    document.getElementById('admin-sub').textContent = totalUsers+' utilisateur'+(totalUsers>1?'s':'');
    tbody.innerHTML = rows.length ? rows.map(r => `<tr>
      <td><strong>${r.email}</strong><div style="font-size:11px;color:var(--text3)">${r.appName}</div></td>
      <td>${r.nbArticles}</td>
      <td>${r.nbFourn}</td>
      <td>${r.nbRecettes}</td>
      <td>${r.mouvements}</td>
      <td style="color:${r.alertes>0?'var(--red)':'var(--green)'};font-weight:600">${r.alertes}</td>
      <td style="color:var(--gold)">${r.valeur>0?fmtNum(Math.round(r.valeur))+' F':'—'}</td>
      <td style="font-size:11px;color:var(--text3)">${r.lastSync?r.lastSync.toLocaleString('fr-FR'):'—'}</td>
      <td><button class="btn btn-outline btn-sm" onclick="showAdminDetail('${r.uid}')">👁 Détail</button></td>
    </tr>`).join('') : '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text3)">Aucun utilisateur</td></tr>';
  } catch (e) {
    console.error('Erreur chargement admin:', e);
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--red)">⚠ Erreur : '+e.message+'</td></tr>';
  }
};

window.showAdminDetail = function(uid) {
  const d = window._adminData && window._adminData[uid];
  if (!d) return;
  window._adminCurrentUid = uid;
  const articles = d.articles || [];
  const mouvements = [
    ...(d.purchases||[]).map(p=>({date:p.date,type:'Entrée',article:p.article,qte:p.quantite,detail:p.fournisseur||''})),
    ...(d.sorties||[]).map(s=>({date:s.date,type:'Sortie',article:s.article,qte:s.quantite,detail:s.secteur||''}))
  ].sort((a,b)=>b.date>a.date?1:-1).slice(0,25);
  const alertes = articles.filter(a=>{const s=adminGetStock(a);return s<=0||(a.stock_min>0&&s<a.stock_min);});
  const members = d.members || [];
  const membersHtml = members.length ? members.map(m => {
    const statusBadge = m.disabled ? '<span class="badge badge-red">Désactivé</span>' : '<span class="badge badge-green">Actif</span>';
    const roleLabel = m.role==='admin'?'Admin':m.role==='scanner'?'Scanner':'Économe';
    return '<div class="setting-row">'
    +'<div><div class="setting-label">'+m.email+' <span style="font-size:11px;color:var(--text3)">('+roleLabel+')</span></div><div class="setting-desc">'+statusBadge+'</div></div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
    +'<button class="btn btn-outline btn-sm" onclick="window.adminSendPasswordReset(\''+m.email+'\')">✉ Reset MDP</button>'
    +'<button class="btn '+(m.disabled?'btn-success':'btn-danger')+' btn-sm" onclick="adminToggleAccount(\''+m.uid+'\',\''+uid+'\',\''+(m.role||'admin')+'\','+(!m.disabled)+')">'+(m.disabled?'✓ Réactiver':'⛔ Désactiver')+'</button>'
    +'</div></div>';
  }).join('') : '<div style="color:var(--text3);font-size:12px;padding:8px 0">Aucun compte listé (établissement ancien, créé avant la gestion multi-comptes)</div>';
  document.getElementById('admin-detail-title').textContent = (d.email||uid)+' — '+(d.appName||'STOCK');
  document.getElementById('admin-detail-body').innerHTML =
    '<div class="settings-section"><div class="settings-title">Établissement</div>'
    +'<div class="form-row" style="margin-bottom:10px">'
    +'<input type="text" id="admin-rename-name" placeholder="Nom" value="'+(d.appName||'').replace(/"/g,'&quot;')+'">'
    +'<input type="text" id="admin-rename-sub" placeholder="Sous-titre" value="'+(d.appSub||'').replace(/"/g,'&quot;')+'">'
    +'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="btn btn-outline btn-sm" onclick="adminSaveRename(\''+uid+'\')">💾 Renommer</button>'
    +'<button class="btn btn-danger btn-sm" onclick="adminConfirmDelete(\''+uid+'\',\''+(d.appName||uid).replace(/'/g,"\\'")+'\')">🗑 Supprimer cet établissement</button>'
    +'</div></div>'
    +'<div class="settings-section"><div class="settings-title">Comptes ('+members.length+')</div>'+membersHtml+'</div>'
    +'<div class="settings-section"><div class="settings-title">Sauvegardes serveur</div><div id="admin-backups-list" style="font-size:12px;color:var(--text3)">Chargement...</div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px">'
    +kpiBox('Articles', articles.length)
    +kpiBox('Fournisseurs', (d.fournisseurs||[]).length)
    +kpiBox('Recettes', (d.recettes||[]).length)
    +kpiBox('Alertes', alertes.length, alertes.length>0?'var(--red)':'var(--green)')
    +'</div>'
    +'<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px">Articles ('+articles.length+')</div>'
    +'<div style="max-height:240px;overflow-y:auto;margin-bottom:18px;border:1px solid var(--border);border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr><th style="background:var(--surface2);padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Désignation</th><th style="background:var(--surface2);padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Catégorie</th><th style="background:var(--surface2);padding:7px 10px;text-align:right;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Stock</th><th style="background:var(--surface2);padding:7px 10px;text-align:right;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Stock min</th></tr></thead>'
    +'<tbody>'+(articles.length?articles.map(a=>{const s=adminGetStock(a);const c=s<=0?'var(--red)':(a.stock_min>0&&s<a.stock_min?'var(--orange)':'var(--text)');return '<tr><td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3)">'+a.designation+'</td><td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3)">'+(a.categorie||'—')+'</td><td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3);text-align:right;color:'+c+'">'+fmt(s)+' '+(a.unite||'')+'</td><td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3);text-align:right">'+fmt(a.stock_min||0)+'</td></tr>';}).join(''):'<tr><td colspan="4" style="text-align:center;padding:12px;color:var(--text3)">Aucun article</td></tr>')+'</tbody></table></div>'
    +'<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px">Derniers mouvements</div>'
    +'<div style="max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr><th style="background:var(--surface2);padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Date</th><th style="background:var(--surface2);padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Type</th><th style="background:var(--surface2);padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Article</th><th style="background:var(--surface2);padding:7px 10px;text-align:right;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Qté</th><th style="background:var(--surface2);padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;font-size:11px;color:var(--text3)">Détail</th></tr></thead>'
    +'<tbody>'+(mouvements.length?mouvements.map(m=>'<tr><td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3)">'+fmtDate(m.date)+'</td><td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3)"><span class="badge '+(m.type==='Entrée'?'badge-green':'badge-red')+'">'+m.type+'</span></td><td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3)">'+m.article+'</td><td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3);text-align:right">'+fmt(m.qte)+'</td><td style="padding:5px 10px;border-bottom:1px solid rgba(46,46,52,0.3);font-size:11px;color:var(--text3)">'+(m.detail||'—')+'</td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;padding:12px;color:var(--text3)">Aucun mouvement</td></tr>')+'</tbody></table></div>';
  document.getElementById('modal-admin-detail').classList.add('open');
  if (typeof window.listServerBackups === 'function') {
    window.listServerBackups(uid).then(backups => {
      window._adminBackupsCache = window._adminBackupsCache || {};
      window._adminBackupsCache[uid] = backups;
      const el = document.getElementById('admin-backups-list');
      if (!el) return;
      el.innerHTML = backups.length ? backups.map(b => '<div class="setting-row"><div><div class="setting-label">'+new Date(b.savedAt).toLocaleString('fr-FR')+'</div></div><button class="btn btn-outline btn-sm" onclick="adminRestoreBackup(\''+uid+'\',\''+b.id+'\')">↺ Restaurer</button></div>').join('') : '<div style="color:var(--text3);font-size:12px;padding:4px 0">Aucune sauvegarde serveur pour le moment (générée automatiquement une fois par jour à la connexion d\'un compte)</div>';
    });
  }
};

onAuthStateChanged(auth, user => {
  const authScreen = document.getElementById('auth-screen');
  const appRoot = document.getElementById('app-root');
  if (user) {
    if (user.isAnonymous) {
      authScreen.style.display = 'none';
      appRoot.style.display = 'none';
      if (typeof enterPairedScannerMode === 'function') enterPairedScannerMode(user);
      return;
    }
    authScreen.style.display = 'none';
    appRoot.style.display = '';
    const initials = (user.email||'??').substring(0,2).toUpperCase();
    const elI = document.getElementById('user-initials');
    const elE = document.getElementById('user-email');
    if (elI) elI.textContent = initials;
    if (elE) elE.textContent = user.email;
    window._currentUser = user;
    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin) navAdmin.style.display = window.isAdmin() ? '' : 'none';
    if (typeof window.onUserReady === 'function') window.onUserReady(user);
  } else {
    if (typeof removePresence === 'function') removePresence();
    if (_presenceTimer) clearInterval(_presenceTimer);
    if (_scanRelayUnsub) { _scanRelayUnsub(); _scanRelayUnsub = null; }
    if (_pairingUnsub) { _pairingUnsub(); _pairingUnsub = null; }
    appRoot.style.display = 'none';
    authScreen.style.display = 'flex';
    window._currentUser = null;
    window._etablissementId = null;
    window._role = null;
    document.body.classList.remove('role-econome');
    if (typeof window.resetLocalState === 'function') window.resetLocalState();
    window.setSyncStatus('', '');
    if (window._pendingPairId) {
      // On est en train de s'appairer (connexion anonyme en cours) : on ne montre jamais
      // le formulaire de connexion normal, même pendant l'état transitoire "pas encore connecté".
      authScreen.style.display = 'none';
    } else {
      document.getElementById('auth-password').value = '';
      document.getElementById('auth-password-confirm').value = '';
      window.authSwitchTab('login');
      document.getElementById('auth-error').style.display = 'none';
    }
  }
});
