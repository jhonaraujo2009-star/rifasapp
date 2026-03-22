import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { Search, Phone, CreditCard, MapPin, Ticket } from 'lucide-react';

export default function AdminCustomers() {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!currentUser) return;
      const sq = query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid));
      const ss = await getDocs(sq);
      if (ss.empty) { setLoading(false); return; }
      const storeData = { id: ss.docs[0].id, ...ss.docs[0].data() };
      setStore(storeData);

      const cq = query(collection(db, 'customers'), where('storeId', '==', storeData.id));
      const cs = await getDocs(cq);
      setCustomers(cs.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    init();
  }, [currentUser]);

  const filtrados = customers.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda) ||
    c.cedula?.includes(busqueda)
  );

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">CRM de Clientes</h1>
          <p className="text-white/40 text-sm mt-1">{customers.length} clientes registrados</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="glass p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono o cédula..."
            className="input-glass pl-10"
          />
        </div>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-white/40">
            {busqueda ? 'No encontramos clientes con esa búsqueda' : 'Aún no hay clientes registrados'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="glass overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contacto</th>
                    <th>Cédula</th>
                    <th>Números</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="font-semibold text-white">{c.nombre}</div>
                        {c.direccion && <div className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{c.direccion}
                        </div>}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Phone className="w-3 h-3 text-green-400" />
                          <a href={`tel:${c.telefono}`} className="text-green-400 hover:underline">{c.telefono}</a>
                        </div>
                      </td>
                      <td>{c.cedula || <span className="text-white/20">—</span>}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(c.numeros || []).map(n => (
                            <span key={n} className="badge badge-purple text-xs">{String(n).padStart(3, '0')}</span>
                          ))}
                        </div>
                      </td>
                      <td className="text-white/40 text-xs">
                        {c.createdAt?.toDate
                          ? c.createdAt.toDate().toLocaleDateString('es-ES')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile  */}
          <div className="space-y-3 md:hidden">
            {filtrados.map((c) => (
              <div key={c.id} className="glass p-4 space-y-2">
                <div className="font-bold text-white">{c.nombre}</div>
                <div className="flex items-center gap-1.5 text-sm text-green-400">
                  <Phone className="w-3 h-3" />{c.telefono}
                </div>
                {c.cedula && <div className="flex items-center gap-1.5 text-sm text-white/50">
                  <CreditCard className="w-3 h-3" />{c.cedula}
                </div>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {(c.numeros || []).map(n => (
                    <span key={n} className="badge badge-purple text-xs">{String(n).padStart(3, '0')}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
