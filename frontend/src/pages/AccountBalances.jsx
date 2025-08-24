import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { API_BASE_URL } from "../utils/constants";

const AccountBalances = () => {
  const [from, setFrom] = useState("2000-01-01");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");

  const fetchBalances = async () => {
    if (!from || !to) return;

    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/admin/account-balances`, {
        params: { from_date: from, to_date: to },
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(res.data || []);
    } catch (err) {
      console.error("Error fetching balances:", err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [from, to]);

  // Filter accounts based on search
  const filteredAccounts = accounts.filter(account => 
    (account.account || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (account.account_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">📊 Movimientos por Cuenta</h1>
              <p className="text-gray-400">Consulta los balances y movimientos de todas las cuentas contables</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">📅 Desde</label>
                <input 
                  type="date" 
                  value={from} 
                  onChange={e => setFrom(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">📅 Hasta</label>
                <input 
                  type="date" 
                  value={to} 
                  onChange={e => setTo(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">🔍 Buscar Cuenta</label>
                <input 
                  type="text" 
                  placeholder="Buscar por código o nombre..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchBalances}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {loading ? "🔄 Cargando..." : "📊 Actualizar"}
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {filteredAccounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-900 rounded-lg p-4">
                <h3 className="text-green-300 text-sm font-medium">💰 Total Cargos</h3>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(filteredAccounts.reduce((sum, acc) => sum + parseFloat(acc.total_debits || 0), 0))}
                </p>
              </div>
              <div className="bg-red-900 rounded-lg p-4">
                <h3 className="text-red-300 text-sm font-medium">💳 Total Abonos</h3>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(filteredAccounts.reduce((sum, acc) => sum + parseFloat(acc.total_credits || 0), 0))}
                </p>
              </div>
              <div className="bg-blue-900 rounded-lg p-4">
                <h3 className="text-blue-300 text-sm font-medium">📈 Balance Neto</h3>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(filteredAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0))}
                </p>
              </div>
            </div>
          )}

          {/* Accounts Table */}
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                📋 Cuentas Contables ({filteredAccounts.length})
              </h2>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">⏳</div>
                <p className="text-gray-400">Cargando movimientos...</p>
              </div>
            ) : filteredAccounts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        📊 Cuenta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        📝 Descripción
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        💰 Cargos
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        💳 Abonos
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        📈 Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 divide-y divide-gray-800">
                    {filteredAccounts.map((account, idx) => (
                      <tr key={idx} className="hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{account.account}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{account.account_name || 'Sin descripción'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-green-400">
                            {formatCurrency(account.total_debits)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-red-400">
                            {formatCurrency(account.total_credits)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className={`text-sm font-medium ${
                            parseFloat(account.balance) > 0 ? 'text-green-400' : 
                            parseFloat(account.balance) < 0 ? 'text-red-400' : 'text-gray-300'
                          }`}>
                            {formatCurrency(account.balance)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">📭</div>
                <p className="text-gray-400">No se encontraron movimientos en el período seleccionado</p>
                <p className="text-sm text-gray-500 mt-2">
                  Intenta ajustar las fechas o realizar algunas transacciones primero
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AccountBalances;