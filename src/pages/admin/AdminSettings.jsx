import { useEffect, useState } from 'react';
import {
  collection, query, where, getDocs, doc,
  addDoc, updateDoc, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import {
  Store, Phone, DollarSign, Calendar, Palette, Image,
  Save, ExternalLink, ToggleLeft, ToggleRight, Link
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [form, setForm] = useState({
    nombre: '', whatsapp: '', precio_numero: '', fecha_sorteo: '',
    color_principal: '#7c3aed', activa: true, logo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStore = async () => {
      if (!currentUser) return;
      const q = query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const s = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setStore(s);
        setForm({
          nombre: s.nombre || '',
          whatsapp: s.whatsapp || '',
          precio_numero: s.precio_numero || '',
          fecha_sorteo: s.fecha_sorteo?.seconds
            ? new Date(s.fecha_sorteo.seconds * 1000).toISOString().split('T')[0]
            : '',
          color_principal: s.color_principal || '#7c3aed',
          activa: s.activa ?? true,
          logo_url: s.logo_url || '',
        });
      }
      setLoading(false);
    };
    fetchStore();
  }, [currentUser]);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };



  // Inicializa los 1000 tickets para una tienda nueva
  const initTickets = async (storeId) => {
    const batch = writeBatch(db);
    for (let i = 1; i <= 1000; i++) {
      const ticketId = `${storeId}_${String(i).padStart(3, '0')}`;
      const ticketRef = doc(db, 'tickets', ticketId);
      batch.set(ticketRef, {
        storeId, numero: i, estado: 'disponible',
        cliente_id: null, fecha_apartado: null, cliente_nombre: null,
      }, { merge: true });
      // Commit en bloques de 400 (límite Firestore = 500 por batch)
      if (i % 400 === 0) {
        await batch.commit();
        // Nota: writeBatch no se puede reusar, necesitamos uno nuevo
        // Solución: usamos setDoc individual para el resto
      }
    }
    // Hacemos el último commit
    try { await batch.commit(); } catch { /* ya fue committed */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        nombre: form.nombre,
        whatsapp: form.whatsapp,
        precio_numero: Number(form.precio_numero) || 0,
        fecha_sorteo: form.fecha_sorteo ? new Date(form.fecha_sorteo) : null,
        color_principal: form.color_principal,
        activa: form.activa,
        ownerId: currentUser.uid,
        logo_url: form.logo_url || '',
        updatedAt: serverTimestamp(),
      };

      if (store) {
        // Actualizar tienda existente
        await updateDoc(doc(db, 'stores', store.id), data);
        toast.success('¡Tienda actualizada!');
      } else {
        // Crear nueva tienda
        data.createdAt = serverTimestamp();
        const newStore = await addDoc(collection(db, 'stores'), data);
        setStore({ id: newStore.id, ...data });

        // Inicializar 1000 tickets en lotes
        toast.loading('Inicializando 1.000 números...', { id: 'init' });
        await initTickets1000(newStore.id);
        toast.dismiss('init');
        toast.success('🎉 ¡Tienda creada con 1.000 números!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar. Verifica tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  // Inicialización más robusta en múltiples batches
  async function initTickets1000(storeId) {
    const BATCH_SIZE = 400;
    for (let start = 1; start <= 1000; start += BATCH_SIZE) {
      const batch = writeBatch(db);
      const end = Math.min(start + BATCH_SIZE - 1, 1000);
      for (let i = start; i <= end; i++) {
        const ticketId = `${storeId}_${String(i).padStart(3, '0')}`;
        batch.set(doc(db, 'tickets', ticketId), {
          storeId, numero: i, estado: 'disponible',
          cliente_id: null, fecha_apartado: null, cliente_nombre: null,
        });
      }
      await batch.commit();
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Ajustes de tienda</h1>
          <p className="text-white/40 text-sm mt-1">{store ? 'Edita la configuración de tu rifa' : 'Crea tu primera tienda'}</p>
        </div>
        {store && (
          <a href={`/tienda/${store.id}`} target="_blank" rel="noopener noreferrer"
            className="btn-secondary text-sm py-2 px-3 gap-1.5">
            <ExternalLink className="w-4 h-4" />
            Ver tienda
          </a>
        )}
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Logo por URL */}
        <div className="glass p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Image className="w-4 h-4 text-purple-400" /> Logo de la tienda
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 flex items-center justify-center bg-white/5 flex-shrink-0">
              {form.logo_url
                ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display='none'; }}/>
                : <span className="text-3xl">🎰</span>
              }
            </div>
            <div className="flex-1">
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  name="logo_url"
                  type="url"
                  value={form.logo_url}
                  onChange={handle}
                  placeholder="https://i.imgur.com/tu-logo.png"
                  className="input-glass pl-10"
                />
              </div>
              <p className="text-xs text-white/30 mt-2">
                Sube tu logo a <a href="https://imgur.com/upload" target="_blank" rel="noreferrer" className="text-purple-400 underline">Imgur.com</a> (gratis) y pega la URL aquí.
              </p>
            </div>
          </div>
        </div>

        {/* Datos principales */}
        <div className="glass p-5 space-y-4">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Store className="w-4 h-4 text-purple-400" /> Información de la rifa
          </h2>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Nombre de la rifa *</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input name="nombre" type="text" required value={form.nombre} onChange={handle}
                placeholder="Ej: Rifas Jhon" className="input-glass pl-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">WhatsApp del rifero *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input name="whatsapp" type="tel" required value={form.whatsapp} onChange={handle}
                placeholder="+57 300 000 0000" className="input-glass pl-10" />
            </div>
            <p className="text-xs text-white/30 mt-1">Número completo con código de país (ej: 573001234567)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Precio por número *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input name="precio_numero" type="number" required min="0" value={form.precio_numero} onChange={handle}
                placeholder="5000" className="input-glass pl-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Fecha del sorteo *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input name="fecha_sorteo" type="date" required value={form.fecha_sorteo} onChange={handle}
                className="input-glass pl-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Color principal de la tienda</label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input name="color_principal" type="text" value={form.color_principal} onChange={handle}
                  placeholder="#7c3aed" className="input-glass pl-10 w-40" />
              </div>
              <input type="color" value={form.color_principal}
                onChange={(e) => setForm(prev => ({ ...prev, color_principal: e.target.value }))}
                className="w-12 h-12 rounded-xl border-2 border-white/10 cursor-pointer bg-transparent" />
              <div className="w-12 h-12 rounded-xl" style={{ background: form.color_principal }} />
            </div>
          </div>

          {/* Toggle activo */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="font-medium text-white">Tienda activa</p>
              <p className="text-xs text-white/40">Visible en la página pública</p>
            </div>
            <button type="button" onClick={() => setForm(prev => ({ ...prev, activa: !prev.activa }))}>
              {form.activa
                ? <ToggleRight className="w-10 h-10 text-purple-400" />
                : <ToggleLeft className="w-10 h-10 text-white/30" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center text-base py-4">
          {saving ? (
            <span className="spinner w-5 h-5 border-2" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              {store ? 'Guardar cambios' : 'Crear tienda y generar 1.000 números'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
