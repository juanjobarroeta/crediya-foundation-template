import { API_BASE_URL } from "../utils/constants";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

const FinancialProducts = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    title: "",
    interest_rate: "",
    term_weeks: "",
    payment_frequency: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = localStorage.getItem("token");

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/financial-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching financial products:", err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    
    try {
      // Validate required fields
      if (!form.title || !form.interest_rate || !form.term_weeks || !form.payment_frequency) {
        alert("Por favor complete todos los campos requeridos");
        setLoading(false);
        return;
      }

      const payload = {
        ...form,
        interest_rate: parseFloat(form.interest_rate),
        penalty_fee: parseFloat(form.penalty_fee) || 0,
        down_payment: parseFloat(form.down_payment) || 0,
        term_weeks: parseInt(form.term_weeks),
      };

      const response = await axios.post(`${API_BASE_URL}/financial-products`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Financial product created:", response.data);
      setSuccess(true);

      fetchProducts();
      setForm({
        title: "",
        interest_rate: "",
        term_weeks: "",
        payment_frequency: "",
        notes: "",
      });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error creating financial product:", err);
      alert("Error al crear el producto financiero: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Productos Financieros</h1>
            <p className="text-slate-400">Crea y gestiona plantillas de productos financieros</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Producto financiero creado exitosamente
              </div>
            </div>
          )}

          {/* Create Product Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-lime-500/20 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Crear Nuevo Producto</h2>
                <p className="text-slate-400">Define los términos y condiciones del producto financiero</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Nombre del Producto *</label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Ej: Préstamo Express"
                    required
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Interest Rate */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Tasa de Interés (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="interest_rate"
                    value={form.interest_rate}
                    onChange={handleChange}
                    placeholder="Ej: 120.5"
                    required
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Term Weeks */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Plazo (semanas) *</label>
                  <input
                    type="number"
                    name="term_weeks"
                    value={form.term_weeks}
                    onChange={handleChange}
                    placeholder="Ej: 12"
                    required
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Payment Frequency */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Frecuencia de Pago *</label>
                  <select
                    name="payment_frequency"
                    value={form.payment_frequency}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all"
                  >
                    <option value="">Seleccionar frecuencia</option>
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Notas</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Detalles adicionales del producto..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-black font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creando...
                    </div>
                  ) : (
                    "Crear Producto Financiero"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Products List */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Productos Existentes</h2>
                <p className="text-slate-400">Plantillas disponibles para crear préstamos</p>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-lg">No hay productos financieros creados</p>
                <p className="text-slate-500 text-sm mt-2">Crea tu primer producto usando el formulario anterior</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-4 px-4 text-slate-300 font-semibold">Nombre</th>
                      <th className="text-left py-4 px-4 text-slate-300 font-semibold">Interés</th>
                      <th className="text-left py-4 px-4 text-slate-300 font-semibold">Plazo</th>
                      <th className="text-left py-4 px-4 text-slate-300 font-semibold">Frecuencia</th>
                      <th className="text-left py-4 px-4 text-slate-300 font-semibold">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={product.id} className="border-b border-slate-700/50 hover:bg-slate-700/25 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{product.title}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-lime-500/20 text-lime-400 px-3 py-1 rounded-full text-sm font-medium">
                            {product.interest_rate}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-300">{product.term_weeks} semanas</td>
                        <td className="py-4 px-4">
                          <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm capitalize">
                            {product.payment_frequency}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-400 max-w-xs truncate">
                          {product.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FinancialProducts;
