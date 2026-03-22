import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  collection, query, where, getDocs,
  writeBatch, doc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import {
  Search, CheckSquare, Square, X, Zap,
  CheckCircle, Clock, Ticket, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Colores de cada estado (estilo admin limpio) ────────── */
const ESTADO_STYLE = {
  disponible: {
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.14)',
    color: 'rgba(255,255,255,0.75)',
    hoverBg: 'rgba(124,58,237,0.2)',
    hoverBorder: 'rgba(124,58,237,0.5)',
  },
  apartado: {
    bg: 'rgba(34,197,94,0.14)',
    border: 'rgba(34,197,94,0.4)',
    color: '#86efac',
  },
  vendido: {
    bg: 'rgba(239,68,68,0.14)',
    border: 'rgba(239,68,68,0.38)',
    color: '#fca5a5',
    textDecoration: 'line-through',
    opacity: 0.8,
  },
};

const ESTADOS_BTN = [
  { key: 'disponible', label: 'Disponible', icon: Ticket, color: '#a78bfa', bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.4)' },
  { key: 'apartado', label: 'Apartado', icon: Clock, color: '#34d399', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)' },
  { key: 'vendido', label: 'Vendido', icon: CheckCircle, color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' },
];

export default function AdminGrid() {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [hovered, setHovered] = useState(null);
  // Rango: seleccionar del X al Y
  const [rangoDesde, setRangoDesde] = useState('');
  const [rangoHasta, setRangoHasta] = useState('');

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const sq = await getDocs(query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid)));
      if (sq.empty) { setLoading(false); return; }
      const storeData = { id: sq.docs[0].id, ...sq.docs[0].data() };
      setStore(storeData);
      const ts = await getDocs(query(collection(db, 'tickets'), where('storeId', '==', storeData.id)));
      setTickets(ts.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const estadoMap = useMemo(() =>
    Object.fromEntries(tickets.map(t => [t.numero, t])),
    [tickets]
  );

  const numeros = useMemo(() => {
    return Array.from({ length: 1000 }, (_, i) => i + 1).filter(n => {
      const estado = estadoMap[n]?.estado || 'disponible';
      if (filtroEstado !== 'todos' && estado !== filtroEstado) return false;
      if (busqueda) {
        const b = String(busqueda).trim();
        if (!String(n).padStart(3, '0').includes(b) && !String(n).includes(b)) return false;
      }
      return true;
    });
  }, [estadoMap, filtroEstado, busqueda]);

  const conteo = useMemo(() => ({
    disponible: 1000 - tickets.filter(t => t.estado === 'vendido').length - tickets.filter(t => t.estado === 'apartado').length,
    apartado: tickets.filter(t => t.estado === 'apartado').length,
    vendido: tickets.filter(t => t.estado === 'vendido').length,
  }), [tickets]);

  /* ── Toggle selección ────────────────────────────── */
  const toggle = (n) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  const seleccionarTodosFiltrados = () => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      numeros.forEach(n => next.add(n));
      return next;
    });
  };

  const deseleccionarTodo = () => setSeleccionados(new Set());

  const seleccionarPorEstado = (estado) => {
    setSeleccionados(new Set(
      Array.from({ length: 1000 }, (_, i) => i + 1)
        .filter(n => (estadoMap[n]?.estado || 'disponible') === estado)
    ));
  };

  const seleccionarRango = () => {
    const desde = parseInt(rangoDesde);
    const hasta = parseInt(rangoHasta);
    if (!desde || !hasta || desde < 1 || hasta > 1000 || desde > hasta) {
      toast.error('Rango inválido (1–1000)');
      return;
    }
    const rango = Array.from({ length: hasta - desde + 1 }, (_, i) => i + desde);
    setSeleccionados(new Set(rango));
    toast.success(`${rango.length} números seleccionados`);
  };

  /* ── Aplicar estado en lote ──────────────────────── */
  const aplicarEstado = async (nuevoEstado) => {
    if (seleccionados.size === 0) { toast.error('Selecciona al menos un número'); return; }
    setGuardando(true);
    try {
      const batch = writeBatch(db);
      [...seleccionados].forEach(num => {
        const ticketId = `${store.id}_${String(num).padStart(3, '0')}`;
        const ref = doc(db, 'tickets', ticketId);
        batch.set(ref, {
          storeId: store.id,
          numero: num,
          estado: nuevoEstado,
          ...(nuevoEstado === 'apartado' ? { fecha_apartado: serverTimestamp() } : { fecha_apartado: null }),
          ...(nuevoEstado !== 'vendido' ? { cliente_nombre: null, cliente_id: null } : {}),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      await batch.commit();
      toast.success(`✅ ${seleccionados.size} número${seleccionados.size > 1 ? 's' : ''} marcado${seleccionados.size > 1 ? 's' : ''} como "${nuevoEstado}"`);
      setSeleccionados(new Set());
      await fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar. Intenta de nuevo.');
    } finally { setGuardando(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!store) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>
      Configura tu tienda primero en <a href="/admin/ajustes" style={{ color: '#a78bfa' }}>Ajustes</a>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, sans-serif', paddingBottom: 80 }}>

      {/* ── Header ──────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 4 }}>Panel de control</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0 }}>Inventario de números</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
          Selecciona 1 o múltiples números y cambia su estado. Solo el admin puede modificar.
        </p>
      </div>

      {/* ── Mini stats ─────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {ESTADOS_BTN.map(({ key, label, color, bg, border }) => (
          <button key={key} onClick={() => seleccionarPorEstado(key)}
            title={`Seleccionar todos los ${label.toLowerCase()}s`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 13, background: bg, border: `1px solid ${border}`, cursor: 'pointer', transition: 'all 0.2s' }}>
            <span style={{ fontSize: 20, fontWeight: 900, color }}>{conteo[key]}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{label}s</span>
          </button>
        ))}
        <div style={{ flex: 1, minWidth: 120, borderRadius: 13, padding: '10px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            Toca un badge para seleccionar todos los de ese estado
          </span>
        </div>
      </div>

      {/* ── Controles de selección ─────────────────── */}
      <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>

        {/* Búsqueda */}
        <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 140 }}>
          <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="number" min="1" max="1000" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar número..."
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 34, paddingTop: 10, paddingBottom: 10, paddingRight: 12, borderRadius: 11, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 13, outline: 'none' }}
          />
        </div>

        {/* Filtros estado */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['todos', 'disponible', 'apartado', 'vendido'].map(f => (
            <button key={f} onClick={() => setFiltroEstado(f)}
              style={{ padding: '8px 12px', borderRadius: 9, border: `1px solid ${filtroEstado === f ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`, background: filtroEstado === f ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', color: filtroEstado === f ? '#c4b5fd' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>
              {f}
            </button>
          ))}
        </div>

        {/* Rango */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Del</span>
          <input type="number" min="1" max="1000" value={rangoDesde} onChange={e => setRangoDesde(e.target.value)}
            placeholder="1"
            style={{ width: 64, padding: '8px 10px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 13, outline: 'none', textAlign: 'center' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>al</span>
          <input type="number" min="1" max="1000" value={rangoHasta} onChange={e => setRangoHasta(e.target.value)}
            placeholder="1000"
            style={{ width: 64, padding: '8px 10px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 13, outline: 'none', textAlign: 'center' }} />
          <button onClick={seleccionarRango}
            style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Seleccionar rango
          </button>
        </div>

        {/* Seleccionar todo / limpiar */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={seleccionarTodosFiltrados}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <CheckSquare size={13} /> Seleccionar todo
          </button>
          {seleccionados.size > 0 && (
            <button onClick={deseleccionarTodo}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'rgba(252,165,165,0.8)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <X size={12} /> Limpiar ({seleccionados.size})
            </button>
          )}
        </div>
      </div>

      {/* ── Grilla de números ───────────────────────── */}
      <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6 }}>
          {numeros.map(n => {
            const estado = estadoMap[n]?.estado || 'disponible';
            const isSel = seleccionados.has(n);
            const isHov = hovered === n;
            const s = ESTADO_STYLE[estado];

            let cellStyle = {
              height: 42,
              borderRadius: 9,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: isSel ? 800 : (s.fontWeight || 600),
              transition: 'all 0.1s ease',
              userSelect: 'none',
              outline: 'none',
              position: 'relative',
            };

            if (isSel) {
              cellStyle = { ...cellStyle, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: '2px solid #a78bfa', color: 'white', boxShadow: '0 0 12px rgba(124,58,237,0.6)', transform: 'scale(1.1)' };
            } else if (isHov) {
              cellStyle = { ...cellStyle, background: s.hoverBg || 'rgba(124,58,237,0.2)', border: `1.5px solid ${s.hoverBorder || 'rgba(124,58,237,0.5)'}`, color: 'white', transform: 'scale(1.05)' };
            } else {
              cellStyle = { ...cellStyle, background: s.bg, border: `1px solid ${s.border}`, color: s.color, textDecoration: s.textDecoration, opacity: s.opacity };
            }

            return (
              <button key={n}
                onClick={() => toggle(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                title={`#${String(n).padStart(3,'0')} — ${estado}${estadoMap[n]?.cliente_nombre ? ` (${estadoMap[n].cliente_nombre})` : ''}`}
                style={cellStyle}
              >
                {isSel && <span style={{ position: 'absolute', top: 2, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#ffd700' }} />}
                {String(n).padStart(3, '0')}
              </button>
            );
          })}
        </div>

        {numeros.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
            No hay números con ese filtro
          </div>
        )}
      </div>

      {/* ── Barra flotante de acción ─────────────────── */}
      <AnimatePresence>
        {seleccionados.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: 'calc(100% - 40px)', maxWidth: 620 }}
          >
            <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(13,11,30,0.97)', backdropFilter: 'blur(20px)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', boxShadow: '0 8px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color="#a78bfa" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'white', fontSize: 14 }}>{seleccionados.size} número{seleccionados.size > 1 ? 's' : ''} seleccionado{seleccionados.size > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>¿Qué estado les aplicas?</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ESTADOS_BTN.map(({ key, label, icon: Icon, color, bg, border }) => (
                  <button key={key}
                    onClick={() => aplicarEstado(key)}
                    disabled={guardando}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 13, border: `1px solid ${border}`, background: bg, color, fontWeight: 800, fontSize: 13, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.6 : 1, transition: 'all 0.15s' }}
                    onMouseEnter={e => { if (!guardando) e.currentTarget.style.filter = 'brightness(1.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}>
                    {guardando
                      ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
                      : <Icon size={14} />}
                    {label}
                  </button>
                ))}

                <button onClick={deseleccionarTodo}
                  style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
