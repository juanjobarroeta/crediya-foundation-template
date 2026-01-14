import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ModernLayout from "../components/ModernLayout";
import { API_BASE_URL } from "../utils/constants";

const PurificadoraDashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    ordersToday: 0,
    ordersPending: 0,
    ordersCompleted: 0,
    revenueToday: 0,
    revenueMonth: 0,
    tanksAvailable: 0,
    tanksInUse: 0,
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
      
      // Fetch customers
      const customersRes = await axios.get(`${API_BASE_URL}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // For now, set basic stats
      setStats({
        totalCustomers: customersRes.data.length,
        ordersToday: 0,
        ordersPending: 0,
        ordersCompleted: 0,
        revenueToday: 0,
        revenueMonth: 0,
        tanksAvailable: 0,
        tanksInUse: 0,
      });
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setLoading(false);
    }
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            💧 Dashboard - Purificadora Cuenca Azul
          </h1>
          <p className="text-gray-600 mt-2">
            Agua pura para beber • Confiable • Rápido • Siempre puro
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <p className="text-3xl font-bold text-gray-900">{stats.ordersPending}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </div>

          {/* Completed Orders */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completados Hoy</p>
                <p className="text-3xl font-bold text-gray-900">{stats.ordersCompleted}</p>
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
                <p className="text-sm text-gray-600 mb-1">Ingresos del Mes</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${stats.revenueMonth.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/orders/create"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <span className="text-4xl">🚚</span>
              <div>
                <h3 className="text-lg font-semibold">Nuevo Pedido</h3>
                <p className="text-cyan-100 text-sm">Crear pedido de agua</p>
              </div>
            </div>
          </Link>

          <Link
            to="/customers"
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <span className="text-4xl">👤</span>
              <div>
                <h3 className="text-lg font-semibold">Ver Clientes</h3>
                <p className="text-purple-100 text-sm">Gestionar clientes</p>
              </div>
            </div>
          </Link>

          <Link
            to="/inventory"
            className="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <span className="text-4xl">🫙</span>
              <div>
                <h3 className="text-lg font-semibold">Inventario</h3>
                <p className="text-green-100 text-sm">Garrafones y agua</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Coming Soon */}
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🚀 Dashboard en Construcción
          </h2>
          <p className="text-gray-600">
            Pronto tendrás gráficas de ventas, entregas y más estadísticas.
          </p>
        </div>
      </div>
    </ModernLayout>
  );
};

export default PurificadoraDashboard;

