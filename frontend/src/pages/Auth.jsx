import React, { useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { API_BASE_URL } from "../utils/constants";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? "/login" : "/register";
      const res = await axios.post(`${API_BASE_URL}${endpoint}`, form);
      localStorage.setItem("token", res.data.token);
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
      console.log("Token received:", res.data.token);
      setMessage(res.data.message);
      window.location.href = "/dashboard";
    } catch (error) {
      if (error.response) {
        setMessage("Error: " + error.response.data.message);
      } else if (error.request) {
        setMessage("No response from server. Is it running?");
      } else {
        setMessage("Unexpected error: " + error.message);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white px-4">
      <div className="flex flex-col items-center">
        <img src="/logo2.png" alt="CrediYa Logo" className="mb-6 w-40" />
        <div className="w-full max-w-md bg-[#0f0f0f] p-8 rounded-xl shadow-xl border border-crediyaGreen">
          <h2 className="mb-6 text-2xl font-semibold text-center text-crediyaGreen">
            {isLogin ? "Iniciar Sesión" : "Registrarse"}
          </h2>
          {message && (
            <div className="mb-4 p-3 text-center text-sm text-blue-700 bg-blue-100 rounded">
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="mb-4">
                <label className="block mb-1 text-gray-700 font-medium" htmlFor="name">
                  Nombre
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-crediyaGreen bg-black text-white rounded focus:outline-none focus:ring-2 focus:ring-crediyaGreen"
                />
              </div>
            )}
            <div className="mb-4">
              <label className="block mb-1 text-gray-700 font-medium" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-crediyaGreen bg-black text-white rounded focus:outline-none focus:ring-2 focus:ring-crediyaGreen"
              />
            </div>
            <div className="mb-6">
              <label className="block mb-1 text-gray-700 font-medium" htmlFor="password">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-crediyaGreen bg-black text-white rounded focus:outline-none focus:ring-2 focus:ring-crediyaGreen"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-crediyaGreen text-black font-semibold rounded hover:bg-white hover:text-crediyaGreen transition"
            >
              {isLogin ? "Ingresar" : "Registrarse"}
            </button>
          </form>
          <p className="mt-6 text-center text-gray-600">
            {isLogin ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}{" "}
            <button
              className="text-crediyaGreen hover:underline font-medium"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Registrarse" : "Iniciar Sesión"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;