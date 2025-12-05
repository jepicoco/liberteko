/**
 * Admin Navigation Configuration
 * Configuration centralisée des menus de l'interface admin
 */

// Configuration des éléments du menu
const MENU_ITEMS = [
    {
        id: 'scanner',
        label: 'Scanner',
        icon: 'upc-scan',
        href: 'scanner.html',
        highlight: true,  // Met en evidence ce bouton
        floatingButton: true,  // Affiche comme bouton flottant sur mobile
        module: 'scanner'
    },
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'speedometer2',
        href: 'dashboard.html'
    },
    {
        id: 'adherents',
        label: 'Adhérents',
        icon: 'people',
        href: 'adherents.html'
    },
    {
        id: 'jeux',
        label: 'Ludothèque',
        icon: 'dice-6',
        href: 'jeux.html',
        color: '#FFE5B4',  // Pastel pêche
        module: 'ludotheque'
    },
    {
        id: 'livres',
        label: 'Bibliothèque',
        icon: 'book',
        href: 'livres.html',
        color: '#B4D8E7',  // Pastel bleu
        module: 'bibliotheque'
    },
    {
        id: 'films',
        label: 'Filmothèque',
        icon: 'film',
        href: 'films.html',
        color: '#E7B4D8',  // Pastel rose
        module: 'filmotheque'
    },
    {
        id: 'disques',
        label: 'Discothèque',
        icon: 'vinyl',
        href: 'disques.html',
        color: '#B4E7C4',  // Pastel vert
        module: 'discotheque'
    },
    {
        id: 'emprunts',
        label: 'Emprunts',
        icon: 'arrow-left-right',
        href: 'emprunts.html'
    },
    {
        id: 'cotisations',
        label: 'Cotisations',
        icon: 'receipt',
        href: 'cotisations.html'
    },
    {
        id: 'statistiques',
        label: 'Statistiques',
        icon: 'graph-up',
        href: 'statistiques.html'
    },
    {
        id: 'historique-communications',
        label: 'Communications',
        icon: 'send',
        href: 'historique-communications.html',
        module: 'communications'
    },
    {
        id: 'parametres',
        label: 'Paramètres',
        icon: 'gear-fill',
        href: 'parametres.html',
        adminOnly: true  // Visible uniquement pour les administrateurs
    }
];

/**
 * Retourne la configuration du menu
 */
function getMenuItems() {
    return MENU_ITEMS;
}

/**
 * Retourne l'élément de menu correspondant à l'ID
 */
function getMenuItem(id) {
    return MENU_ITEMS.find(item => item.id === id);
}

/**
 * Retourne l'élément de menu correspondant au href
 */
function getMenuItemByHref(href) {
    return MENU_ITEMS.find(item => item.href === href);
}

/**
 * Détermine la page active à partir de l'URL
 */
function getActivePageId() {
    const currentPage = window.location.pathname.split('/').pop();
    const menuItem = getMenuItemByHref(currentPage);
    return menuItem ? menuItem.id : null;
}
