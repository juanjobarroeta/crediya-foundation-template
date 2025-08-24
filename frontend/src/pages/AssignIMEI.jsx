import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { API_BASE_URL } from "../utils/constants";
import { useNavigate, useSearchParams } from "react-router-dom";

const AssignIMEI = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState({});
  const [validationResults, setValidationResults] = useState({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const specificItemId = searchParams.get('item_id');

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/inventory-items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      let filtered = res.data.filter(item => !item.imei);
      
      // If specific item ID is provided, filter to just that item
      if (specificItemId) {
        filtered = filtered.filter(item => item.id.toString() === specificItemId);
      }
      
      setItems(filtered);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateIMEI = (imei) => {
    // Basic IMEI validation (15 digits)
    const imeiRegex = /^\d{15}$/;
    if (!imeiRegex.test(imei)) {
      return { valid: false, message: "IMEI debe tener exactamente 15 dígitos" };
    }
    
    // Luhn algorithm validation for IMEI
    const digits = imei.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 14; i++) {
      let digit = digits[i];
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    const isValid = checkDigit === digits[14];
    
    return {
      valid: isValid,
      message: isValid ? "IMEI válido" : "IMEI inválido (falla verificación Luhn)"
    };
  };

  const handleChange = async (id, value) => {
    setEditing(prev => ({ ...prev, [id]: value }));
    
    if (value.length === 15) {
      setValidating(prev => ({ ...prev, [id]: true }));
      
      // Validate IMEI
      const validation = validateIMEI(value);
      setValidationResults(prev => ({ ...prev, [id]: validation }));
      
      // Check if IMEI already exists
      try {
        const res = await axios.get(`${API_BASE_URL}/inventory-items/check-imei/${value}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.exists) {
          setValidationResults(prev => ({ 
            ...prev, 
            [id]: { valid: false, message: "Este IMEI ya está asignado a otro producto" }
          }));
        }
      } catch (err) {
        console.error("Error checking IMEI:", err);
      }
      
      setValidating(prev => ({ ...prev, [id]: false }));
    } else {
      setValidationResults(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleSave = async (id) => {
    const imei = editing[id];
    if (!imei) return;
    
    const validation = validationResults[id];
    if (!validation || !validation.valid) {
      alert("Por favor ingresa un IMEI válido");
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/inventory-items/${id}/imei`, { imei }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setItems(prev => prev.filter(item => item.id !== id));
      
      // Show success message
      alert("✅ IMEI asignado correctamente");
      
      // If we came from a specific item, go back to inventory
      if (specificItemId) {
        navigate('/admin/inventory');
      }
    } catch (err) {
      console.error("Error updating IMEI:", err);
      alert("❌ Error al guardar IMEI");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando equipos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-black border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/inventory')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Volver al Inventario
              </button>
              <div>
                <h1 className="text-2xl font-bold text-lime-400">📱 Asignar IMEI</h1>
                <p className="text-gray-400">
                  {specificItemId ? "Asignar IMEI a producto específico" : "Gestión de IMEI para equipos sin asignar"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">No hay equipos pendientes</h3>
              <p className="text-gray-400 mb-6">
                {specificItemId 
                  ? "El producto seleccionado ya tiene IMEI asignado o no se encontró"
                  : "Todos los equipos ya tienen IMEI asignado"
                }
              </p>
              <button
                onClick={() => navigate('/admin/inventory')}
                className="bg-lime-500 hover:bg-lime-600 text-black px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Volver al Inventario
              </button>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
                <h2 className="text-lg font-semibold text-lime-400">
                  Equipos Pendientes de IMEI ({items.length})
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Asigna códigos IMEI únicos a cada equipo para completar el registro
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-lime-400">ID</th>
                      <th className="px-4 py-3 text-left text-lime-400">Producto</th>
                      <th className="px-4 py-3 text-left text-lime-400">Especificaciones</th>
                      <th className="px-4 py-3 text-left text-lime-400">Sucursal</th>
                      <th className="px-4 py-3 text-left text-lime-400">IMEI</th>
                      <th className="px-4 py-3 text-left text-lime-400">Estado</th>
                      <th className="px-4 py-3 text-left text-lime-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const validation = validationResults[item.id];
                      const isValidating = validating[item.id];
                      
                      return (
                        <tr key={item.id} className="border-t border-gray-700 hover:bg-gray-700 transition-colors">
                          <td className="px-4 py-3 font-mono text-sm">{item.id}</td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium">{item.brand} {item.model}</div>
                              <div className="text-sm text-gray-400">{item.category}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="space-y-1">
                              <div>Color: {item.color || "N/A"}</div>
                              <div>RAM: {item.ram || "N/A"}</div>
                              <div>Storage: {item.storage || "N/A"}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{item.store}</td>
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Ingresa IMEI (15 dígitos)"
                                value={editing[item.id] || ""}
                                onChange={(e) => handleChange(item.id, e.target.value)}
                                className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-lime-500 focus:outline-none font-mono"
                                maxLength={15}
                              />
                              {isValidating && (
                                <div className="text-yellow-400 text-xs">
                                  🔍 Validando IMEI...
                                </div>
                              )}
                              {validation && (
                                <div className={`text-xs ${validation.valid ? 'text-green-400' : 'text-red-400'}`}>
                                  {validation.valid ? '✅' : '❌'} {validation.message}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              item.status === 'in_stock' ? 'bg-green-900 text-green-200' :
                              item.status === 'pending' ? 'bg-yellow-900 text-yellow-200' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {item.status === 'in_stock' ? '✅ En Stock' :
                               item.status === 'pending' ? '⏳ Pendiente' :
                               item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleSave(item.id)}
                              disabled={!editing[item.id] || !validation?.valid}
                              className="bg-lime-500 hover:bg-lime-600 disabled:bg-gray-600 disabled:text-gray-400 text-black px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              💾 Guardar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AssignIMEI;