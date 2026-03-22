import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { X, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const ESTADOS = ['disponible', 'apartado', 'vendido'];
const COLORES = { disponible: 'badge-purple', apartado: 'badge-yellow', vendido: 'badge-green' };

function TicketModal({ ticket, storeId, onClose, onUpdated }) {
  const [estado, setEstado] = useState(ticket?.estado || 'disponible');
  const [loading, setLoading] = useState(false);

  const guardar = async () => {
    setLoading(true);
    try {
      const ticketId = `${storeId}_${String(ticket.numero).padStart(3, '0')}`;
      await updateDoc(doc(db, 'tickets', ticketId), { estado });
      toast.success(`Número ${ticket.numero} → ${estado}`);
      onUpdated();
      onClose();
    } catch (e) {
      toast.error('Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="modal-content max-w-sm"
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Número {String(ticket.numero).padStart(3, '0')}</h3>
              <p className="text-sm text-white/40">{ticket.cliente_nombre ? `Cliente: ${ticket.cliente_nombre}` : 'Sin cliente asignado'}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-white/60 mb-3 font-medium">Cambiar estado:</p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {ESTADOS.map((e) => (
              <button
                key={e}
                onClick={() => setEstado(e)}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all capitalize ${estado === e
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
              >
                {e}
              </button>
            ))}
          </div>

          <button onClick={guardar} disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <span className="spinner w-5 h-5 border-2" /> : 'Guardar cambio'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminGrid() {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    const sq = query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid));
    const ss = await getDocs(sq);
    if (ss.empty) { setLoading(false); return; }
    const storeData = { id: ss.docs[0].id, ...ss.docs[0].data() };
    setStore(storeData);

    const tq = query(collection(db, 'tickets'), where('storeId', '==', storeData.id));
    const ts = await getDocs(tq);
    const loadedTickets = ts.docs.map(d => ({ id: d.id, ...d.data() }));
    setTickets(loadedTickets);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Construye mapa rápido de tickets
  const estadoMap = Object.fromEntries(tickets.map(t => [t.numero, t]));

  const numeros = Array.from({ length: 1000 }, (_, i) => i + 1).filter((n) => {
    const t = estadoMap[n];
    const estado = t?.estado || 'disponible';
    if (filtroEstado !== 'todos' && estado !== filtroEstado) return false;
    if (busqueda && !String(n).padStart(3, '0').includes(busqueda)) return false;
    return true;
  });

  const getClase = (numero) => {
    const t = estadoMap[numero];
    const estado = t?.estado || 'disponible';
    return { disponible: 'numero-disponible', apartado: 'numero-apartado', vendido: 'numero-vendido' }[estado];
  };

  const handleClick = (numero) => {
    const t = estadoMap[numero] || { numero, estado: 'disponible' };
    setSelected(t);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Inventario de números</h1>
        <p className="text-white/40 text-sm mt-1">Haz clic en cualquier número para cambiar su estado</p>
      </div>

      {/* Filtros */}
      <div className="glass p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="number" min="1" max="1000" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar número..." className="input-glass pl-10 py-2.5" />
          </div>
          <div className="flex gap-2">
            {['todos', 'disponible', 'apartado', 'vendido'].map(f => (
              <button key={f} onClick={() => setFiltroEstado(f)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${filtroEstado === f ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 text-xs text-white/50">
          <span>Total: {numeros.length} números</span>
          {['disponible', 'apartado', 'vendido'].map(e => (
            <span key={e}>{e}: {tickets.filter(t => t.estado === e).length}</span>
          ))}
        </div>
      </div>

      {/* Grilla*/}
      <div className="glass p-4">
        <div className="numero-grid">
          {numeros.map((numero) => (
            <button
              key={numero}
              onClick={() => handleClick(numero)}
              className={`numero-cell ${getClase(numero)} cursor-pointer`}
              title={`#${numero} - ${estadoMap[numero]?.estado || 'disponible'}${estadoMap[numero]?.cliente_nombre ? ` (${estadoMap[numero].cliente_nombre})` : ''}`}
            >
              {String(numero).padStart(3, '0')}
            </button>
          ))}
        </div>
      </div>

      {/* Modal de edición */}
      {selected && store && (
        <TicketModal
          ticket={selected}
          storeId={store.id}
          onClose={() => setSelected(null)}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}
