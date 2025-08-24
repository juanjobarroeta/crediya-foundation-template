import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

const sectionList = [
  {
    key: "creditos",
    icon: "💳",
    label: "Créditos",
    color: "from-green-500 to-emerald-600",
    links: [
      { href: "/loans", label: "Dashboard de Préstamos", icon: "📊" },
      { href: "/loans/unified", label: "🚀 Crear Préstamo", icon: "🚀" },
      { href: "/register-payment", label: "Registrar Pago", icon: "💰" },
      { href: "/admin/collections", label: "Cobranza", icon: "📞" },
      { href: "/loan-quotes", label: "Cotizador", icon: "📊" },
      { href: "/admin/overdue-loans", label: "Pagos Vencidos", icon: "⚠️" },
      { href: "/admin/generate-contract", label: "Generar Contrato", icon: "📄" },
    ],
  },
  {
    key: "clientes",
    icon: "🧍‍♂️",
    label: "Clientes",
    color: "from-indigo-500 to-blue-600",
    links: [
      { href: "/crm", label: "🚀 Directorio CRM", icon: "📋" },
      { href: "/create-customer", label: "Crear Cliente", icon: "👤" },
    ],
  },
  {
    key: "inventario",
    icon: "📦",
    label: "Inventario",
    color: "from-yellow-500 to-amber-600",
    links: [
      { href: "/admin/inventory", label: "Gestión de Inventario", icon: "📋" },
      { href: "/admin/inventory-request", label: "Solicitar Inventario", icon: "📦" },
    ],
  },
  {
    key: "contabilidad",
    icon: "🧾",
    label: "Contabilidad",
    color: "from-purple-500 to-violet-600",
    links: [
      { href: "/accounting-hub", label: "🏦 Centro de Contabilidad", icon: "🏦" },
      { href: "/admin/tesoreria", label: "Tesorería", icon: "🏦" },
      { href: "/income-statement", label: "Estado de Resultados", icon: "📈" },
      { href: "/balance-sheet", label: "Balance General", icon: "⚖️" },
      { href: "/admin/manual-entry", label: "Entrada Manual", icon: "✏️" },
      { href: "/admin/expenses", label: "Gastos", icon: "💸" },
      { href: "/admin/account-balances", label: "Movimientos por Cuenta", icon: "📊" },
    ],
  },
  {
    key: "tiendas",
    icon: "🏬",
    label: "Sucursales",
    color: "from-orange-500 to-red-600",
    links: [
      { href: "/admin/stores", label: "🚀 Gestión de Sucursales", icon: "🏪" },
      { href: "/dashboard/store-dashboard", label: "Análisis y Rentabilidad", icon: "📊" }
    ],
  },
  {
    key: "administracion",
    icon: "⚙️",
    label: "Administración",
    color: "from-gray-500 to-slate-600",
    links: [
      { href: "/admin/users", label: "🚀 Gestión de Usuarios", icon: "👥" },
      { href: "/financial-products", label: "Productos Financieros", icon: "🏦" },
      { href: "/admin/reclassify-payment", label: "Reclasificar Pagos", icon: "🔄" },
      { href: "/admin/budgets", label: "Presupuestos", icon: "💰" },
    ],
  },
];

const defaultOpenSections = {
  creditos: true,
  clientes: false,
  inventario: false,
  contabilidad: false,
  tiendas: false,
  administracion: false,
};

const SIDEBAR_STATE_KEY = "sidebar-state";
const FAVORITES_KEY = "sidebar-favorites";
const RECENT_ITEMS_KEY = "sidebar-recent";

