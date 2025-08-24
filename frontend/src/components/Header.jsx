import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, type: "payment", message: "Pago registrado exitosamente", time: "2 min ago", read: false },
    { id: 2, type: "overdue", message: "3 préstamos vencidos", time: "1 hora ago", read: false },
    { id: 3, type: "approval", message: "Nueva solicitud de préstamo", time: "3 horas ago", read: true },
  ]);
  const searchRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "k":
            e.preventDefault();
            setShowSearch(true);
            setTimeout(() => searchRef.current?.focus(), 100);
            break;
          case "d":
            e.preventDefault();
            navigate("/dashboard");
            break;
          case "n":
            e.preventDefault();
            navigate("/create-loan");
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown") && !event.target.closest("[data-dropdown-content]")) {
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowSearch(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const breadcrumbs = [];
    
    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      
      breadcrumbs.push({
        path: currentPath,
        label: label,
        isLast: index === pathSegments.length - 1
      });
    });

    return breadcrumbs;
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "payment": return "💰";
      case "overdue": return "⚠️";
      case "approval": return "✅";
      default: return "📢";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "payment": return "text-green-400";
      case "overdue": return "text-red-400";
      case "approval": return "text-blue-400";
      default: return "text-gray-400";
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="w-full bg-gradient-to-r from-gray-900 to-black text-white px-6 py-4 rounded-tl-3xl rounded-tr-3xl shadow-lg border-b border-gray-800 relative z-50">
      <div className="flex items-center justify-between">
        {/* Left Section - Breadcrumbs & Search */}
        <div className="flex items-center gap-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm">
            <Link to="/dashboard" className="text-gray-400 hover:text-crediyaGreen transition-colors">
              Dashboard
            </Link>
            {getBreadcrumbs().map((breadcrumb, index) => (
              <div key={breadcrumb.path} className="flex items-center space-x-2">
                <span className="text-gray-600">/</span>
                {breadcrumb.isLast ? (
                  <span className="text-crediyaGreen font-semibold">{breadcrumb.label}</span>
                ) : (
                  <Link 
                    to={breadcrumb.path} 
                    className="text-gray-400 hover:text-crediyaGreen transition-colors"
                  >
                    {breadcrumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Global Search */}
          <div className="relative">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <span>🔍</span>
              <span className="text-sm text-gray-300">Buscar</span>
              <span className="text-xs text-gray-500">⌘K</span>
            </button>
            
            {showSearch && createPortal(
              <div 
                className="fixed top-16 left-6 mt-2 w-96 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[999999]"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => e.stopPropagation()}
                data-dropdown-content="search"
              >
                <div className="p-4">
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Buscar préstamos, clientes, pagos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-crediyaGreen focus:outline-none"
                    autoFocus
                  />
                  {searchTerm && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wider">Resultados rápidos</div>
                      <div className="space-y-1">
                        <Link 
                          to="/create-loan" 
                          onClick={() => setShowSearch(false)}
                          className="block w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-sm"
                        >
                          💳 Crear nuevo préstamo
                        </Link>
                        <Link 
                          to="/create-customer" 
                          onClick={() => setShowSearch(false)}
                          className="block w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-sm"
                        >
                          👤 Crear nuevo cliente
                        </Link>
                        <Link 
                          to="/register-payment" 
                          onClick={() => setShowSearch(false)}
                          className="block w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-sm"
                        >
                          💰 Registrar pago
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>

        {/* Right Section - Actions & User */}
        <div className="flex items-center gap-4 relative z-50">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                console.log("Navigating to /create-loan");
                navigate("/create-loan");
              }}
              className="bg-gradient-to-r from-crediyaGreen to-emerald-500 hover:from-emerald-500 hover:to-crediyaGreen text-black font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
            >
              💳 Nuevo Préstamo
            </button>
            <button
              onClick={() => {
                console.log("Navigating to /register-payment");
                navigate("/register-payment");
              }}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
            >
              💰 Registrar Pago
            </button>
            <button
              onClick={() => {
                console.log("Navigating to /loan-quotes");
                navigate("/loan-quotes");
              }}
              className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-violet-500 hover:to-purple-500 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
            >
              📊 Cotizar
            </button>
          </div>

          {/* Notifications */}
          <div className="relative dropdown">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-300 hover:text-white transition-colors duration-200"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && createPortal(
              <div 
                className="fixed top-16 right-6 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[999999]"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => e.stopPropagation()}
                data-dropdown-content="notifications"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Notificaciones</h3>
                    <button 
                      onClick={() => {
                        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
                      }}
                      className="text-sm text-crediyaGreen hover:text-emerald-400"
                    >
                      Marcar todo como leído
                    </button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => {
                          markNotificationAsRead(notification.id);
                          // Navigate based on notification type
                          if (notification.type === "payment") {
                            navigate("/register-payment");
                          } else if (notification.type === "overdue") {
                            navigate("/admin/overdue-loans");
                          } else if (notification.type === "approval") {
                            navigate("/admin/loans");
                          }
                          setShowNotifications(false);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                          notification.read ? "bg-gray-700" : "bg-blue-900/20"
                        } hover:bg-gray-700`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1">
                            <p className={`text-sm ${getNotificationColor(notification.type)}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <Link 
                      to="/notifications" 
                      onClick={() => setShowNotifications(false)}
                      className="text-sm text-crediyaGreen hover:text-emerald-400"
                    >
                      Ver todas las notificaciones
                    </Link>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* User Menu */}
          <div className="relative dropdown">
            <button
              onClick={() => {
                console.log("User menu clicked, current state:", showUserMenu);
                setShowUserMenu(!showUserMenu);
              }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-crediyaGreen to-emerald-500 rounded-full flex items-center justify-center text-black font-semibold">
                J
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Juan José</div>
                <div className="text-xs text-gray-400">Administrador</div>
              </div>
              <span className="text-gray-400">▼</span>
            </button>

            {showUserMenu && createPortal(
              <div 
                className="fixed top-16 right-6 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[999999]"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => e.stopPropagation()}
                data-dropdown-content="user-menu"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-700">
                    <div className="w-12 h-12 bg-gradient-to-r from-crediyaGreen to-emerald-500 rounded-full flex items-center justify-center text-black font-semibold text-lg">
                      J
                    </div>
                    <div>
                      <div className="font-semibold">Juan José Barroeta</div>
                      <div className="text-sm text-gray-400">juan@crediya.com</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={() => {
                        navigate("/customer-profile");
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-sm"
                    >
                      👤 Mi Perfil
                    </button>
                    <button 
                      onClick={() => {
                        navigate("/admin/settings");
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-sm"
                    >
                      ⚙️ Configuración
                    </button>
                    <button 
                      onClick={() => {
                        // Toggle dark mode logic here
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-sm"
                    >
                      🌙 Modo Oscuro
                    </button>
                    <div className="border-t border-gray-700 my-2"></div>
                    <button
                      onClick={() => {
                        console.log("Logging out...");
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        navigate("/auth");
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-red-900 text-red-400 text-sm"
                    >
                      🚪 Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;