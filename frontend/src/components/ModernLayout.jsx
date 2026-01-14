import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const ModernLayout = ({ children }) => {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Get user info from localStorage
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userName = user?.name || "Usuario";
  const userEmail = user?.email || "";
  const userRole = user?.role === "admin" ? "Administrador" : "Usuario";

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: '🏠',
      submenu: []
    },
    { 
      name: 'Clientes', 
      href: '/crm', 
      icon: '👥',
      submenu: [
        { name: 'Crear Cliente', href: '/create-customer', icon: '👤' },
        { name: 'Directorio', href: '/crm', icon: '📋' },
      ]
    },
    { 
      name: 'Pedidos', 
      href: '/orders', 
      icon: '💧',
      submenu: [
        { name: 'Crear Pedido', href: '/orders/create', icon: '➕' },
        { name: 'Gestión de Pedidos', href: '/orders', icon: '📦' },
        { name: 'Control de Garrafones', href: '/tank-returns', icon: '♻️' },
      ]
    },
    { 
      name: 'Gastos', 
      href: '/admin/expenses', 
      icon: '💸',
      submenu: [
        { name: 'Gastos', href: '/admin/expenses', icon: '💸' },
        { name: 'Presupuestos', href: '/admin/budgets', icon: '💰' },
      ]
    },
    { 
      name: 'Inventario', 
      href: '/admin/inventory', 
      icon: '📦',
      submenu: [
        { name: 'Gestión de Inventario', href: '/admin/inventory', icon: '📋' },
        { name: 'Solicitar Inventario', href: '/admin/inventory-request', icon: '📦' },
        { name: 'Estación de Llenado', href: '/filling-station', icon: '🏭' },
        { name: 'Imprimir Etiquetas QR', href: '/print-qr-labels', icon: '🏷️' },
        { name: 'Escanear QR', href: '/qr-scanner', icon: '📱' },
      ]
    },
    { 
      name: 'Contabilidad', 
      href: '/accounting-hub', 
      icon: '🧾',
      submenu: [
        { name: 'Centro de Contabilidad', href: '/accounting-hub', icon: '🏦' },
        { name: 'Cuentas por Cobrar', href: '/accounts-receivable', icon: '💰' },
        { name: 'Estado de Resultados', href: '/income-statement', icon: '📈' },
        { name: 'Balance General', href: '/balance-sheet', icon: '⚖️' },
        { name: 'Ganancias', href: '/admin/profit', icon: '💎' },
        { name: 'Tesorería', href: '/admin/tesoreria', icon: '🏦' },
        { name: 'Asientos Contables', href: '/accounting', icon: '📝' },
      ]
    },
    { 
      name: 'Administración', 
      href: '/admin/create-user', 
      icon: '⚙️',
      submenu: [
        { name: 'Crear Usuario', href: '/admin/create-user', icon: '👨‍💼' },
      ]
    },
  ];

  const isActive = (href) => location.pathname === href;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-aqua-50 to-blue-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-lg border-b border-aqua-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-aqua-500 to-aqua-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">💧</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-aqua-700">PURIFICADORA</h1>
                <p className="text-xs text-aqua-600">CUENCA AZUL</p>
              </div>
            </div>

            {/* Navigation Links with Dropdowns */}
            <div className="hidden md:flex items-center space-x-2">
              {navigation.map((item) => (
                <div key={item.name} className="relative dropdown-container">
                  {item.submenu.length > 0 ? (
                    <div
                      className="relative"
                      onMouseEnter={() => setActiveDropdown(item.name)}
                      onMouseLeave={() => setActiveDropdown(null)}
                    >
                      <button
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive(item.href)
                            ? 'bg-aqua-100 text-aqua-700'
                            : 'text-gray-600 hover:text-aqua-600 hover:bg-aqua-50'
                        }`}
                      >
                        <span>{item.icon}</span>
                        {item.name}
                        <span className="text-xs">▼</span>
                      </button>
                      
                      {/* Dropdown Menu */}
                      {activeDropdown === item.name && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-2">
                          {item.submenu.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-aqua-50 hover:text-aqua-700 transition-colors"
                              onClick={() => setActiveDropdown(null)}
                            >
                              <span className="text-lg">{subItem.icon}</span>
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-aqua-100 text-aqua-700'
                          : 'text-gray-600 hover:text-aqua-600 hover:bg-aqua-50'
                      }`}
                    >
                      <span>{item.icon}</span>
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* User Menu */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-aqua-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-aqua-500 to-aqua-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">💧</span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-semibold text-gray-800">{userName}</div>
                  <div className="text-xs text-gray-600">{userRole}</div>
                </div>
                <span className="text-gray-400">▼</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                      <div className="w-12 h-12 bg-gradient-to-r from-aqua-500 to-aqua-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">💧</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{userName}</div>
                        <div className="text-sm text-gray-600">{userEmail}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <button 
                        onClick={() => {
                          window.location.href = "/dashboard/classic";
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        🔄 Vista Clásica
                      </button>
                      <button 
                        onClick={() => {
                          localStorage.clear();
                          window.location.replace("/auth");
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-sm"
                      >
                        🚪 Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          {navigation.slice(0, 5).map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg ${
                isActive(item.href) ? 'text-aqua-600' : 'text-gray-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModernLayout;
