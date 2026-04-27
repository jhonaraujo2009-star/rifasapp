import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import {
  DollarSign, Ticket, TrendingUp, Clock,
  CheckCircle, AlertCircle, Calendar, Settings, ArrowRight, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import PrintAvailableNumbers from '../../components/PrintAvailableNumbers';

function StatCard({ icon: Icon, label, value, subtitle, accentColor, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      style={{
        borderRadius: 18, padding: '20px 22px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Glow del color */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'white', lineHeight: 1 }}>{value}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{subtitle}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: `${accentColor}20`, border: `1px solid ${accentColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={accentColor} />
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ vendidos: 0, apartados: 0, disponibles: 1000, ingresos: 0 });
  const [liberados, setLiberados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!currentUser) return;
      try {
        const storeSnap = await getDocs(query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid)));
        if (storeSnap.empty) { setLoading(false); return; }
        const storeData = { id: storeSnap.docs[0].id, ...storeSnap.docs[0].data() };
        setStore(storeData);

        const ticketSnap = await getDocs(query(collection(db, 'tickets'), where('storeId', '==', storeData.id)));
        const allTickets = ticketSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTickets(allTickets);

        const vendidos = allTickets.filter(t => t.estado === 'vendido').length;
        const apartados = allTickets.filter(t => t.estado === 'apartado').length;
        const disponibles = 1000 - vendidos - apartados;
        const ingresos = vendidos * (storeData.precio_numero || 0);
        setStats({ vendidos, apartados, disponibles, ingresos });

        // Liberación automática (>12h)
        const hace12h = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const vencidos = allTickets.filter(t => t.estado === 'apartado' && t.fecha_apartado?.toDate() < hace12h);
        if (vencidos.length > 0) {
          const batch = writeBatch(db);
          vencidos.forEach(t => batch.update(doc(db, 'tickets', t.id), { estado: 'disponible', cliente_id: null, fecha_apartado: null }));
          await batch.commit();
          setLiberados(vencidos.length);
          toast.success(`✅ ${vencidos.length} números liberados automáticamente`);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    init();
  }, [currentUser]);

  const pct = (n) => ((n / 1000) * 100).toFixed(1);
  const precio = store?.precio_numero || 0;

  // Números disponibles para imprimir
  const numerosDisponibles = useMemo(() => {
    const ocupados = new Set(tickets.filter(t => t.estado === 'vendido' || t.estado === 'apartado').map(t => t.numero));
    return Array.from({ length: 1000 }, (_, i) => i + 1).filter(n => !ocupados.has(n));
  }, [tickets]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Cargando tu panel...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!store) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Settings size={32} color="#a78bfa" />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 6 }}>¡Configura tu tienda!</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 340 }}>Aún no has creado tu rifa. En menos de 2 minutos la tienes lista.</div>
      </div>
      <Link to="/admin/ajustes" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
        <Settings size={16} /> Crear mi tienda <ArrowRight size={14} />
      </Link>
    </div>
  );

  const fechaStr = store.fecha_sorteo
    ? new Date(store.fecha_sorteo.seconds * 1000).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 4 }}>Panel de control</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0 }}>{store.nombre}</h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Vista general de tu rifa</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowPrint(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}>
            <Printer size={14} /> Imprimir números
          </button>
          <Link to="/admin/grilla" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <Ticket size={14} /> Inventario
          </Link>
          <Link to="/admin/ajustes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            <Settings size={14} /> Ajustes
          </Link>
        </div>
      </motion.div>

      {/* Alerta de liberación */}
      {liberados > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle size={18} color="#34d399" />
          <div style={{ fontSize: 13, color: '#6ee7b7' }}>
            <strong>{liberados} números</strong> fueron liberados automáticamente (apartados hace más de 12h).
          </div>
        </motion.div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        <StatCard icon={DollarSign} label="Ingresos totales" value={`$${stats.ingresos.toLocaleString()}`} subtitle={`${stats.vendidos} números confirmados`} accentColor="#10b981" delay={0} />
        <StatCard icon={TrendingUp} label="Progreso vendido" value={`${pct(stats.vendidos)}%`} subtitle={`${stats.vendidos} de 1.000`} accentColor="#7c3aed" delay={0.05} />
        <StatCard icon={Clock} label="Apartados" value={stats.apartados} subtitle="Pendientes de confirmar" accentColor="#f59e0b" delay={0.1} />
        <StatCard icon={Ticket} label="Disponibles" value={stats.disponibles} subtitle="Listos para vender" accentColor="#3b82f6" delay={0.15} />
      </div>

      {/* Barra de progreso */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ borderRadius: 18, padding: '22px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, color: 'white', fontSize: 15 }}>Progreso de ventas</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{stats.vendidos + stats.apartados} / 1.000 ocupados</div>
        </div>
        <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct(stats.vendidos)}%` }} transition={{ duration: 1, ease: 'easeOut' }}
            style={{ background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: 99 }} />
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct(stats.apartados)}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
            style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
          {[
            { color: '#10b981', label: 'Vendidos', val: `${pct(stats.vendidos)}%` },
            { color: '#f59e0b', label: 'Apartados', val: `${pct(stats.apartados)}%` },
            { color: 'rgba(255,255,255,0.15)', label: 'Disponibles', val: `${pct(stats.disponibles)}%` },
          ].map(({ color, label, val }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block', flexShrink: 0 }} />
              {label} <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{val}</strong>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Resumen financiero + fecha */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {/* Potencial máximo */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ borderRadius: 18, padding: '20px 22px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Potencial máximo</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#a78bfa' }}>${(1000 * precio).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Si se venden los 1.000 números</div>
          <div style={{ marginTop: 14, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Recaudado</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>${stats.ingresos.toLocaleString()}</span>
          </div>
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Pendiente</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>${(stats.apartados * precio).toLocaleString()}</span>
          </div>
        </motion.div>

        {/* Fecha sorteo */}
        {fechaStr && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            style={{ borderRadius: 18, padding: '20px 22px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={15} color="#a78bfa" />
                </div>
                <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Fecha del sorteo</div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.3, textTransform: 'capitalize' }}>{fechaStr}</div>
            </div>
            <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 10, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertCircle size={13} color="#c4b5fd" />
              <span style={{ fontSize: 11, color: '#c4b5fd' }}>Los números apartados se liberan a las 12h</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Accesos rápidos */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Acciones rápidas</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {[
            { to: '/admin/grilla', icon: Ticket, label: 'Gestionar números', color: '#7c3aed' },
            { to: '/admin/clientes', icon: AlertCircle, label: 'Ver clientes', color: '#3b82f6' },
            { to: '/admin/exportar', icon: TrendingUp, label: 'Exportar datos', color: '#10b981' },
            { to: '/admin/ajustes', icon: Settings, label: 'Configurar tienda', color: '#f59e0b' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div style={{ borderRadius: 14, padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = `${color}35`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} color={color} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Modal de impresión */}
      {showPrint && (
        <PrintAvailableNumbers
          disponibles={numerosDisponibles}
          storeName={store.nombre}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}
