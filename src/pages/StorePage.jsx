import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import NumberGrid from '../components/NumberGrid';
import CountdownTimer from '../components/CountdownTimer';
import CheckoutModal from '../components/CheckoutModal';
import { Search, Filter, ShoppingCart, X, Download, Smartphone, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

/* Detecta si es iOS */
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = () => ('standalone' in window.navigator) && window.navigator.standalone;

/* ── PWA Install Hook ─────────────────────────── */
function usePWAInstall() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', h);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  };
  return { canInstall: !!prompt && !installed, install };
}

/* ── Banner de instalación PWA ────────────────── */
function PWABanner({ onInstall, onClose, color }) {
  const ios = isIOS();
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 90,
        maxWidth: 480, margin: '0 auto',
        background: '#fff',
        borderRadius: 18,
        border: '1px solid #e9ecef',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Smartphone size={22} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: '#212529', fontSize: 14, marginBottom: 2 }}>Instala esta app</div>
        {ios
          ? <div style={{ fontSize: 12, color: '#6c757d', lineHeight: 1.4 }}>Toca <strong>Compartir</strong> (⬆) y luego <strong>«Añadir a pantalla de inicio»</strong></div>
          : <div style={{ fontSize: 12, color: '#6c757d' }}>Accede rápido desde tu pantalla de inicio</div>
        }
      </div>
      {!ios && (
        <button onClick={onInstall}
          style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: color, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
          Instalar
        </button>
      )}
      <button onClick={onClose}
        style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f3f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <X size={13} color="#868e96" />
      </button>
    </motion.div>
  );
}

