import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { API_BASE_URL } from "../utils/constants";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AccountingEntries = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("entries");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const token = localStorage.getItem("token");

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const [entriesRes, accountsRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/accounting/journal-entries`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/accounting/chart-of-accounts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/accounting/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      setEntries(entriesRes.data);
      setAccounts(accountsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error("Error fetching accounting data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // Filter entries based on search and filters
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.source_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Account filter
    if (selectedAccount !== "all") {
      filtered = filtered.filter(entry => entry.account_code === selectedAccount);
    }

    // Source filter
    if (selectedSource !== "all") {
      filtered = filtered.filter(entry => entry.source_type === selectedSource);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    return filtered;
  }, [entries, searchTerm, selectedAccount, selectedSource, dateRange]);

  // Calculate totals
  const totals = useMemo(() => {
    const totals = {
      totalDebits: 0,
      totalCredits: 0,
      netMovement: 0,
      byAccount: {},
      bySource: {},
      byType: {}
    };

    filteredEntries.forEach(entry => {
      const amount = parseFloat(entry.debit || 0) + parseFloat(entry.credit || 0);
      
      totals.totalDebits += parseFloat(entry.debit || 0);
      totals.totalCredits += parseFloat(entry.credit || 0);
      
      // By account
      if (!totals.byAccount[entry.account_name]) {
        totals.byAccount[entry.account_name] = { debits: 0, credits: 0, net: 0 };
      }
      totals.byAccount[entry.account_name].debits += parseFloat(entry.debit || 0);
      totals.byAccount[entry.account_name].credits += parseFloat(entry.credit || 0);
      totals.byAccount[entry.account_name].net += parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
      
      // By source
      if (!totals.bySource[entry.source_type]) {
        totals.bySource[entry.source_type] = 0;
      }
      totals.bySource[entry.source_type] += amount;
      
      // By type
      const type = entry.debit > 0 ? 'debit' : 'credit';
      if (!totals.byType[type]) {
        totals.byType[type] = 0;
      }
      totals.byType[type] += amount;
    });

    totals.netMovement = totals.totalDebits - totals.totalCredits;
    return totals;
  }, [filteredEntries]);

  // Chart data
  const chartData = useMemo(() => {
    if (!analytics) return null;

    return {
      movementTrend: {
        labels: analytics.movementTrend?.map(t => t.date) || [],
        datasets: [{
          label: 'Movimientos Diarios',
          data: analytics.movementTrend?.map(t => t.count) || [],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      accountDistribution: {
        labels: Object.keys(totals.byAccount).slice(0, 10),
        datasets: [{
          data: Object.values(totals.byAccount).map(acc => Math.abs(acc.net)).slice(0, 10),
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'],
          borderWidth: 2
        }]
      },
      sourceDistribution: {
        labels: Object.keys(totals.bySource),
        datasets: [{
          data: Object.values(totals.bySource),
          backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
          borderWidth: 2
        }]
      }
    };
  }, [analytics, totals]);

  const getSourceIcon = (sourceType) => {
    const icons = {
      'loan_creation': '💰',
      'payment': '💳',
      'expense': '📊',
      'inventory': '📦',
      'manual_entry': '✏️',
      'customer_setup': '👤',
      'default': '📋'
    };
    return icons[sourceType] || icons.default;
  };

  const getSourceColor = (sourceType) => {
    const colors = {
      'loan_creation': 'text-blue-400',
      'payment': 'text-green-400',
      'expense': 'text-red-400',
      'inventory': 'text-purple-400',
      'manual_entry': 'text-yellow-400',
      'customer_setup': 'text-cyan-400',
      'default': 'text-gray-400'
    };
    return colors[sourceType] || colors.default;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">📊 Asientos Contables</h1>
              <p className="text-gray-400">Auditoría completa de movimientos contables y su impacto en las cuentas</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab("entries")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === "entries" 
                    ? 'bg-lime-500 text-black' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                📋 Movimientos
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === "analytics" 
                    ? 'bg-lime-500 text-black' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                📈 Análisis
              </button>
              <button
                onClick={() => setActiveTab("accounts")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === "accounts" 
                    ? 'bg-lime-500 text-black' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                🏦 Cuentas
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "entries" && (
            <div className="max-w-7xl mx-auto">
              {/* Filters */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
                <h3 className="text-lg font-bold mb-4 text-white">🔍 Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      🔍 Buscar
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Descripción, cuenta, fuente..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      🏦 Cuenta
                    </label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                    >
                      <option value="all">Todas las Cuentas</option>
                      {accounts.map(account => (
                        <option key={account.code} value={account.code}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      📋 Fuente
                    </label>
                    <select
                      value={selectedSource}
                      onChange={(e) => setSelectedSource(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                    >
                      <option value="all">Todas las Fuentes</option>
                      <option value="loan_creation">Creación de Préstamo</option>
                      <option value="payment">Pago</option>
                      <option value="expense">Gasto</option>
                      <option value="inventory">Inventario</option>
                      <option value="manual_entry">Entrada Manual</option>
                      <option value="customer_setup">Configuración de Cliente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      📅 Rango de Fechas
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">Total Débitos</p>
                      <p className="text-white text-xl font-bold">{formatCurrency(totals.totalDebits)}</p>
                    </div>
                    <div className="text-blue-200 text-2xl">📈</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-200 text-sm">Total Créditos</p>
                      <p className="text-white text-xl font-bold">{formatCurrency(totals.totalCredits)}</p>
                    </div>
                    <div className="text-red-200 text-2xl">📉</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Movimiento Neto</p>
                      <p className="text-white text-xl font-bold">{formatCurrency(totals.netMovement)}</p>
                    </div>
                    <div className="text-green-200 text-2xl">⚖️</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm">Movimientos</p>
                      <p className="text-white text-xl font-bold">{filteredEntries.length}</p>
                    </div>
                    <div className="text-purple-200 text-2xl">📊</div>
                  </div>
                </div>
              </div>

              {/* Entries Table */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-bold mb-4 text-white">📋 Movimientos Contables</h3>
                
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <div className="text-4xl mb-2">📋</div>
                    <p>No hay movimientos contables registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-white font-semibold">Fecha</th>
                          <th className="px-4 py-3 text-left text-white font-semibold">Cuenta</th>
                          <th className="px-4 py-3 text-left text-white font-semibold">Descripción</th>
                          <th className="px-4 py-3 text-right text-white font-semibold">Débito</th>
                          <th className="px-4 py-3 text-right text-white font-semibold">Crédito</th>
                          <th className="px-4 py-3 text-left text-white font-semibold">Fuente</th>
                          <th className="px-4 py-3 text-center text-white font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-700 transition-colors">
                            <td className="px-4 py-3 text-white">
                              {new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-white font-medium">
                              {entry.account_name}
                            </td>
                            <td className="px-4 py-3 text-white">
                              {entry.description}
                            </td>
                            <td className="px-4 py-3 text-right text-green-400">
                              {parseFloat(entry.debit || 0) > 0 ? formatCurrency(entry.debit) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-red-400">
                              {parseFloat(entry.credit || 0) > 0 ? formatCurrency(entry.credit) : '-'}
                            </td>
                            <td className="px-4 py-3 text-white">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(entry.source_type)}`}>
                                {getSourceIcon(entry.source_type)} {entry.source_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedEntry(entry);
                                  setShowDetails(true);
                                }}
                                className="px-3 py-1 bg-lime-500 text-black text-xs font-medium rounded hover:bg-lime-400 transition"
                              >
                                👁️ Ver
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "analytics" && chartData && (
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-lg font-bold mb-4 text-white">📈 Tendencia de Movimientos</h3>
                  <div className="h-64">
                    <Line 
                      data={chartData.movementTrend}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: '#D1D5DB'
                            }
                          }
                        },
                        scales: {
                          x: {
                            ticks: {
                              color: '#D1D5DB'
                            },
                            grid: {
                              color: '#374151'
                            }
                          },
                          y: {
                            ticks: {
                              color: '#D1D5DB'
                            },
                            grid: {
                              color: '#374151'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-lg font-bold mb-4 text-white">🏦 Distribución por Cuenta</h3>
                  <div className="h-64">
                    <Doughnut 
                      data={chartData.accountDistribution}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              color: '#D1D5DB',
                              font: { size: 10 }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-bold mb-4 text-white">📊 Distribución por Fuente</h3>
                <div className="h-64">
                  <Bar 
                    data={chartData.sourceDistribution}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: '#D1D5DB'
                          }
                        }
                      },
                      scales: {
                        x: {
                          ticks: {
                            color: '#D1D5DB'
                          },
                          grid: {
                            color: '#374151'
                          }
                        },
                        y: {
                          ticks: {
                            color: '#D1D5DB'
                          },
                          grid: {
                            color: '#374151'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="max-w-7xl mx-auto">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-bold mb-4 text-white">🏦 Resumen por Cuenta</h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-white font-semibold">Cuenta</th>
                        <th className="px-4 py-3 text-right text-white font-semibold">Total Débitos</th>
                        <th className="px-4 py-3 text-right text-white font-semibold">Total Créditos</th>
                        <th className="px-4 py-3 text-right text-white font-semibold">Saldo Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {Object.entries(totals.byAccount).map(([accountName, data]) => (
                        <tr key={accountName} className="hover:bg-gray-700 transition-colors">
                          <td className="px-4 py-3 text-white font-medium">
                            {accountName}
                          </td>
                          <td className="px-4 py-3 text-right text-green-400">
                            {formatCurrency(data.debits)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-400">
                            {formatCurrency(data.credits)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${
                            data.net > 0 ? 'text-green-400' : data.net < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {formatCurrency(data.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Entry Details Modal */}
        {showDetails && selectedEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">📋 Detalles del Movimiento</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Fecha</label>
                    <p className="text-white">{new Date(selectedEntry.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Cuenta</label>
                    <p className="text-white font-medium">{selectedEntry.account_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Débito</label>
                    <p className="text-green-400">{parseFloat(selectedEntry.debit || 0) > 0 ? formatCurrency(selectedEntry.debit) : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Crédito</label>
                    <p className="text-red-400">{parseFloat(selectedEntry.credit || 0) > 0 ? formatCurrency(selectedEntry.credit) : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Fuente</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(selectedEntry.source_type)}`}>
                      {getSourceIcon(selectedEntry.source_type)} {selectedEntry.source_type}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">ID de Fuente</label>
                    <p className="text-white">{selectedEntry.source_id || 'N/A'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400">Descripción</label>
                  <p className="text-white">{selectedEntry.description}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400">Creado por</label>
                  <p className="text-white">{selectedEntry.created_by || 'Sistema'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AccountingEntries;
