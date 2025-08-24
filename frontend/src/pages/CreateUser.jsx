import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { API_BASE_URL } from "../utils/constants";

const permissionPresets = {
  admin: {
    canAccessLoanQuotes: true,
    canRegisterPayments: true,
    canViewAccounting: true,
    canManageInventory: true,
  },
  warehouse: {
    canManageInventory: true,
  },
  accounting: {
    canViewAccounting: true,
  },
  store_staff: {
    canAccessLoanQuotes: true,
    canRegisterPayments: true,
  },
  custom: {},
};

const CreateUser = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "store_staff",
    store_id: "",
    permissions: "{}",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Users fetched:", res.data);
        setUsers(res.data);
        if (!Array.isArray(res.data)) {
          console.error("Unexpected users format:", res.data);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchStores = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/admin/stores`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Stores fetched (raw):", res.data);
        if (Array.isArray(res.data)) {
          setStores(res.data);
        } else {
          console.error("Unexpected stores format:", res.data);
        }
      } catch (err) {
        console.error("Error fetching stores:", err);
      }
    };

    fetchUsers();
    fetchStores();
  }, []);

  const handleEdit = (user) => {
    setForm({
      name: user.name,
      email: user.email,
      password: "", // don't prefill for security
      role: user.role,
      store_id: user.store_id,
      permissions: JSON.stringify(user.permissions || {}),
    });
  };

  const handleDeactivate = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/admin/users/${userId}`,
        { is_active: false },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Error deactivating user:", err);
    }
  };

  const handleChange = (e) => {
    if (e.target.name === "role") {
      const preset = permissionPresets[e.target.value] || {};
      setForm({
        ...form,
        [e.target.name]: e.target.value,
        permissions: JSON.stringify(preset),
      });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleCheckboxChange = (key) => {
    const current = JSON.parse(form.permissions || "{}");
    current[key] = !current[key];
    setForm({ ...form, permissions: JSON.stringify(current) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE_URL}/admin/create-user`, {
        ...form,
        permissions: JSON.parse(form.permissions || "{}")
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMessage("Usuario creado correctamente");
      setUsers((prev) => [...prev, res.data.user]);
      setForm({ name: "", email: "", password: "", role: "store_staff", store_id: "", permissions: "{}" });
    } catch (err) {
      console.error(err);
      setError("Error al crear usuario");
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto bg-black text-white p-6 rounded shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Crear Nuevo Usuario</h1>
        {message && <div className="text-green-400 mb-2">{message}</div>}
        {error && <div className="text-red-400 mb-2">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Nombre"
            className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            value={form.name}
            onChange={handleChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Correo Electrónico"
            className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            value={form.email}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            value={form.password}
            onChange={handleChange}
          />
          <select
            name="role"
            className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            value={form.role}
            onChange={handleChange}
          >
            <option value="store_staff">Staff de Tienda</option>
            <option value="warehouse">Almacén</option>
            <option value="accounting">Contabilidad</option>
            <option value="admin">Administrador</option>
            <option value="custom">Personalizado</option>
          </select>
          <select
            name="store_id"
            className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            value={form.store_id}
            onChange={handleChange}
          >
            <option value="">Selecciona una sucursal</option>
            {stores.length > 0 ? (
              stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))
            ) : (
              <option disabled value="">
                No hay sucursales disponibles
              </option>
            )}
          </select>
          <div className="text-sm text-gray-300">
            <p className="mb-1">Permisos:</p>
            {[
              { key: "canAccessLoanQuotes", label: "Acceder a Cotizador" },
              { key: "canRegisterPayments", label: "Registrar Pagos" },
              { key: "canViewAccounting", label: "Ver Contabilidad" },
              { key: "canManageInventory", label: "Administrar Inventario" },
              { key: "canCreateLoan", label: "Crear Préstamo" },
              { key: "canViewDashboard", label: "Ver Dashboard" },
              { key: "canEditInventory", label: "Editar Inventario" },
              { key: "canAssignIMEI", label: "Asignar IMEI" },
              { key: "canViewReports", label: "Ver Reportes" },
              { key: "canClosePeriods", label: "Cerrar Periodos Contables" },
            ].map((perm) => (
              <label key={perm.key} className="block">
                <input
                  type="checkbox"
                  checked={JSON.parse(form.permissions || "{}")[perm.key] || false}
                  onChange={() => handleCheckboxChange(perm.key)}
                  className="mr-2"
                />
                {perm.label}
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="w-full bg-crediyaGreen text-black p-2 rounded hover:bg-lime-400"
          >
            Crear Usuario
          </button>
        </form>
        <h2 className="text-xl font-semibold mt-8 mb-4">Usuarios Existentes</h2>
        {loading ? (
          <p className="text-gray-400">Cargando usuarios...</p>
        ) : (
          <ul className="space-y-2">
            {Array.isArray(users) && users.map((user) => (
              <li key={user.id} className="flex justify-between items-center bg-gray-800 p-3 rounded">
                <div>
                  <p className="font-bold">{user.name}</p>
                  <p className="text-sm text-gray-400">{user.email} · {user.role}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeactivate(user.id)}
                    className="text-sm text-red-400 hover:underline"
                  >
                    Desactivar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default CreateUser;