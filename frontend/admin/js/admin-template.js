/**
 * Admin Template Generator
 * Génère les éléments communs du template admin (navbar, sidebar)
 * Gère le chargement et le filtrage des modules actifs
 */

// Cache des modules actifs
const MODULES_CACHE_KEY = 'activeModules';
const MODULES_CACHE_TIMESTAMP_KEY = 'activeModulesTimestamp';
const MODULES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Variable globale pour les modules actifs
window.ACTIVE_MODULES = null;

/**
 * Charge les modules actifs depuis le cache ou l'API
 * @returns {Promise<Array<string>>} Liste des codes de modules actifs
 */
async function loadActiveModules() {
    try {
        // Vérifier le cache
        const cachedModules = localStorage.getItem(MODULES_CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(MODULES_CACHE_TIMESTAMP_KEY);

        if (cachedModules && cachedTimestamp) {
            const age = Date.now() - parseInt(cachedTimestamp);
            if (age < MODULES_CACHE_DURATION) {
                window.ACTIVE_MODULES = JSON.parse(cachedModules);
                return window.ACTIVE_MODULES;
            }
        }

        // Charger depuis l'API
        const token = localStorage.getItem('authToken');
        if (!token) {
            // Pas de token, considérer tous les modules actifs
            window.ACTIVE_MODULES = [];
            return window.ACTIVE_MODULES;
        }

        const response = await fetch('/api/parametres/modules-actifs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const modules = await response.json();
            window.ACTIVE_MODULES = modules;

            // Mettre en cache
            localStorage.setItem(MODULES_CACHE_KEY, JSON.stringify(modules));
            localStorage.setItem(MODULES_CACHE_TIMESTAMP_KEY, Date.now().toString());
        } else {
            // En cas d'erreur, utiliser le cache existant ou tableau vide
            window.ACTIVE_MODULES = cachedModules ? JSON.parse(cachedModules) : [];
        }

        return window.ACTIVE_MODULES;
    } catch (error) {
        console.error('Erreur chargement modules actifs:', error);
        // En cas d'erreur, considérer tous les modules actifs (fail-safe)
        window.ACTIVE_MODULES = null;
        return null;
    }
}

/**
 * Vérifie si un module est actif
 * @param {string} moduleCode - Code du module
 * @returns {boolean}
 */
function isModuleActive(moduleCode) {
    // Si pas de module spécifié, toujours actif
    if (!moduleCode) return true;

    // Si les modules n'ont pas été chargés ou erreur, considérer actif (fail-safe)
    if (window.ACTIVE_MODULES === null) return true;

    // Si tableau vide (pas de token), considérer actif
    if (window.ACTIVE_MODULES.length === 0) return true;

    return window.ACTIVE_MODULES.includes(moduleCode);
}

/**
 * Purge le cache des modules actifs
 */
function purgeModulesCache() {
    localStorage.removeItem(MODULES_CACHE_KEY);
    localStorage.removeItem(MODULES_CACHE_TIMESTAMP_KEY);
    window.ACTIVE_MODULES = null;
    console.log('Cache des modules purgé');
}

/**
 * Génère le HTML de la navbar
 */
function renderNavbar(activePage) {
    return `
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
            <div class="container-fluid">
                <a class="navbar-brand" href="dashboard.html">
                    <i class="bi bi-dice-5"></i> Ludothèque
                </a>
                <div class="navbar-nav ms-auto">
                    <a class="nav-link" href="dashboard.html"><i class="bi bi-house"></i> Accueil</a>
                    <a class="nav-link" href="#" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Déconnexion</a>
                </div>
            </div>
        </nav>
    `;
}

/**
 * Génère le bouton flottant Scanner pour mobile/tablette
 */
function renderFloatingButton() {
    const scannerItem = getMenuItems().find(item => item.floatingButton);
    if (!scannerItem) return '';

    // Vérifier si le module Scanner est actif
    if (!isModuleActive(scannerItem.module)) return '';

    // Ne pas afficher sur la page scanner elle-même
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === scannerItem.href) return '';

    return `
        <a href="${scannerItem.href}" class="floating-scanner-btn d-md-none" title="${scannerItem.label}">
            <i class="bi bi-${scannerItem.icon}"></i>
        </a>
        <style>
            .floating-scanner-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.8rem;
                box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
                z-index: 1050;
                text-decoration: none;
                transition: all 0.3s ease;
                animation: pulse-scanner 2s infinite;
            }
            .floating-scanner-btn:hover {
                transform: scale(1.1);
                color: white;
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.6);
            }
            @keyframes pulse-scanner {
                0%, 100% { box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4); }
                50% { box-shadow: 0 4px 25px rgba(40, 167, 69, 0.7); }
            }
            /* Masquer sur desktop (visible en sidebar) */
            @media (min-width: 768px) {
                .floating-scanner-btn { display: none !important; }
            }
        </style>
    `;
}

