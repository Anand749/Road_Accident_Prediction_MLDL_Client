import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data);
      toast.success('Registration successful');
      navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-md w-full p-8 relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accentRed/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-accentBlue/40 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accentRed to-accentBlue flex items-center justify-center shadow-glow">
              <span className="font-rajdhani text-xl font-bold">SOS</span>
            </div>
            <h1 className="mt-4 font-rajdhani text-2xl font-semibold tracking-[0.18em] uppercase text-center">
              Create Secure Profile
            </h1>
            <p className="mt-1 text-xs text-gray-400 text-center">
              Register as a citizen or administrator
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="name" className="block text-xs text-gray-300 mb-1.5">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-accentBlue outline-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-xs text-gray-300 mb-1.5">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-accentBlue outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-xs text-gray-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-accentBlue outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-xs text-gray-300 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-accentBlue outline-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-xs text-gray-300 mb-1.5">
                  Role
                </label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-accentBlue outline-none text-sm"
                >
                  <option value="user">Citizen</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2 rounded-lg bg-gradient-to-r from-accentRed to-accentBlue text-sm font-semibold tracking-[0.2em] uppercase shadow-glow-red disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Register Profile'}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-gray-400 text-center">
            Already registered?
            {' '}
            <Link to="/login" className="text-accentBlue hover:underline ml-1">
              Back to login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;

