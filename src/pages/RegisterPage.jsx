import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      return toast.error('Las contraseñas no coinciden');
    }
    if (form.password.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres');
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      toast.success('¡Cuenta creada! Configura tu tienda.');
      navigate('/admin/ajustes');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Este correo ya está registrado');
      } else {
        toast.error('Error al crear la cuenta. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-animated min-h-screen flex items-center justify-center p-4">
      <div className="fixed top-0 right-0 w-96 h-96 bg-purple-600 opacity-10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-indigo-600 opacity-10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass w-full max-w-md p-8"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 bg-opacity-30 mb-4 animate-pulse-glow">
            <span className="text-3xl">🎰</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Crear tu cuenta</h1>
          <p className="text-sm text-white/50 mt-1">Empieza a vender rifas hoy</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Tu nombre</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input name="name" type="text" required value={form.name} onChange={handle}
                placeholder="Juan Pérez" className="input-glass pl-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input name="email" type="email" required value={form.email} onChange={handle}
                placeholder="tu@correo.com" className="input-glass pl-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input name="password" type="password" required value={form.password} onChange={handle}
                placeholder="Mínimo 6 caracteres" className="input-glass pl-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Confirmar contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input name="confirm" type="password" required value={form.confirm} onChange={handle}
                placeholder="Repite tu contraseña" className="input-glass pl-10" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? (
              <span className="spinner w-5 h-5 border-2" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Crear cuenta gratis
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
            Inicia sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
