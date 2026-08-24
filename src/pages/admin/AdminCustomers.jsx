import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { Search, Users, Ticket, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminCustomers() {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null); // nombre expandido en mobile

  useEffect(() => {
    const init = async () => {
      if (!currentUser) return;
      try {
        const sq = query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid));
        const ss = await getDocs(sq);
        if (ss.empty) { setLoading(false); return; }
        const storeData = { id: ss.docs[0].id, ...ss.docs[0].data() };
        setStore(storeData);

        // Buscar todos los tickets vendidos de esta tienda
        const tq = query(
          collection(db, 'tickets'),
          where('storeId', '==', storeData.id),
          where('estado', '==', 'vendido')
        );
        const ts = await getDocs(tq);
        setTickets(ts.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando clientes:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [currentUser]);

  // Agrupar tickets por cliente_nombre
  const clientes = useMemo(() => {
    const map = {};
    tickets.forEach(t => {
      const nombre = t.cliente_nombre || 'Sin nombre';
      if (!map[nombre]) {
        map[nombre] = {
          nombre,
          numeros: [],
          fechas: [],
        };
      }
      map[nombre].numeros.push(t.numero);
      if (t.fecha_compra) {
        const fecha = t.fecha_compra.seconds
          ? new Date(t.fecha_compra.seconds * 1000)
          : new Date(t.fecha_compra);
        map[nombre].fechas.push(fecha);
      }
    });

    // Convertir a array y ordenar por fecha más reciente
    return Object.values(map)
      .map(c => ({
        ...c,
        numeros: c.numeros.sort((a, b) => a - b),
        ultimaCompra: c.fechas.length > 0
          ? new Date(Math.max(...c.fechas.map(f => f.getTime())))
          : null,
      }))
      .sort((a, b) => {
        if (a.ultimaCompra && b.ultimaCompra) return b.ultimaCompra - a.ultimaCompra;
        if (a.ultimaCompra) return -1;
        if (b.ultimaCompra) return 1;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [tickets]);

  // Filtro por búsqueda
  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return clientes;
    const b = busqueda.toLowerCase().trim();
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(b) ||
      c.numeros.some(n => String(n).padStart(3, '0').includes(b))
    );
  }, [clientes, busqueda]);

  const totalNumeros = tickets.length;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ──────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 4 }}>Registro de ventas</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0 }}>Mis Clientes</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
          Clientes con tickets vendidos registrados en la rifa
        </p>
      </div>

      {/* ── Mini stats ─────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 14, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)' }}>
          <Users size={18} color="#a78bfa" />
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#c4b5fd' }}>{clientes.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Clientes</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <Ticket size={18} color="#f87171" />
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fca5a5' }}>{totalNumeros}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Tickets vendidos</div>
          </div>
        </div>
      </div>

      {/* ── Buscador ───────────────────────────────── */}
      <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '14px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o número..."
            style={{
              width: '100%', boxSizing: 'border-box', paddingLeft: 36, paddingRight: busqueda ? 36 : 14,
              paddingTop: 10, paddingBottom: 10, borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: 'white', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif',
            }}
            onFocus={e => { e.target.style.borderColor = '#a78bfa'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Lista de clientes ──────────────────────── */}
      {filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {busqueda ? 'No se encontraron clientes con esa búsqueda' : 'Aún no hay tickets vendidos con nombre registrado'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>
            {!busqueda && 'Vende tickets desde el Inventario o el Agente IA e incluye el nombre del comprador'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map((cliente) => {
            const isExpanded = expandido === cliente.nombre;
            const mostrarTodos = isExpanded || cliente.numeros.length <= 8;

            return (
              <div
                key={cliente.nombre}
                style={{
                  borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)', padding: '16px 18px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              >
                {/* Info del cliente */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))',
                      border: '1px solid rgba(124,58,237,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, color: '#c4b5fd', fontSize: 16,
                    }}>
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: 'white', fontSize: 15 }}>
                        {cliente.nombre}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                          fontSize: 11, fontWeight: 700, color: '#fca5a5',
                        }}>
                          <Ticket size={10} />
                          {cliente.numeros.length} número{cliente.numeros.length > 1 ? 's' : ''}
                        </span>
                        {cliente.ultimaCompra && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: 'rgba(255,255,255,0.35)',
                          }}>
                            <Calendar size={10} />
                            {cliente.ultimaCompra.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Números comprados */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(mostrarTodos ? cliente.numeros : cliente.numeros.slice(0, 8)).map(n => (
                    <span key={n} style={{
                      padding: '5px 10px', borderRadius: 8,
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.15))',
                      border: '1px solid rgba(124,58,237,0.3)',
                      color: '#c4b5fd', fontSize: 12, fontWeight: 800,
                      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                      letterSpacing: '1px',
                    }}>
                      {String(n).padStart(3, '0')}
                    </span>
                  ))}

                  {/* Botón ver más/menos */}
                  {cliente.numeros.length > 8 && (
                    <button
                      onClick={() => setExpandido(isExpanded ? null : cliente.nombre)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {isExpanded ? (
                        <><ChevronUp size={11} /> Menos</>
                      ) : (
                        <><ChevronDown size={11} /> +{cliente.numeros.length - 8} más</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
