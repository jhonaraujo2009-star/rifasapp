import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success('Correo enviado. Revisa tu bandeja.');
    } catch {
      toast.error('No encontramos ese correo registrado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-animated min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass w-full max-w-md p-8"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 bg-opacity-30 mb-4">
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="text-sm text-white/50 mt-1">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">📧</div>
            <p className="text-white/80">
              Hemos enviado el enlace de recuperación a <strong>{email}</strong>. Revisa también tu carpeta de spam.
            </p>
            <Link to="/login" className="btn-primary inline-flex mt-4">
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="input-glass pl-10"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <span className="spinner w-5 h-5 border-2" /> : (
                <><Send className="w-4 h-4" />Enviar enlace de recuperación</>
              )}
            </button>

            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors mt-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}
