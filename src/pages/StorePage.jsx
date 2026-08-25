import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import NumberGrid from '../components/NumberGrid';
import CountdownTimer from '../components/CountdownTimer';
import CheckoutModal from '../components/CheckoutModal';
import { Search, Filter, ShoppingCart, X, Download, Smartphone, Lock, Clock, Tag, Users } from 'lucide-react';
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
  const [showTransparencia, setShowTransparencia] = useState(false);
  const [busquedaTransparencia, setBusquedaTransparencia] = useState('');

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

  /* ── Lock / unlock selection logic ──── */
  const [lockTimeLeft, setLockTimeLeft] = useState(null);
  const seleccionBloqueada = useMemo(() => {
    if (!store?.bloquear_seleccion) return false;
    if (!store?.fecha_habilitacion) return true; // blocked with no unlock date
    const target = store.fecha_habilitacion?.seconds
      ? store.fecha_habilitacion.seconds * 1000
      : new Date(store.fecha_habilitacion).getTime();
    return Date.now() < target;
  }, [store, lockTimeLeft]); // lockTimeLeft dependency forces re-eval every second

  useEffect(() => {
    if (!store?.bloquear_seleccion || !store?.fecha_habilitacion) return;
    const target = store.fecha_habilitacion?.seconds
      ? store.fecha_habilitacion.seconds * 1000
      : new Date(store.fecha_habilitacion).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setLockTimeLeft(null);
        return;
      }
      setLockTimeLeft({
        dias: Math.floor(diff / (1000 * 60 * 60 * 24)),
        horas: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutos: Math.floor((diff / (1000 * 60)) % 60),
        segundos: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [store]);

  const color = store?.color_principal || '#7c3aed';

  /* ── Discount pricing logic ────────── */
  const calcularPrecio = (cantidad) => {
    const precioBase = store?.precio_numero || 0;
    const precioDesc = store?.precio_descuento || 0;
    const cantidadDesc = store?.cantidad_descuento || 0;
    const tieneDescuento = precioDesc > 0 && cantidadDesc > 0 && cantidad >= cantidadDesc;
    const precioUnitario = tieneDescuento ? precioDesc : precioBase;
    return { precioUnitario, total: cantidad * precioUnitario, tieneDescuento, precioBase };
  };

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
              <div style={{ fontSize: 11, color: '#868e96', fontWeight: 600 }}>
                ${(store.precio_numero || 0).toLocaleString()} por número
                {store.precio_descuento > 0 && store.cantidad_descuento > 0 && (
                  <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 6, background: '#d1fae5', color: '#065f46', fontSize: 10, fontWeight: 700 }}>
                    {store.cantidad_descuento}+ = ${store.precio_descuento.toLocaleString()} c/u
                  </span>
                )}
              </div>
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

            {/* Countdown — solo visible si el admin lo habilita */}
            {store.mostrar_countdown && store.fecha_sorteo && (
              <div style={{ borderRadius: 16, border: '1px solid #e9ecef', background: '#fff', padding: '16px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#868e96', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10, textAlign: 'center' }}>⏳ Tiempo restante</div>
                <CountdownTimer fechaSorteo={store.fecha_sorteo} />
              </div>
            )}

            {/* Stats — solo si el admin lo permite */}
            {store.mostrar_stats === true && (
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

            {/* Botón Tabla de Compradores */}
            <div style={{ borderRadius: 16, border: '1px solid #e9ecef', background: '#fff', padding: '16px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <button onClick={() => { setShowTransparencia(true); setBusquedaTransparencia(''); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', borderRadius: 10,
                  border: `1px solid ${color}44`, background: `${color}08`,
                  color: color, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; }}
              >
                <Users size={15} /> Tabla de Compradores
              </button>
              <div style={{ fontSize: 11, color: '#adb5bd', textAlign: 'center', marginTop: 6 }}>
                Ver todos los números y sus compradores
              </div>
            </div>


          </div>

          {/* Grilla de números — ocupa todo el espacio restante */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ borderRadius: 16, border: '1px solid #e9ecef', background: '#fff', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', position: 'relative' }}>

              {/* ── Lock overlay ───────────────────────────────── */}
              {seleccionBloqueada && (
                <div style={{
                  marginBottom: 16,
                  padding: '20px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #fef3c7, #fffbeb)',
                  border: '1px solid #fcd34d',
                  textAlign: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Lock size={20} color="#d97706" />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, color: '#92400e', fontSize: 15 }}>
                        Selección bloqueada
                      </div>
                      <div style={{ fontSize: 12, color: '#b45309', marginTop: 1 }}>
                        Los números se podrán elegir próximamente
                      </div>
                    </div>
                  </div>

                  {/* Countdown until unlock */}
                  {lockTimeLeft && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
                        <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Se habilita en
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                        {[
                          { label: 'Días', value: lockTimeLeft.dias },
                          { label: 'Horas', value: lockTimeLeft.horas },
                          { label: 'Min', value: lockTimeLeft.minutos },
                          { label: 'Seg', value: lockTimeLeft.segundos },
                        ].map(({ label, value }, i, arr) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{
                                width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: 12, background: '#fff', border: '2px solid #fcd34d',
                                boxShadow: '0 2px 8px rgba(251,191,36,0.2)',
                              }}>
                                <span style={{
                                  fontSize: 24, fontWeight: 900, color: '#92400e',
                                  fontFamily: 'Inter, system-ui, sans-serif',
                                  fontVariantNumeric: 'tabular-nums',
                                }}>
                                  {String(value ?? 0).padStart(2, '0')}
                                </span>
                              </div>
                              <span style={{ fontSize: 9, fontWeight: 700, color: '#b45309', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {label}
                              </span>
                            </div>
                            {i < arr.length - 1 && (
                              <span style={{ fontSize: 20, fontWeight: 900, color: '#d97706', marginBottom: 18, animation: 'blink 1s step-end infinite' }}>:</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#212529', fontSize: 15 }}>
                    {seleccionBloqueada ? '🔒 Números de la rifa' : 'Elige tus números'}
                  </div>
                  <div style={{ fontSize: 12, color: '#868e96', marginTop: 2 }}>
                    {seleccionBloqueada ? 'Puedes ver los números, pero la selección aún no está habilitada' : 'Toca los disponibles para seleccionarlos'}
                  </div>
                </div>
                {!seleccionBloqueada && seleccionados.length > 0 && (
                  <div style={{ padding: '5px 14px', borderRadius: 20, background: `${color}15`, border: `1px solid ${color}44`, fontSize: 13, fontWeight: 800, color }}>
                    ✓ {seleccionados.length} elegido{seleccionados.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <NumberGrid
                tickets={tickets}
                seleccionados={seleccionBloqueada ? [] : seleccionados}
                onSelect={toggleSeleccion}
                soloDisponibles={soloDisponibles}
                busqueda={busqueda}
                mostrarStats={store.mostrar_stats}
                disabled={seleccionBloqueada}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Carrito flotante (hidden when locked) ─────────────── */}
      <AnimatePresence>
        {!seleccionBloqueada && seleccionados.length > 0 && (
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
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Toca para solicitar por WhatsApp</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {(() => {
                  const p = calcularPrecio(seleccionados.length);
                  return (
                    <>
                      <div style={{ fontWeight: 900, fontSize: 20, color: '#fff' }}>
                        ${p.total.toLocaleString()}
                      </div>
                      {p.tieneDescuento ? (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
                          <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>${(seleccionados.length * p.precioBase).toLocaleString()}</span>
                          {' '}<span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>-${((seleccionados.length * p.precioBase) - p.total).toLocaleString()} desc.</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Total</div>
                      )}
                    </>
                  );
                })()}
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

      {/* ── Modal Tabla de Compradores (público) ──── */}
      <AnimatePresence>
        {showTransparencia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setShowTransparencia(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 700, maxHeight: '85vh',
                background: '#fff', borderRadius: 20,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '18px 22px', borderBottom: '1px solid #e9ecef',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `linear-gradient(135deg, ${color}08, ${color}03)`,
              }}>
                <div>
                  <div style={{ fontWeight: 900, color: '#212529', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} color={color} /> Tabla de Compradores
                  </div>
                  <div style={{ fontSize: 12, color: '#868e96', marginTop: 2 }}>
                    Todos los números de la rifa — Transparencia total 🔍
                  </div>
                </div>
                <button onClick={() => setShowTransparencia(false)}
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: '#f1f3f5', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <X size={16} color="#868e96" />
                </button>
              </div>

              {/* Buscador */}
              <div style={{ padding: '12px 22px', borderBottom: '1px solid #f1f3f5' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#adb5bd" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={busquedaTransparencia}
                    onChange={e => setBusquedaTransparencia(e.target.value)}
                    placeholder="Buscar por nombre del comprador o número..."
                    style={{
                      width: '100%', boxSizing: 'border-box', paddingLeft: 36,
                      paddingRight: busquedaTransparencia ? 36 : 14,
                      paddingTop: 10, paddingBottom: 10, borderRadius: 10,
                      border: '1px solid #dee2e6', background: '#f8f9fa',
                      color: '#212529', fontSize: 13, outline: 'none',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    onFocus={e => { e.target.style.borderColor = color; }}
                    onBlur={e => { e.target.style.borderColor = '#dee2e6'; }}
                  />
                  {busquedaTransparencia && (
                    <button onClick={() => setBusquedaTransparencia('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#adb5bd', cursor: 'pointer' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de números */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                {/* Header de tabla */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '70px 1fr 1fr',
                  padding: '10px 22px',
                  background: '#f8f9fa', borderBottom: '1px solid #e9ecef',
                  fontSize: 11, fontWeight: 800, color: '#868e96',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  position: 'sticky', top: 0, zIndex: 1,
                }}>
                  <div>Nº</div>
                  <div>Estado</div>
                  <div>Comprador</div>
                </div>

                {/* Filas */}
                {(() => {
                  const ticketMap = {};
                  tickets.forEach(t => { ticketMap[t.numero] = t; });

                  const b = busquedaTransparencia.toLowerCase().trim();
                  const filas = Array.from({ length: 1000 }, (_, i) => {
                    const t = ticketMap[i] || {};
                    return {
                      numero: i,
                      estado: t.estado || 'disponible',
                      comprador: t.cliente_nombre || null,
                    };
                  }).filter(row => {
                    if (!b) return true;
                    return (
                      String(row.numero).padStart(3, '0').includes(b) ||
                      String(row.numero).includes(b) ||
                      (row.comprador && row.comprador.toLowerCase().includes(b))
                    );
                  });

                  if (filas.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#adb5bd' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                        No se encontraron resultados para "{busquedaTransparencia}"
                      </div>
                    );
                  }

                  return filas.map(row => {
                    const esVendido = row.estado === 'vendido';
                    const esApartado = row.estado === 'apartado';
                    return (
                      <div key={row.numero} style={{
                        display: 'grid', gridTemplateColumns: '70px 1fr 1fr',
                        padding: '9px 22px', borderBottom: '1px solid #f1f3f5',
                        alignItems: 'center', transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fa'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{
                          fontWeight: 900, fontSize: 13, color: '#212529',
                          fontFamily: '"JetBrains Mono", monospace', letterSpacing: '1px',
                        }}>
                          {String(row.numero).padStart(3, '0')}
                        </div>
                        <div>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: esVendido ? '#fee2e2' : esApartado ? '#dcfce7' : '#f3f4f6',
                            border: `1px solid ${esVendido ? '#fca5a5' : esApartado ? '#86efac' : '#d1d5db'}`,
                            color: esVendido ? '#b91c1c' : esApartado ? '#15803d' : '#6b7280',
                          }}>
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: esVendido ? '#ef4444' : esApartado ? '#22c55e' : '#9ca3af',
                            }} />
                            {row.estado.charAt(0).toUpperCase() + row.estado.slice(1)}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: row.comprador ? 700 : 400,
                          color: row.comprador ? '#212529' : '#d1d5db',
                        }}>
                          {row.comprador || '—'}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 22px', borderTop: '1px solid #e9ecef',
                background: '#f8f9fa', textAlign: 'center',
                fontSize: 11, color: '#adb5bd', fontWeight: 600,
              }}>
                🎟️ {store.nombre} — Sorteo transparente
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @media(max-width:768px){
          .store-sidebar{width:100% !important;}
          div[style*="display: flex; gap: 20px"]{flex-direction:column !important;}
        }
      `}</style>

      {/* ── Acceso Admin (visible, discreto en footer) ─── */}
      <div style={{ textAlign: 'center', padding: '28px 0 16px' }}>
        <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 12, background: `linear-gradient(135deg, ${color}18, ${color}10)`, border: `1px solid ${color}30`, color: color, textDecoration: 'none', fontSize: 13, fontWeight: 700, transition: 'all 0.2s', boxShadow: `0 2px 8px ${color}20` }}
          onMouseEnter={e => { e.currentTarget.style.background = `${color}25`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <Lock size={13} /> Panel de Administración
        </Link>
      </div>
    </div>
  );
}
