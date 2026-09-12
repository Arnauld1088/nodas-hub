// ============================================================
// NODAS HUB — module: state-vars.js
// Extrait automatiquement de app.js (V6-24) — voir README.md
// ============================================================

var state = {
articles: [], purchases: [], sorties: [], fournisseurs: [], recettes: [], ventes: [], commandes: [], activityLog: [],
transferts: [],
categoriesArticles: [], categoriesOffert: [], emplacements: ['Économat'],
notificationEmails: [], lastAlertEmailDate: '',
articlePage:1, entreePage:1, sortiePage:1, ventePage:1, commandePage:1, logPage:1, transfertPage:1, ROWS_PER_PAGE:20,
appName:'STOCK', appSub:'Gestion de Stock', lightMode:false
};

var importBuffers = {};

// Historique local de sauvegardes automatiques : filet de sécurité indépendant du cloud.
// Garde les 10 derniers instantanés complets (max 1 toutes les 10 min pour ne pas saturer le
// stockage local), restaurables depuis Paramètres même si la synchronisation cloud a un souci.
var _lastSnapshotAt = 0;

// ===== JOURNAL D'ACTIVITÉ =====
var JOURNAL_ACTION_LABELS = {
article_create:'Article créé', article_edit:'Article modifié', article_delete:'Article supprimé',
entree:'Entrée', sortie:'Sortie', facture_entree:'Facture entrée', facture_sortie:'Bon de sortie',
vente:'Vente', vente_delete:'Vente supprimée', correction:'Correction stock',
fournisseur_create:'Fournisseur créé', fournisseur_edit:'Fournisseur modifié', fournisseur_delete:'Fournisseur supprimé',
recette_create:'Recette créée', recette_edit:'Recette modifiée', recette_delete:'Recette supprimée',
commande_create:'Bon de commande créé', commande_edit:'Bon de commande modifié', commande_delete:'Bon de commande supprimé', commande_reception:'Réception commande',
reset:'Réinitialisation', restore:'Restauration JSON', import:'Import', journal_clear:'Journal vidé', foodcost_manual:'Food Cost (donnée manuelle)',
transfert_create:'Transfert interne', transfert_delete:'Transfert supprimé', emplacement_add:'Emplacement ajouté', emplacement_remove:'Emplacement retiré',
secteur_reconciliation:'Historique rattaché aux emplacements'
};

var JOURNAL_ACTION_COLORS = {
article_create:'green', entree:'green', vente:'green', fournisseur_create:'green', recette_create:'green', commande_create:'green', transfert_create:'green', emplacement_add:'green',
article_edit:'blue', correction:'blue', fournisseur_edit:'blue', recette_edit:'blue', commande_edit:'blue', commande_reception:'blue', facture_entree:'green', facture_sortie:'orange', sortie:'orange', foodcost_manual:'blue', secteur_reconciliation:'blue',
article_delete:'red', vente_delete:'red', fournisseur_delete:'red', recette_delete:'red', commande_delete:'red', reset:'red', journal_clear:'red', transfert_delete:'red', emplacement_remove:'red',
restore:'gray', import:'gray'
};

// ===== SCANNER (codes-barres / QR) =====
var _scannerInstance = null;

var _scannerCallback = null;

var _scannerOptions = {};