export default function StorePage() {
  const { storeId } = useParams();
  const [store, setStore] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [loadingStore, setLoadingStore] = useState(true);
  const { canInstall, install } = usePWAInstall();

  // Banner PWA: mostrar si no lo han cerrado antes y no está ya instalada
  const [showPWABanner, setShowPWABanner] = useState(() => {
    if (isInStandaloneMode()) return false; // ya instalada
    return localStorage.getItem('pwa_banner_closed') !== '1';
  });

  const cerrarBanner = () => {
    setShowPWABanner(false);
    localStorage.setItem('pwa_banner_closed', '1');
  };

  const handleInstall = async () => {
    await install();
    cerrarBanner();
  };

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'stores', storeId));
        if (snap.exists()) setStore({ id: snap.id, ...snap.data() });
      } finally { setLoadingStore(false); }
    })();
  }, [storeId]);

  useEffect(() => {
    const q = query(collection(db, 'tickets'), where('storeId', '==', storeId));
    return onSnapshot(q, snap => setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [storeId]);

  const toggleSeleccion = useCallback((n) => {
    setSeleccionados(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  }, []);

  const stats = useMemo(() => {
    const vendidos = tickets.filter(t => t.estado === 'vendido').length;
    const apartados = tickets.filter(t => t.estado === 'apartado').length;
    return { vendidos, apartados, disponibles: 1000 - vendidos - apartados };
  }, [tickets]);

  const color = store?.color_principal || '#7c3aed';

  /* ── Loading ────────────────────────── */
  if (loadingStore) return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid #e9ecef`, borderTopColor: color, animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: '#868e96', fontSize: 14 }}>Cargando rifa...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (!store) return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', color: '#868e96' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎟️</div>
        <h2 style={{ color: '#343a40', fontWeight: 800, marginBottom: 6 }}>Rifa no encontrada</h2>
        <p style={{ fontSize: 14 }}>El enlace puede haber expirado o ser incorrecto.</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'Inter, sans-serif', paddingBottom: 100 }}>

      {/* ── Header de la tienda — sin links a otras páginas ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #e9ecef', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

          {/* Logo + nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {store.logo_url
              ? <img src={store.logo_url} alt={store.nombre} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: '1px solid #e9ecef', flexShrink: 0 }} />
              : <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16, flexShrink: 0 }}>
                  {store.nombre?.charAt(0).toUpperCase()}
                </div>
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#212529', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{store.nombre}</div>
              <div style={{ fontSize: 11, color: '#868e96', fontWeight: 600 }}>${(store.precio_numero || 0).toLocaleString()} por número</div>
            </div>
          </div>

          {/* Badges + install */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, background: '#d1fae5', border: '1px solid #6ee7b7', fontSize: 11, fontWeight: 700, color: '#065f46' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
              EN VIVO
            </div>
            {canInstall && (
              <button onClick={install}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, background: color, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: `0 2px 8px ${color}44` }}>
                <Download size={12} /> Instalar App
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Contenido principal ───────────────────── */}
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '20px 20px' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Sidebar: info + controles */}
          <div style={{ width: 270, flexShrink: 0 }} className="store-sidebar">

            {/* Countdown */}
            {store.fecha_sorteo && (
              <div style={{ borderRadius: 16, border: '1px solid #e9ecef', background: '#fff', padding: '16px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#868e96', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10, textAlign: 'center' }}>⏳ Tiempo restante</div>
                <CountdownTimer fechaSorteo={store.fecha_sorteo} />
              </div>
            )}

            {/* Stats — solo si el admin lo permite */}
            {store.mostrar_stats && (
              <div style={{ borderRadius: 16, border: '1px solid #e9ecef', background: '#fff', padding: '16px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#868e96', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 12 }}>Estado de la rifa</div>
                {[
                  { label: 'Disponibles', val: stats.disponibles, bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
                  { label: 'Apartados', val: stats.apartados, bg: '#dcfce7', color: '#15803d', border: '#86efac' },
                  { label: 'Vendidos', val: stats.vendidos, bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
                ].map(({ label, val, bg, color: c, border }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: bg, border: `1px solid ${border}`, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: c, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: c }}>{val}</span>
                  </div>
                ))}
                {/* Mini barra de progreso */}
                <div style={{ height: 6, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden', display: 'flex', marginTop: 4 }}>
                  <div style={{ background: '#ef4444', width: `${(stats.vendidos / 1000) * 100}%`, transition: 'width 1s' }} />
                  <div style={{ background: '#22c55e', width: `${(stats.apartados / 1000) * 100}%`, transition: 'width 1s' }} />
                </div>
              </div>
            )}

            {/* Buscar + filtro */}
            <div style={{ borderRadius: 16, border: '1px solid #e9ecef', background: '#fff', padding: '16px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#868e96', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Buscar número</div>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#adb5bd" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="number" min="1" max="1000" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="001 – 1000"
                  style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 34, paddingRight: busqueda ? 32 : 12, paddingTop: 10, paddingBottom: 10, borderRadius: 10, border: '1px solid #dee2e6', background: '#f8f9fa', color: '#212529', fontSize: 14, outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = color; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#dee2e6'; e.target.style.background = '#f8f9fa'; }}
                />
                {busqueda && <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#adb5bd', cursor: 'pointer' }}><X size={13} /></button>}
              </div>
              <button onClick={() => setSoloDisponibles(!soloDisponibles)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, border: `1px solid ${soloDisponibles ? color : '#dee2e6'}`, background: soloDisponibles ? `${color}15` : '#f8f9fa', color: soloDisponibles ? color : '#6c757d', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                <Filter size={13} /> {soloDisponibles ? '✓ Solo disponibles' : 'Ver solo disponibles'}
              </button>
            </div>

            {/* Leyenda */}
            <div style={{ borderRadius: 16, border: '1px solid #e9ecef', background: '#fff', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#868e96', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 12 }}>Leyenda</div>
              {[
                { bg: '#fff', border: '#e5e7eb', text: '#374151', label: 'Disponible — puedes elegirlo' },
                { bg: '#dcfce7', border: '#86efac', text: '#15803d', label: 'Apartado — esperando pago' },
                { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', label: 'Vendido — ya está tomado' },
                { bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: '#7c3aed', text: '#fff', label: 'Tu selección actual' },
              ].map(({ bg, border, text, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: text, flexShrink: 0 }}>1</span>
                  <span style={{ fontSize: 12, color: '#495057' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grilla de números — ocupa todo el espacio restante */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ borderRadius: 16, border: '1px solid #e9ecef', background: '#fff', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#212529', fontSize: 15 }}>Elige tus números</div>
                  <div style={{ fontSize: 12, color: '#868e96', marginTop: 2 }}>Toca los disponibles para seleccionarlos</div>
                </div>
                {seleccionados.length > 0 && (
                  <div style={{ padding: '5px 14px', borderRadius: 20, background: `${color}15`, border: `1px solid ${color}44`, fontSize: 13, fontWeight: 800, color }}>
                    ✓ {seleccionados.length} elegido{seleccionados.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <NumberGrid
                tickets={tickets}
                seleccionados={seleccionados}
                onSelect={toggleSeleccion}
                soloDisponibles={soloDisponibles}
                busqueda={busqueda}
                mostrarStats={store.mostrar_stats}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Carrito flotante ─────────────────────── */}
      <AnimatePresence>
        {seleccionados.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 99, maxWidth: 500, margin: '0 auto' }}
          >
            <button onClick={() => setShowCheckout(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderRadius: 18, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 32px ${color}55`, transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCart size={18} color="#fff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: '#fff' }}>
                    {seleccionados.length} número{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Toca para apartar por WhatsApp</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: 20, color: '#fff' }}>
                  ${(seleccionados.length * (store.precio_numero || 0)).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Total</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal de checkout ─────────────────────── */}
      {showCheckout && (
        <CheckoutModal
          store={store}
          seleccionados={seleccionados}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => { setShowCheckout(false); setSeleccionados([]); }}
        />
      )}

      {/* ── Banner de instalación PWA ─────────────── */}
      <AnimatePresence>
        {showPWABanner && !showCheckout && seleccionados.length === 0 && (
          <PWABanner
            color={color}
            onInstall={handleInstall}
            onClose={cerrarBanner}
          />
        )}
      </AnimatePresence>


      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @media(max-width:768px){
          .store-sidebar{width:100% !important;}
          div[style*="display: flex; gap: 20px"]{flex-direction:column !important;}
        }
      `}</style>

      {/* ── Acceso Admin (discreto, footer) ────────── */}
      <div
        style={{ textAlign: 'center', padding: '28px 0 16px', opacity: 0, transition: 'opacity 0.3s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
        <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)', color: '#6c757d', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
          <Lock size={12} /> Administrar
        </Link>
      </div>
    </div>
  );
}
