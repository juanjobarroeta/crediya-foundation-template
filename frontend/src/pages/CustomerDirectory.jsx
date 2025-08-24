import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { API_BASE_URL } from "../utils/constants";

const CustomerDirectory = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("cards"); // cards or table
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCustomers(res.data);
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.id?.toString().includes(search) ||
      c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);

    const matchesStatus =
      !statusFilter ||
      c.loans?.some((loan) => loan.status === statusFilter);

    const matchesStore = !storeFilter || c.store === storeFilter;

    return matchesSearch && matchesStatus && matchesStore;
  });

  const getCustomerStatus = (customer) => {
    if (customer.loans?.some(loan => loan.status === "atrasado")) return "overdue";
    if (customer.loans?.some(loan => loan.status === "activo")) return "active";
    return "inactive";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "overdue": return "bg-red-900 text-red-200";
      case "active": return "bg-green-900 text-green-200";
      default: return "bg-gray-700 text-gray-300";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "overdue": return "🔴 Atrasado";
      case "active": return "🟢 Activo";
      default: return "⚪ Inactivo";
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-black border-b border-gray-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-lime-400">👥 Directorio de Clientes</h1>
              <p className="text-gray-400">Gestión completa de la base de clientes</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/create-customer"
                className="bg-lime-500 hover:bg-lime-600 text-black px-4 py-2 rounded-lg font-medium transition-colors"
              >
                ➕ Nuevo Cliente
              </Link>
              <button
                onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                {viewMode === "cards" ? "📋 Vista Tabla" : "🎴 Vista Tarjetas"}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-800 border-b border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              placeholder="🔍 Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">📊 Todos los estados</option>
              <option value="activo">🟢 Con préstamos activos</option>
              <option value="atrasado">🔴 Con préstamos atrasados</option>
              <option value="liquidado">✅ Solo préstamos finalizados</option>
            </select>
            <select
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <option value="">🏪 Todas las sucursales</option>
              <option value="Atlixco">🏢 Atlixco</option>
              <option value="Cholula">🏢 Cholula</option>
              <option value="Chipilo">🏢 Chipilo</option>
            </select>
            <div className="text-gray-400 text-sm flex items-center">
              📈 {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
            </div>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((customer) => {
                const status = getCustomerStatus(customer);
                return (
                  <div
                    key={customer.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-lime-500 transition-colors"
                  >
                    {/* Customer Avatar & Status */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-lime-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
                          {customer.first_name?.[0]}{customer.last_name?.[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{customer.first_name} {customer.last_name}</h3>
                          <p className="text-gray-400 text-sm">ID: {customer.id}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-2 text-sm text-gray-300 mb-4">
                      <p><span className="text-gray-400">📧 Email:</span> {customer.email || "No registrado"}</p>
                      <p><span className="text-gray-400">📱 Teléfono:</span> {customer.phone || "No registrado"}</p>
                      <p><span className="text-gray-400">💰 Préstamos:</span> {customer.loan_count || 0}</p>
                      <p><span className="text-gray-400">💳 Balance:</span> ${parseFloat(customer.total_balance || 0).toFixed(2)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        to={`/customer/${customer.id}`}
                        className="flex-1 bg-lime-600 hover:bg-lime-700 text-center py-2 rounded-lg font-medium transition-colors"
                      >
                        👤 Ver Perfil
                      </Link>
                      <button
                        onClick={() => navigator.clipboard.writeText(customer.id)}
                        className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors"
                        title="Copiar ID"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-lime-400">ID</th>
                      <th className="px-4 py-3 text-left text-lime-400">Cliente</th>
                      <th className="px-4 py-3 text-left text-lime-400">Contacto</th>
                      <th className="px-4 py-3 text-left text-lime-400">Préstamos</th>
                      <th className="px-4 py-3 text-left text-lime-400">Balance</th>
                      <th className="px-4 py-3 text-left text-lime-400">Estado</th>
                      <th className="px-4 py-3 text-left text-lime-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((customer) => {
                      const status = getCustomerStatus(customer);
                      return (
                        <tr
                          key={customer.id}
                          className="border-t border-gray-700 hover:bg-gray-700 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-sm">{customer.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-lime-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                                {customer.first_name?.[0]}{customer.last_name?.[0]}
                              </div>
                              <div>
                                <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div>{customer.email || "No registrado"}</div>
                            <div className="text-gray-400">{customer.phone || "No registrado"}</div>
                          </td>
                          <td className="px-4 py-3 text-center">{customer.loan_count || 0}</td>
                          <td className="px-4 py-3 font-mono">${parseFloat(customer.total_balance || 0).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                              {getStatusLabel(status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Link
                                to={`/customer/${customer.id}`}
                                className="text-lime-400 hover:text-lime-300 text-sm font-medium"
                              >
                                Ver Perfil
                              </Link>
                              <button
                                onClick={() => navigator.clipboard.writeText(customer.id)}
                                className="text-gray-400 hover:text-gray-300 text-sm"
                                title="Copiar ID"
                              >
                                📋
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">No se encontraron clientes</h3>
              <p className="text-gray-400 mb-6">Intenta ajustar los filtros de búsqueda</p>
              <Link
                to="/create-customer"
                className="bg-lime-500 hover:bg-lime-600 text-black px-6 py-3 rounded-lg font-medium transition-colors"
              >
                ➕ Crear Primer Cliente
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CustomerDirectory;