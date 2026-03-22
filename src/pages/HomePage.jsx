import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { Trophy, Calendar, DollarSign, Ticket, ArrowRight } from 'lucide-react';

function StoreCard({ store }) {
  const color = store.color_principal || '#7c3aed';
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="glass overflow-hidden cursor-pointer"
    >
      <Link to={`/tienda/${store.id}`} className="block">
        {/* Header con color de la tienda */}
        <div
          className="h-2"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
        <div className="p-6">
          {/* Logo + nombre */}
          <div className="flex items-center gap-4 mb-5">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.nombre}
                className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
              >
                {store.nombre?.charAt(0).toUpperCase() || '🎰'}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white">{store.nombre}</h3>
              <span className="badge badge-purple">✦ Activa</span>
            </div>
          </div>

          {/* Detalles */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span>Precio por número: <strong className="text-white">${store.precio_numero?.toLocaleString() || 0}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>Sorteo:{' '}
                <strong className="text-white">
                  {store.fecha_sorteo
                    ? new Date(store.fecha_sorteo.seconds * 1000).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })
                    : 'Por definir'}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Ticket className="w-4 h-4 text-yellow-400" />
              <span>1.000 números disponibles</span>
            </div>
          </div>

          <div
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
          >
            Ver números disponibles
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const q = query(collection(db, 'stores'), where('activa', '==', true));
        const snap = await getDocs(q);
        setStores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  return (
    <div className="bg-gradient-animated min-h-screen">
      {/* Orbes de fondo */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-600 opacity-8 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-indigo-700 opacity-8 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-dark border-b border-white/5 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🎰</span>
            <span className="text-xl font-bold text-white">RifasApp</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm py-2 px-4">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="btn-primary text-sm py-2 px-4">
              Crear tienda
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-16 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-medium mb-6">
            <Trophy className="w-4 h-4" />
            Plataforma líder de rifas online
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
            Rifas que<br />
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              generan dinero
            </span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
            Crea tu tienda de rifas en minutos. Vende números, gestiona clientes y exporta reportes. Todo desde tu celular.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/registro" className="btn-primary text-base py-3 px-6">
              🚀 Crear mi tienda gratis
            </Link>
            <a href="#tiendas" className="btn-secondary text-base py-3 px-6">
              Ver rifas activas →
            </a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-12"
        >
          {[
            { icon: '🏪', label: 'Tiendas activas', value: stores.length || '...' },
            { icon: '🎟️', label: 'Números / sorteo', value: '1.000' },
            { icon: '📱', label: 'PWA instalable', value: '✓' },
          ].map((s) => (
            <div key={s.label} className="glass p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Tiendas activas */}
      <section id="tiendas" className="max-w-6xl mx-auto px-4 md:px-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">
            🏪 Rifas activas
          </h2>
          <span className="badge badge-purple">{stores.length} tiendas</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner" />
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏗️</div>
            <p className="text-white/50 text-lg">Aún no hay rifas activas.</p>
            <p className="text-white/30 text-sm mt-2">¡Sé el primero en crear la tuya!</p>
            <Link to="/registro" className="btn-primary inline-flex mt-6">
              Crear mi tienda
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stores.map((store, i) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <StoreCard store={store} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-white/30 text-sm">
        RifasApp © {new Date().getFullYear()} — Plataforma SaaS de rifas online
      </footer>
    </div>
  );
}
