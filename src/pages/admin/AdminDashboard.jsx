import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { DollarSign, Ticket, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

function StatCard({ icon: Icon, label, value, subtitle, color = 'purple' }) {
  const colors = {
    purple: 'from-purple-600/30 to-purple-800/20 border-purple-500/20',
    green: 'from-green-600/30 to-green-800/20 border-green-500/20',
    yellow: 'from-yellow-600/30 to-yellow-800/20 border-yellow-500/20',
    red: 'from-red-600/30 to-red-800/20 border-red-500/20',
  };
  const iconColors = { purple: 'text-purple-400', green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400' };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`glass bg-gradient-to-br ${colors[color]} p-6 border`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/50 mb-1">{label}</p>
          <p className="text-3xl font-black text-white">{value}</p>
          {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 ${iconColors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [stats, setStats] = useState({ vendidos: 0, apartados: 0, disponibles: 1000, ingresos: 0 });
  const [liberados, setLiberados] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!currentUser) return;

      // Obtener tienda
      const storeQ = query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid));
      const storeSnap = await getDocs(storeQ);
      if (storeSnap.empty) { setLoading(false); return; }
      const storeData = { id: storeSnap.docs[0].id, ...storeSnap.docs[0].data() };
      setStore(storeData);

      // Obtener tickets
      const ticketQ = query(collection(db, 'tickets'), where('storeId', '==', storeData.id));
      const ticketSnap = await getDocs(ticketQ);
      const tickets = ticketSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stats
      const vendidos = tickets.filter(t => t.estado === 'vendido').length;
      const apartados = tickets.filter(t => t.estado === 'apartado').length;
      const disponibles = 1000 - vendidos - apartados;
      const ingresos = vendidos * (storeData.precio_numero || 0);
      setStats({ vendidos, apartados, disponibles, ingresos });

      // ── Liberación automática (12 horas) ─────────────────────────────
      const hace12h = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const vencidos = tickets.filter(t =>
        t.estado === 'apartado' &&
        t.fecha_apartado?.toDate() < hace12h
      );

      if (vencidos.length > 0) {
        const batch = writeBatch(db);
        vencidos.forEach(t => {
          batch.update(doc(db, 'tickets', t.id), {
            estado: 'disponible',
            cliente_id: null,
            fecha_apartado: null,
          });
        });
        await batch.commit();
        setLiberados(vencidos.length);
        toast.success(`✅ ${vencidos.length} número(s) liberado(s) automáticamente (12h expirado)`);
      }

      setLoading(false);
    };
    init();
  }, [currentUser]);

  const pct = (num) => ((num / 1000) * 100).toFixed(1);

  if (loading) return (
    <div className="flex justify-center py-20"><div className="spinner" /></div>
  );

  if (!store) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🏗️</div>
      <p className="text-white/60 text-lg">Aún no has creado tu tienda.</p>
      <a href="/admin/ajustes" className="btn-primary inline-flex mt-4">Configurar tienda →</a>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">{store.nombre}</h1>
        <p className="text-white/40 text-sm mt-1">Panel de control · Vista general</p>
      </div>

      {/* Alerta de liberación */}
      {liberados > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass bg-green-600/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-300">
            <strong>{liberados} números</strong> fueron liberados automáticamente (apartados hace más de 12 horas).
          </p>
        </motion.div>
      )}

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Ingresos totales"
          value={`$${stats.ingresos.toLocaleString()}`}
          subtitle={`${stats.vendidos} números vendidos`}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="% Vendido"
          value={`${pct(stats.vendidos)}%`}
          subtitle={`${stats.vendidos} de 1.000`}
          color="purple"
        />
        <StatCard
          icon={Clock}
          label="Apartados"
          value={stats.apartados}
          subtitle="Pendientes de pago"
          color="yellow"
        />
        <StatCard
          icon={Ticket}
          label="Disponibles"
          value={stats.disponibles}
          subtitle="Listos para vender"
          color="red"
        />
      </div>

      {/* Barra de progreso */}
      <div className="glass p-6">
        <div className="flex justify-between mb-3">
          <p className="text-sm font-semibold text-white">Progreso de ventas</p>
          <p className="text-sm text-white/50">{stats.vendidos + stats.apartados} / 1.000 ocupados</p>
        </div>
        <div className="h-4 bg-white/10 rounded-full overflow-hidden flex">
          <div
            className="bg-gradient-to-r from-red-500 to-red-600 h-full transition-all duration-700"
            style={{ width: `${pct(stats.vendidos)}%` }}
          />
          <div
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-full transition-all duration-700"
            style={{ width: `${pct(stats.apartados)}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs text-white/50">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Vendidos ({pct(stats.vendidos)}%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Apartados ({pct(stats.apartados)}%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/20 inline-block" />Disponibles ({pct(stats.disponibles)}%)</span>
        </div>
      </div>

      {/* Info sorteo */}
      {store.fecha_sorteo && (
        <div className="glass p-5 flex items-center gap-4">
          <div className="text-3xl">📅</div>
          <div>
            <p className="text-sm text-white/50">Fecha del sorteo</p>
            <p className="text-lg font-bold text-white">
              {new Date(store.fecha_sorteo.seconds * 1000).toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
