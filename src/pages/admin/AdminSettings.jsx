import { useEffect, useState } from 'react';
import {
  collection, query, where, getDocs, doc,
  addDoc, updateDoc, writeBatch, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import {
  Store, Phone, DollarSign, Calendar, Palette, Image,
  Save, ExternalLink, ToggleLeft, ToggleRight, Link,
  Trash2, RefreshCw, AlertTriangle, Timer
} from 'lucide-react';
import toast from 'react-hot-toast';

const S = {
  card: { borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '22px 24px', marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 14px 11px 38px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif' },
  inputNoIcon: { width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif' },
  iconWrap: { position: 'relative' },
  icon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.3)' },
  sectionTitle: { fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 },
};

export default function AdminSettings() {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [form, setForm] = useState({
    nombre: '', whatsapp: '', precio_numero: '', fecha_sorteo: '',
    color_principal: '#7c3aed', activa: true, logo_url: '', mostrar_stats: false,
    mostrar_countdown: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetNombre, setResetNombre] = useState('');

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
          ? new Date(s.fecha_sorteo.seconds * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : '',
        color_principal: s.color_principal || '#7c3aed',
        activa: s.activa ?? true,
        logo_url: s.logo_url || '',
        mostrar_stats: s.mostrar_stats ?? false,
        mostrar_countdown: s.mostrar_countdown ?? false,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchStore(); }, [currentUser]);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const focus = (e) => { e.target.style.borderColor = form.color_principal || '#7c3aed'; };
  const blur = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; };

  /* ── Inicializar 1000 tickets en batches de 400 ─── */
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

  /* ── Guardar / crear tienda ───────────────────── */
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
        mostrar_stats: form.mostrar_stats ?? false,
        mostrar_countdown: form.mostrar_countdown ?? false,
        ownerId: currentUser.uid,
        logo_url: form.logo_url || '',
        updatedAt: serverTimestamp(),
      };
      if (store) {
        await updateDoc(doc(db, 'stores', store.id), data);
        toast.success('¡Ajustes guardados!');
      } else {
        data.createdAt = serverTimestamp();
        const newStore = await addDoc(collection(db, 'stores'), data);
        setStore({ id: newStore.id, ...data });
        toast.loading('Generando 1.000 números...', { id: 'init' });
        await initTickets1000(newStore.id);
        toast.dismiss('init');
        toast.success('🎉 ¡Tienda creada con 1.000 números!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar. Revisa tu conexión.');
    } finally { setSaving(false); }
  };

  /* ── Reiniciar rifa (todos los tickets → disponible) */
  const resetRifa = async () => {
    if (!store) return;
    setResetting(true);
    try {
      toast.loading('Reiniciando todos los números...', { id: 'reset' });
      await initTickets1000(store.id);

      // Actualizar nombre y fecha si se indicaron
      const updates = { updatedAt: serverTimestamp(), fecha_sorteo: null };
      if (resetNombre.trim()) updates.nombre = resetNombre.trim();
      await updateDoc(doc(db, 'stores', store.id), updates);

      toast.dismiss('reset');
      toast.success('✅ ¡Rifa reiniciada! Todos los números están disponibles.');
      setShowResetConfirm(false);
      setResetNombre('');
      await fetchStore();
    } catch (err) {
      console.error(err);
      toast.dismiss('reset');
      toast.error('Error al reiniciar. Intenta de nuevo.');
    } finally { setResetting(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 700, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 4 }}>Configuración</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0 }}>Ajustes de tienda</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{store ? 'Edita la configuración de tu rifa' : 'Crea tu primera tienda'}</p>
        </div>
        {store && (
          <a href={`/tienda/${store.id}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <ExternalLink size={14} /> Ver tienda pública
          </a>
        )}
      </div>

      <form onSubmit={submit}>

        {/* Logo */}
        <div style={S.card}>
          <div style={S.sectionTitle}><Image size={16} color="#a78bfa" /> Logo de la tienda</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 16, border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {form.logo_url
                ? <img src={form.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                : <span style={{ fontSize: 28 }}>🎰</span>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>URL del logo</label>
              <div style={S.iconWrap}>
                <Link size={14} style={S.icon} />
                <input name="logo_url" type="url" value={form.logo_url} onChange={handle}
                  placeholder="https://i.imgur.com/tu-logo.png"
                  style={S.input} onFocus={focus} onBlur={blur} />
              </div>
              <p style={S.hint}>Sube tu imagen a <a href="https://imgur.com/upload" target="_blank" rel="noreferrer" style={{ color: '#a78bfa' }}>Imgur.com</a> y pega la URL aquí.</p>
            </div>
          </div>
        </div>

        {/* Datos principales */}
        <div style={S.card}>
          <div style={S.sectionTitle}><Store size={16} color="#a78bfa" /> Información de la rifa</div>

          <label style={S.label}>Nombre de la rifa *</label>
          <div style={{ ...S.iconWrap, marginBottom: 14 }}>
            <Store size={14} style={S.icon} />
            <input name="nombre" type="text" required value={form.nombre} onChange={handle}
              placeholder="Ej: Rifas Jhon" style={S.input} onFocus={focus} onBlur={blur} />
          </div>

          <label style={S.label}>WhatsApp del organizador *</label>
          <div style={{ ...S.iconWrap, marginBottom: 5 }}>
            <Phone size={14} style={S.icon} />
            <input name="whatsapp" type="tel" required value={form.whatsapp} onChange={handle}
              placeholder="+57 300 000 0000" style={S.input} onFocus={focus} onBlur={blur} />
          </div>
          <p style={{ ...S.hint, marginBottom: 14 }}>Código de país + número (ej: 573001234567)</p>

          <label style={S.label}>Precio por número *</label>
          <div style={{ ...S.iconWrap, marginBottom: 14 }}>
            <DollarSign size={14} style={S.icon} />
            <input name="precio_numero" type="number" required min="0" value={form.precio_numero} onChange={handle}
              placeholder="5000" style={S.input} onFocus={focus} onBlur={blur} />
          </div>

          {/* Fecha sorteo — OPCIONAL */}
          <label style={S.label}>
            Fecha y hora del sorteo <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>(opcional — déjala vacía si no tienes fecha definida)</span>
          </label>
          <div style={{ ...S.iconWrap, marginBottom: 14 }}>
            <Calendar size={14} style={S.icon} />
            <input name="fecha_sorteo" type="datetime-local" value={form.fecha_sorteo} onChange={handle}
              style={S.input} onFocus={focus} onBlur={blur} />
          </div>

          {/* Color */}
          <label style={S.label}>Color de la tienda</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ ...S.iconWrap, flex: 1 }}>
              <Palette size={14} style={S.icon} />
              <input name="color_principal" type="text" value={form.color_principal} onChange={handle}
                placeholder="#7c3aed" style={{ ...S.input, paddingRight: 14 }} onFocus={focus} onBlur={blur} />
            </div>
            <input type="color" value={form.color_principal}
              onChange={e => setForm(p => ({ ...p, color_principal: e.target.value }))}
              style={{ width: 44, height: 44, borderRadius: 10, border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'transparent', padding: 2 }} />
            <div style={{ width: 44, height: 44, borderRadius: 10, background: form.color_principal }} />
          </div>

          {/* Toggle activa */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>Tienda activa</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Visible en la página pública de catálogo</div>
            </div>
            <button type="button" onClick={() => setForm(p => ({ ...p, activa: !p.activa }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {form.activa
                ? <ToggleRight size={38} color="#a78bfa" />
                : <ToggleLeft size={38} color="rgba(255,255,255,0.2)" />}
            </button>
          </div>

          {/* Toggle mostrar_stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>Mostrar estadísticas al cliente</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Si está activo, el cliente verá cuántos números están disponibles, apartados y vendidos</div>
            </div>
            <button type="button" onClick={() => setForm(p => ({ ...p, mostrar_stats: !p.mostrar_stats }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {form.mostrar_stats
                ? <ToggleRight size={38} color="#a78bfa" />
                : <ToggleLeft size={38} color="rgba(255,255,255,0.2)" />}
            </button>
          </div>

          {/* Toggle mostrar_countdown */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Timer size={15} color="#a78bfa" /> Mostrar conteo regresivo
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Si está activo, los clientes verán la cuenta regresiva con los días, horas, minutos y segundos para el sorteo</div>
            </div>
            <button type="button" onClick={() => setForm(p => ({ ...p, mostrar_countdown: !p.mostrar_countdown }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {form.mostrar_countdown
                ? <ToggleRight size={38} color="#a78bfa" />
                : <ToggleLeft size={38} color="rgba(255,255,255,0.2)" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginBottom: 28 }}>
          {saving
            ? <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
            : <><Save size={18} /> {store ? 'Guardar cambios' : 'Crear tienda con 1.000 números'}</>}
        </button>
      </form>

      {/* ── ZONA DE PELIGRO: REINICIAR RIFA ──────── */}
      {store && (
        <div style={{ borderRadius: 18, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)', padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RefreshCw size={18} color="#f87171" />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'white', fontSize: 15 }}>Reiniciar rifa</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 3, lineHeight: 1.5 }}>
                Pone todos los 1.000 números en estado <strong style={{ color: 'white' }}>disponible</strong> y borra los datos de clientes. Ideal para iniciar una nueva rifa con la misma tienda.
              </div>
            </div>
          </div>

          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}>
              <RefreshCw size={15} /> Reiniciar todos los números
            </button>
          ) : (
            <div style={{ borderRadius: 14, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <AlertTriangle size={16} color="#f87171" />
                <span style={{ fontWeight: 800, color: '#f87171', fontSize: 14 }}>¿Estás seguro? Esta acción no se puede deshacer.</span>
              </div>

              <label style={{ ...S.label, color: 'rgba(255,255,255,0.6)' }}>
                Nuevo nombre de la rifa <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(opcional — déjalo vacío para mantener el actual)</span>
              </label>
              <input value={resetNombre} onChange={e => setResetNombre(e.target.value)}
                placeholder={`Ej: ${form.nombre} — Edición 2`}
                style={{ ...S.inputNoIcon, marginBottom: 14, border: '1px solid rgba(239,68,68,0.3)' }} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowResetConfirm(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={resetRifa} disabled={resetting}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', fontWeight: 800, fontSize: 14, cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.7 : 1 }}>
                  {resetting
                    ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
                    : <><Trash2 size={15} /> Sí, reiniciar la rifa</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