/**
 * Génère le HTML de la sidebar
 */
function renderSidebar(activePage) {
    const menuItems = getMenuItems();

    // Récupérer le rôle de l'utilisateur depuis le localStorage
    const userRole = localStorage.getItem('userRole') || 'usager';

    // Séparer Scanner des autres items
    const scannerItem = menuItems.find(item => item.highlight);
    const otherItems = menuItems.filter(item => !item.highlight);

    // Générer le bouton Scanner séparé (si module actif)
    let scannerHTML = '';
    if (scannerItem && isModuleActive(scannerItem.module)) {
        scannerHTML = `
            <a href="${scannerItem.href}" class="scanner-standalone-btn ${activePage === scannerItem.id ? 'active' : ''}">
                <i class="bi bi-${scannerItem.icon}"></i> ${scannerItem.label}
            </a>
        `;
    }

    // Générer le menu sans Scanner
    const menuHTML = otherItems
        .filter(item => {
            // Filtrer les items adminOnly si l'utilisateur n'est pas admin
            if (item.adminOnly && userRole !== 'administrateur') {
                return false;
            }
            // Filtrer par module actif
            if (item.module && !isModuleActive(item.module)) {
                return false;
            }
            return true;
        })
        .map(item => {
            const isActive = item.id === activePage ? 'active' : '';
            const colorStyle = item.color ? `style="background-color: ${item.color}; border-left: 4px solid ${item.color};"` : '';
            const activeStyle = item.color && isActive ? `style="background-color: ${item.color}; border-left: 4px solid #333; font-weight: bold;"` : colorStyle;
            return `
                <a href="${item.href}" class="list-group-item list-group-item-action ${isActive}" ${isActive ? activeStyle : colorStyle}>
                    <i class="bi bi-${item.icon}"></i> ${item.label}
                </a>
            `;
        }).join('');

    return `
        <style>
            #admin-sidebar {
                background-color: transparent !important;
            }
            .scanner-standalone-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: linear-gradient(135deg, #d4edda, #c3e6cb);
                border: 2px solid #155724;
                border-radius: 8px;
                margin: 10px;
                padding: 14px 16px;
                font-size: 1.1rem;
                font-weight: bold;
                text-align: center;
                text-decoration: none;
                color: #155724;
                transition: all 0.2s ease;
            }
            .scanner-standalone-btn i {
                margin-left: -15px;
                font-size: 1.2rem;
            }
            .scanner-standalone-btn:hover {
                background: linear-gradient(135deg, #c3e6cb, #b1dfbb);
                transform: scale(1.02);
                box-shadow: 0 2px 8px rgba(21, 87, 36, 0.3);
                color: #155724;
            }
            .scanner-standalone-btn.active {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border-color: #155724;
            }
            .sidebar-menu {
                border-top: 1px solid #dee2e6;
                margin-top: 5px;
                padding-top: 5px;
            }
        </style>
        ${scannerHTML}
        <div class="list-group list-group-flush sidebar-menu">
            ${menuHTML}
        </div>
    `;
}

/**
 * Initialise le template avec la page actuelle
 * @param {string} pageId - ID de la page active (dashboard, adherents, etc.)
 */
async function initTemplate(pageId) {
    // Charger les modules actifs d'abord
    await loadActiveModules();

    // Déterminer la page active
    const activePage = pageId || getActivePageId();

    // Générer la navbar
    const navbarContainer = document.getElementById('admin-navbar');
    if (navbarContainer) {
        navbarContainer.outerHTML = renderNavbar(activePage);
    }

    // Générer la sidebar
    const sidebarContainer = document.getElementById('admin-sidebar');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = renderSidebar(activePage);
    }

    // Ajouter le bouton flottant Scanner pour mobile
    const floatingBtn = renderFloatingButton();
    if (floatingBtn) {
        document.body.insertAdjacentHTML('beforeend', floatingBtn);
    }
}

/**
 * Initialisation automatique au chargement du DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    // Le template sera initialisé par la page elle-même via initTemplate()
    // ou automatiquement si aucun pageId n'est spécifié
});
