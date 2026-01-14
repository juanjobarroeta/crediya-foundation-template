import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ModernLayout from "../components/ModernLayout";
import { API_BASE_URL } from "../utils/constants";

const PurificadoraDashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    inTransitOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    pendingPayment: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all data in parallel
      const [customersRes, orderStatsRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/customers`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/orders/stats`, { headers }).catch(() => ({ data: {} })),
        axios.get(`${API_BASE_URL}/orders`, { headers }).catch(() => ({ data: [] })),
      ]);
      
      const orderStats = orderStatsRes.data || {};
      
      setStats({
        totalCustomers: customersRes.data?.length || 0,
        totalOrders: parseInt(orderStats.total_orders) || 0,
        pendingOrders: parseInt(orderStats.pending_orders) || 0,
        preparingOrders: parseInt(orderStats.preparing_orders) || 0,
        inTransitOrders: parseInt(orderStats.in_transit_orders) || 0,
        deliveredOrders: parseInt(orderStats.delivered_orders) || 0,
        totalRevenue: parseFloat(orderStats.total_revenue) || 0,
        pendingPayment: parseFloat(orderStats.pending_payment) || 0,
      });
      
      // Get last 5 orders for recent activity
      const orders = ordersRes.data || [];
      setRecentOrders(orders.slice(0, 5));
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      preparing: "bg-blue-100 text-blue-800",
      in_transit: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pendiente",
      preparing: "Preparando",
      in_transit: "En Tránsito",
      delivered: "Entregado",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando dashboard...</p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            💧 Dashboard - Purificadora Cuenca Azul
          </h1>
          <p className="text-gray-600 mt-2">
            Resumen de operaciones • {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Customers */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pedidos Pendientes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.preparingOrders} preparando • {stats.inTransitOrders} en ruta
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </div>

          {/* Delivered Orders */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Entregados</p>
                <p className="text-3xl font-bold text-gray-900">{stats.deliveredOrders}</p>
                <p className="text-xs text-gray-500 mt-1">de {stats.totalOrders} pedidos totales</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ingresos Cobrados</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${stats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ${stats.pendingPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} por cobrar
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/orders/create"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <span className="text-3xl">🚚</span>
              <div>
                <h3 className="text-lg font-semibold">Nuevo Pedido</h3>
                <p className="text-cyan-100 text-sm">Crear pedido de agua</p>
              </div>
            </div>
          </Link>

          <Link
            to="/orders"
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <span className="text-3xl">📋</span>
              <div>
                <h3 className="text-lg font-semibold">Ver Pedidos</h3>
                <p className="text-amber-100 text-sm">Gestión de pedidos</p>
              </div>
            </div>
          </Link>

          <Link
            to="/crm"
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <span className="text-3xl">👤</span>
              <div>
                <h3 className="text-lg font-semibold">Clientes</h3>
                <p className="text-purple-100 text-sm">Directorio</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/inventory"
            className="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <span className="text-3xl">🫙</span>
              <div>
                <h3 className="text-lg font-semibold">Inventario</h3>
                <p className="text-green-100 text-sm">Garrafones y agua</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">📦 Pedidos Recientes</h2>
            <Link to="/orders" className="text-cyan-600 hover:text-cyan-700 text-sm font-medium">
              Ver todos →
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <span className="text-4xl">📭</span>
              <p className="mt-2">No hay pedidos recientes</p>
              <Link to="/orders/create" className="text-cyan-600 hover:underline mt-2 inline-block">
                Crear primer pedido →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">💧</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.customer_name || `Pedido #${order.id}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.total_tanks || 0} garrafones • {new Date(order.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${parseFloat(order.total_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModernLayout>
  );
};

export default PurificadoraDashboard;