const Sidebar = () => {
  const location = useLocation();
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (saved) {
        return { ...defaultOpenSections, ...JSON.parse(saved) };
      }
      return defaultOpenSections;
    } catch {
      return defaultOpenSections;
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentItems, setRecentItems] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_ITEMS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const searchRef = useRef(null);

  // Update recent items when location changes
  useEffect(() => {
    const currentPath = location.pathname;
    const currentItem = findItemByPath(currentPath);
    
    if (currentItem) {
      setRecentItems(prev => {
        const filtered = prev.filter(item => item.href !== currentPath);
        return [currentItem, ...filtered.slice(0, 4)];
      });
    }
  }, [location]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(openSections));
  }, [openSections]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(recentItems));
  }, [recentItems]);

  const findItemByPath = (path) => {
    for (const section of sectionList) {
      for (const link of section.links) {
        if (link.href === path) {
          return { ...link, section: section.label, sectionIcon: section.icon };
        }
      }
    }
    return null;
  };

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleFavorite = (item) => {
    setFavorites(prev => {
      const exists = prev.find(fav => fav.href === item.href);
      if (exists) {
        return prev.filter(fav => fav.href !== item.href);
      } else {
        return [...prev, item];
      }
    });
  };

  const isFavorite = (href) => {
    return favorites.some(fav => fav.href === href);
  };

  const isActive = (href) => {
    return location.pathname === href;
  };

  const filteredSections = sectionList.filter(section => {
    if (!searchTerm) return true;
    return section.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
           section.links.some(link => link.label.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const filteredFavorites = favorites.filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecent = recentItems.filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} min-h-screen flex-shrink-0 bg-gradient-to-b from-gray-900 to-black text-white transition-all duration-300 ease-in-out relative`}>
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-crediyaGreen text-black p-1 rounded-full shadow-lg hover:bg-white transition-colors duration-200 z-10"
      >
        {isCollapsed ? "→" : "←"}
      </button>

      <div className="p-4">
        {/* Logo */}
        <div className="flex items-center justify-center py-4 mb-6">
          <img 
            src="/logo2.png" 
            alt="CrediYa Logo" 
            className={`${isCollapsed ? 'h-8' : 'h-12'} transition-all duration-300`} 
          />
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
          <div className="mb-6">
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-crediyaGreen focus:outline-none transition-colors duration-200"
              />
              <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>
        )}

        {/* Dashboard Link */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
              isActive("/dashboard") 
                ? "bg-gradient-to-r from-crediyaGreen to-emerald-500 text-black font-semibold" 
                : "hover:bg-gray-800 text-gray-300 hover:text-white"
            }`}
          >
            <span className="text-lg">🏠</span>
            {!isCollapsed && <span className="font-semibold">Dashboard</span>}
          </Link>
        </div>

        {/* Favorites Section */}
        {!isCollapsed && favorites.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              Favoritos
            </h3>
            <div className="space-y-1">
              {filteredFavorites.map((item, index) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                    isActive(item.href)
                      ? "bg-gradient-to-r from-crediyaGreen to-emerald-500 text-black font-semibold"
                      : "hover:bg-gray-800 text-gray-300 hover:text-white"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm truncate">{item.label}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(item);
                    }}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-400 hover:text-red-300"
                  >
                    ❌
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Items */}
        {!isCollapsed && recentItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              Recientes
            </h3>
            <div className="space-y-1">
              {filteredRecent.slice(0, 3).map((item, index) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                    isActive(item.href)
                      ? "bg-gradient-to-r from-crediyaGreen to-emerald-500 text-black font-semibold"
                      : "hover:bg-gray-800 text-gray-300 hover:text-white"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm truncate">{item.label}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(item);
                    }}
                    className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                      isFavorite(item.href) ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"
                    }`}
                  >
                    {isFavorite(item.href) ? "⭐" : "☆"}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="space-y-2">
          {filteredSections.map((section) => (
            <div key={section.key} className="space-y-1">
              <button
                onClick={() => toggleSection(section.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                  openSections[section.key]
                    ? "bg-gradient-to-r " + section.color + " text-white font-semibold"
                    : "hover:bg-gray-800 text-gray-300 hover:text-white"
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                {!isCollapsed && (
                  <>
                    <span className="font-semibold flex-1 text-left">{section.label}</span>
                    <span className={`transition-transform duration-200 ${openSections[section.key] ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </>
                )}
              </button>
              
              {openSections[section.key] && (
                <div className="ml-4 space-y-1 animate-slideDown">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                        isActive(link.href)
                          ? "bg-gradient-to-r from-crediyaGreen to-emerald-500 text-black font-semibold"
                          : "hover:bg-gray-800 text-gray-300 hover:text-white"
                      }`}
                    >
                      <span className="text-sm">{link.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span className="text-sm flex-1">{link.label}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              toggleFavorite({ ...link, section: section.label, sectionIcon: section.icon });
                            }}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                              isFavorite(link.href) ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"
                            }`}
                          >
                            {isFavorite(link.href) ? "⭐" : "☆"}
                          </button>
                        </>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Keyboard Shortcuts Help */}
      {!isCollapsed && searchTerm && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Atajos de teclado:</p>
          <div className="text-xs text-gray-500 space-y-1">
            <div>⌘ + K: Buscar</div>
            <div>⌘ + D: Dashboard</div>
            <div>⌘ + N: Nuevo préstamo</div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;