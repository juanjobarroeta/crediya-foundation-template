import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { API_BASE_URL } from "../utils/constants";

const Tesoreria = () => {
  const [inventoryOrders, setInventoryOrders] = useState([]);
  const [expenseOrders, setExpenseOrders] = useState([]);
  const [proofFiles, setProofFiles] = useState({});
  const [paymentMethods, setPaymentMethods] = useState({});
  const [paidInventoryOrders, setPaidInventoryOrders] = useState([]);
  const [paidExpenseOrders, setPaidExpenseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/treasury/payment-orders`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });
      setInventoryOrders(res.data.inventory || []);
      setExpenseOrders(res.data.expenses || []);

      const historyRes = await axios.get(`${API_BASE_URL}/treasury/payment-orders/history`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });
      setPaidInventoryOrders(historyRes.data.inventory || []);
      setPaidExpenseOrders(historyRes.data.expenses || []);
    } catch (err) {
      console.error("Error fetching payment orders:", err);
    }
  };

  const handlePaymentConfirmation = async (type, id) => {
    const file = proofFiles[id];
    if (!file) {
      alert("Por favor sube un comprobante antes de confirmar.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("id", id);
    formData.append("type", type);
    formData.append("method", paymentMethods[id] || "efectivo");

    try {
      await axios.post(`${API_BASE_URL}/treasury/confirm-payment`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });

      setSuccessMessage("¡Pago confirmado exitosamente!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Clear the file and method for this item
      setProofFiles(prev => ({ ...prev, [id]: null }));
      setPaymentMethods(prev => ({ ...prev, [id]: "efectivo" }));
      
      // Refresh the data
      fetchOrders();
    } catch (err) {
      console.error("Error confirming payment:", err);
      alert("Error al confirmar el pago: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter expenses by due date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expensesDueToday = expenseOrders.filter(
    e => e.status === "approved" && new Date(e.due_date) <= today
  );
  const expensesNotYetDue = expenseOrders.filter(
    e => e.status === "approved" && new Date(e.due_date) > today
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Tesorería</h1>
            <p className="text-slate-400">Gestión de órdenes de pago y comprobantes</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {successMessage}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-xl backdrop-blur-sm">
              <button
                onClick={() => setActiveTab("pending")}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === "pending"
                    ? "bg-lime-500 text-black"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                Pagos Pendientes
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === "history"
                    ? "bg-lime-500 text-black"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                Historial de Pagos
              </button>
            </div>
          </div>

          {activeTab === "pending" && (
            <div className="space-y-8">
              {/* Inventory Orders */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-lime-500/20 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Pagos de Inventario</h2>
                    <p className="text-slate-400">Solicitudes aprobadas pendientes de pago</p>
                  </div>
                </div>

                {inventoryOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-slate-400 text-lg">No hay pagos de inventario pendientes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inventoryOrders.map((order) => (
                      <div key={order.id} className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-400">Solicitud #{order.id}</span>
                              <span className="bg-lime-500/20 text-lime-400 px-3 py-1 rounded-full text-sm font-medium">
                                {order.category}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-semibold text-xl">${Number(order.amount).toLocaleString()}</p>
                              <p className="text-slate-300">{order.notes}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-400">Proveedor:</span>
                                <p className="text-white">{order.supplier || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">Prioridad:</span>
                                <p className="text-white capitalize">{order.priority}</p>
                              </div>
                            </div>
                            {order.quote_path && (
                              <a
                                href={`${API_BASE_URL}/uploads/${order.quote_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-lime-400 hover:text-lime-300 text-sm"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Ver Cotización
                              </a>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-slate-300 block mb-2">Comprobante de Pago</label>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white file:bg-lime-500 file:text-black file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4"
                                onChange={(e) => setProofFiles({ ...proofFiles, [order.id]: e.target.files[0] })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-300 block mb-2">Método de Pago</label>
                              <select
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                                value={paymentMethods[order.id] || 'efectivo'}
                                onChange={(e) => setPaymentMethods({ ...paymentMethods, [order.id]: e.target.value })}
                              >
                                <option value="efectivo">💵 Efectivo</option>
                                <option value="transferencia">🏦 Transferencia</option>
                                <option value="tarjeta">💳 Tarjeta</option>
                                <option value="cheque">📝 Cheque</option>
                              </select>
                            </div>
                            <button
                              onClick={() => handlePaymentConfirmation("inventory", order.id)}
                              disabled={loading}
                              className="w-full bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-black font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {loading ? "Procesando..." : "Marcar como Pagado"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Urgent Expenses */}
              {expensesDueToday.length > 0 && (
                <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-red-400">Gastos Urgentes</h2>
                      <p className="text-red-300">Vencen hoy o están vencidos - Requieren pago inmediato</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {expensesDueToday.map((expense) => (
                      <div key={expense.id} className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-red-300">Gasto #{expense.id}</span>
                              <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                                Urgente
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-semibold text-xl">${Number(expense.amount).toLocaleString()}</p>
                              <p className="text-red-200">{expense.description}</p>
                            </div>
                            <div>
                              <span className="text-red-300">Vence:</span>
                              <p className="text-white">{new Date(expense.due_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-red-300 block mb-2">Comprobante de Pago</label>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="w-full px-4 py-3 bg-red-900/20 border border-red-500/50 rounded-xl text-white file:bg-red-500 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4"
                                onChange={(e) => setProofFiles({ ...proofFiles, [expense.id]: e.target.files[0] })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-red-300 block mb-2">Método de Pago</label>
                              <select
                                className="w-full px-4 py-3 bg-red-900/20 border border-red-500/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={paymentMethods[expense.id] || 'efectivo'}
                                onChange={(e) => setPaymentMethods({ ...paymentMethods, [expense.id]: e.target.value })}
                              >
                                <option value="efectivo">💵 Efectivo</option>
                                <option value="transferencia">🏦 Transferencia</option>
                                <option value="tarjeta">💳 Tarjeta</option>
                                <option value="cheque">📝 Cheque</option>
                              </select>
                            </div>
                            <button
                              onClick={() => handlePaymentConfirmation("expense", expense.id)}
                              disabled={loading}
                              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {loading ? "Procesando..." : "Pagar Urgente"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Future Expenses */}
              {expensesNotYetDue.length > 0 && (
                <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-yellow-400">Gastos Programados</h2>
                      <p className="text-yellow-300">Pagos futuros programados</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expensesNotYetDue.map((expense) => (
                      <div key={expense.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-yellow-300">#{expense.id}</span>
                            <span className="text-yellow-300 text-sm">
                              {new Date(expense.due_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-semibold">${Number(expense.amount).toLocaleString()}</p>
                            <p className="text-yellow-200 text-sm">{expense.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Historial de Pagos</h2>
                  <p className="text-slate-400">Registro de pagos completados</p>
                </div>
              </div>

              {(paidInventoryOrders.length === 0 && paidExpenseOrders.length === 0) ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-lg">No hay historial de pagos disponible</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-4 px-4 text-slate-300 font-semibold">Tipo</th>
                        <th className="text-left py-4 px-4 text-slate-300 font-semibold">ID</th>
                        <th className="text-left py-4 px-4 text-slate-300 font-semibold">Descripción</th>
                        <th className="text-left py-4 px-4 text-slate-300 font-semibold">Monto</th>
                        <th className="text-left py-4 px-4 text-slate-300 font-semibold">Método</th>
                        <th className="text-left py-4 px-4 text-slate-300 font-semibold">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...paidInventoryOrders, ...paidExpenseOrders].map((record, index) => (
                        <tr key={`${record.type || 'expense'}-${record.id}-${index}`} className="border-b border-slate-700/50 hover:bg-slate-700/25 transition-colors">
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              record.type === 'inventory' 
                                ? 'bg-lime-500/20 text-lime-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {record.type === 'inventory' ? 'Inventario' : 'Gasto'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-white">#{record.id}</td>
                          <td className="py-4 px-4 text-slate-300">
                            {record.description || record.category || record.notes || 'N/A'}
                          </td>
                          <td className="py-4 px-4 text-white font-medium">
                            ${Number(record.amount || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm capitalize">
                              {record.method || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-400">
                            {new Date(record.updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Tesoreria;