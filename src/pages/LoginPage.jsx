import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('¡Bienvenido de vuelta!');
      navigate('/admin');
    } catch (err) {
      toast.error('Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-animated min-h-screen flex items-center justify-center p-4">
      {/* Orbes decorativos */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-purple-600 opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-indigo-600 opacity-10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass w-full max-w-md p-8"
      >
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 bg-opacity-30 mb-4 animate-pulse-glow">
            <span className="text-3xl">🎰</span>
          </div>
          <h1 className="text-2xl font-bold text-white">RifasApp</h1>
          <p className="text-sm text-white/50 mt-1">Inicia sesión en tu panel</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handle}
                placeholder="tu@correo.com"
                className="input-glass pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handle}
                placeholder="••••••••"
                className="input-glass pl-10"
              />
            </div>
          </div>

          <div className="text-right">
            <Link to="/recuperar" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? (
              <span className="spinner w-5 h-5 border-2" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Iniciar sesión
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
            Regístrate gratis
          </Link>
        </p>

        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-white/30 hover:text-white/50 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
