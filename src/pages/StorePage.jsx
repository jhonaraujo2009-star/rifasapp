import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import NumberGrid from '../components/NumberGrid';
import CountdownTimer from '../components/CountdownTimer';
import CheckoutModal from '../components/CheckoutModal';
import { Search, Filter, ShoppingCart, ArrowLeft, X } from 'lucide-react';

export default function StorePage() {
  const { storeId } = useParams();
  const [store, setStore] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [loadingStore, setLoadingStore] = useState(true);

  // Carga datos de la tienda
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const snap = await getDoc(doc(db, 'stores', storeId));
        if (snap.exists()) setStore({ id: snap.id, ...snap.data() });
      } finally {
        setLoadingStore(false);
      }
    };
    fetchStore();
  }, [storeId]);

  // Escucha en tiempo real los tickets de esta tienda
  useEffect(() => {
    const q = query(collection(db, 'tickets'), where('storeId', '==', storeId));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [storeId]);

  const toggleSeleccion = useCallback((numero) => {
    setSeleccionados(prev =>
      prev.includes(numero) ? prev.filter(n => n !== numero) : [...prev, numero]
    );
  }, []);

  const limpiarCarrito = () => setSeleccionados([]);

  const color = store?.color_principal || '#7c3aed';

  if (loadingStore) {
    return (
      <div className="bg-gradient-animated min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="bg-gradient-animated min-h-screen flex items-center justify-center text-center p-4">
        <div>
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-white">Tienda no encontrada</h2>
          <Link to="/" className="btn-primary inline-flex mt-6"><ArrowLeft className="w-4 h-4" />Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-animated min-h-screen pb-32">
      {/* Header de la tienda */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }}
      >
        {/* Orbe decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: color }} />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Todas las rifas
          </Link>

          <div className="flex items-center gap-4 mb-6">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.nombre}
                className="w-16 h-16 rounded-2xl object-cover border-2"
                style={{ borderColor: color }} />
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                {store.nombre?.charAt(0) || '🎰'}
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">{store.nombre}</h1>
              <p className="text-sm text-white/50">
                Precio: <strong className="text-white">${store.precio_numero?.toLocaleString()}</strong> por número
              </p>
            </div>
          </div>

          {/* Countdown */}
          {store.fecha_sorteo && (
            <div className="mb-4">
              <p className="text-xs text-white/40 text-center mb-3 uppercase tracking-widest">⏳ Tiempo para el sorteo</p>
              <CountdownTimer fechaSorteo={store.fecha_sorteo} />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Barra de herramientas */}
        <div className="glass p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="number"
                min="1"
                max="1000"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar número (ej: 042)..."
                className="input-glass pl-10"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              )}
            </div>

            {/* Filtro solo disponibles */}
            <button
              onClick={() => setSoloDisponibles(!soloDisponibles)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${soloDisponibles
                ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
            >
              <Filter className="w-4 h-4" />
              Solo disponibles
            </button>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'Disponibles', count: tickets.filter(t => t.estado === 'disponible').length || (1000 - tickets.length), color: 'text-white' },
              { label: 'Apartados', count: tickets.filter(t => t.estado === 'apartado').length, color: 'text-yellow-400' },
              { label: 'Vendidos', count: tickets.filter(t => t.estado === 'vendido').length, color: 'text-red-400' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.count}</div>
                <div className="text-xs text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Grilla de 1000 números */}
        <div className="glass p-4">
          <NumberGrid
            tickets={tickets}
            seleccionados={seleccionados}
            onSelect={toggleSeleccion}
            soloDisponibles={soloDisponibles}
            busqueda={busqueda}
          />
        </div>
      </div>

      {/* FAB del carrito */}
      {seleccionados.length > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="cart-fab"
        >
          <button
            onClick={() => setShowCheckout(true)}
            className="btn-primary py-4 px-5 rounded-2xl shadow-2xl animate-pulse-glow"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-bold">{seleccionados.length} número{seleccionados.length > 1 ? 's' : ''}</span>
            <span className="opacity-70">· ${(seleccionados.length * (store.precio_numero || 0)).toLocaleString()}</span>
          </button>
        </motion.div>
      )}

      {/* Modal de checkout */}
      {showCheckout && (
        <CheckoutModal
          store={store}
          seleccionados={seleccionados}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false);
            limpiarCarrito();
          }}
        />
      )}
    </div>
  );
}
