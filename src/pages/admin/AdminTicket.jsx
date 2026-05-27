import { useEffect, useState, useRef } from 'react';
import {
  collection, query, where, getDocs
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import {
  Ticket, User, Hash, Plus, X, Download, Eye, Sparkles, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas-pro';

/* ── Estilos base ────────────────────────────────────── */
const S = {
  card: {
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    padding: '22px 24px',
    marginBottom: 16,
  },
  label: {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'rgba(255,255,255,0.55)', marginBottom: 8,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px 12px 42px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white', fontSize: 14, outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
  },
  inputNoIcon: {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white', fontSize: 14, outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
  },
  iconWrap: { position: 'relative' },
  icon: {
    position: 'absolute', left: 14, top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none',
    color: 'rgba(255,255,255,0.3)',
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 800, color: 'white',
    marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8,
  },
};

export default function AdminTicket() {
  const { currentUser } = useAuth();
  const ticketRef = useRef(null);

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [numInput, setNumInput] = useState('');
  const [numeros, setNumeros] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    getDocs(query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid)))
      .then(snap => {
        if (!snap.empty) {
          setStore({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
        setLoading(false);
      });
  }, [currentUser]);

  const focus = (e) => { e.target.style.borderColor = '#a78bfa'; };
  const blur = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; };

  /* ── Agregar números ──────────────────────────── */
  const addNumeros = () => {
    if (!numInput.trim()) return;
    // Parsear entrada: acepta comas, espacios, guiones
    const parsed = numInput
      .split(/[\s,;]+/)
      .map(n => n.trim())
      .filter(n => n !== '' && !isNaN(n))
      .map(n => parseInt(n, 10))
      .filter(n => n >= 0 && n <= 999);

    const unique = [...new Set([...numeros, ...parsed])].sort((a, b) => a - b);
    setNumeros(unique);
    setNumInput('');
  };

  const removeNumero = (num) => {
    setNumeros(prev => prev.filter(n => n !== num));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNumeros();
    }
  };

  /* ── Generar preview ──────────────────────────── */
  const generatePreview = () => {
    if (!nombre.trim()) {
      toast.error('Ingresa el nombre del comprador');
      return;
    }
    if (numeros.length === 0) {
      toast.error('Agrega al menos un número');
      return;
    }
    setShowPreview(true);
  };

  /* ── Guardar como imagen ──────────────────────── */
  const saveTicket = async () => {
    if (!ticketRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `ticket_${nombre.replace(/\s+/g, '_')}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('✅ Ticket guardado como imagen');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el ticket');
    } finally {
      setSaving(false);
    }
  };

  /* ── Reset ──────────────────────────────────────── */
  const resetForm = () => {
    setNombre('');
    setNumeros([]);
    setNumInput('');
    setShowPreview(false);
  };

  const rifaName = store?.nombre || 'Rifa Activa';

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
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 4 }}>Herramientas</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0 }}>Ticket Virtual</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
            Genera tickets para enviar a tus compradores
          </p>
        </div>
      </div>

      {/* ── Rifa activa ────────────────────────── */}
      <div style={{ ...S.card, background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(79,70,229,0.08))', border: '1px solid rgba(124,58,237,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
            <Ticket size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Rifa activa</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#c4b5fd' }}>{rifaName}</div>
          </div>
        </div>
      </div>

      {/* ── Formulario ─────────────────────────── */}
      <div style={S.card}>
        <div style={S.sectionTitle}><User size={16} color="#a78bfa" /> Datos del comprador</div>

        <label style={S.label}>Nombre del comprador *</label>
        <div style={{ ...S.iconWrap, marginBottom: 18 }}>
          <User size={14} style={S.icon} />
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
            style={S.input}
            onFocus={focus}
            onBlur={blur}
          />
        </div>

        <label style={S.label}>Números comprados *</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ ...S.iconWrap, flex: 1 }}>
            <Hash size={14} style={S.icon} />
            <input
              type="text"
              value={numInput}
              onChange={(e) => setNumInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: 45, 123, 007"
              style={S.input}
              onFocus={focus}
              onBlur={blur}
            />
          </div>
          <button
            type="button"
            onClick={addNumeros}
            style={{
              padding: '0 16px', borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: 'white', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap',
              transition: 'transform 0.15s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={16} /> Agregar
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 0, marginBottom: 14 }}>
          Separa los números con comas o espacios. Presiona Enter o clic en Agregar.
        </p>

        {/* ── Números agregados ────────────────── */}
        {numeros.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
              {numeros.length} número{numeros.length !== 1 ? 's' : ''} agregado{numeros.length !== 1 ? 's' : ''}:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {numeros.map(num => (
                <div key={num} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px 6px 12px', borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.15))',
                  border: '1px solid rgba(124,58,237,0.3)',
                  fontSize: 14, fontWeight: 700, color: '#c4b5fd',
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                }}>
                  {String(num).padStart(3, '0')}
                  <button
                    onClick={() => removeNumero(num)}
                    style={{
                      width: 18, height: 18, borderRadius: 6,
                      background: 'rgba(239,68,68,0.2)', border: 'none',
                      color: '#f87171', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0, fontSize: 10,
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Botones de acción ──────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          onClick={generatePreview}
          style={{
            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: 'white', fontWeight: 800, fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(124,58,237,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,58,237,0.35)'; }}
        >
          <Eye size={18} /> Vista previa del ticket
        </button>
        {showPreview && (
          <button
            onClick={resetForm}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={15} /> Nuevo
          </button>
        )}
      </div>

      {/* ── PREVIEW DEL TICKET ─────────────────── */}
      {showPreview && (
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} color="#a78bfa" /> Vista previa
          </div>

          {/* Ticket card */}
          <div
            ref={ticketRef}
            style={{
              width: '100%',
              maxWidth: 420,
              margin: '0 auto',
              fontFamily: 'Inter, sans-serif',
              position: 'relative',
              borderRadius: 18,
              overflow: 'hidden',
              boxShadow: '0 4px 30px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ background: '#ffffff', position: 'relative' }}>

              {/* ── HEADER ─────────────────────────────── */}
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                padding: '22px 24px 20px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Decorative subtle circles */}
                <div style={{
                  position: 'absolute', top: -20, right: -20,
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', bottom: -15, left: -15,
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
                }} />

                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: 'rgba(255,255,255,0.65)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.25em',
                  marginBottom: 8,
                  position: 'relative',
                }}>
                  Comprobante de Compra
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 900,
                  color: '#ffffff',
                  lineHeight: 1.2,
                  letterSpacing: '-0.3px',
                  position: 'relative',
                }}>
                  {rifaName}
                </div>
              </div>

              {/* ── INFO SECTION ───────────────────────── */}
              <div style={{ padding: '20px 24px 0' }}>

                {/* Comprador */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Comprador
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', textAlign: 'right', maxWidth: '60%' }}>
                    {nombre}
                  </span>
                </div>

                {/* Fecha */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Fecha
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#444' }}>
                    {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                {/* Cantidad */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Cantidad
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#7c3aed',
                    background: '#f3f0ff', padding: '4px 12px', borderRadius: 6,
                  }}>
                    {numeros.length} {numeros.length === 1 ? 'número' : 'números'}
                  </span>
                </div>
              </div>

              {/* ── NOTCH DIVIDER ──────────────────────── */}
              <div style={{ position: 'relative', height: 28, margin: '8px 0' }}>
                <div style={{
                  position: 'absolute', left: 28, right: 28, top: '50%',
                  borderTop: '2px dashed #e0e0e0',
                }} />
                <div style={{
                  position: 'absolute', left: -14, top: 0,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#060612',
                }} />
                <div style={{
                  position: 'absolute', right: -14, top: 0,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#060612',
                }} />
              </div>

              {/* ── NUMBERS ────────────────────────────── */}
              <div style={{ padding: '0 24px 22px' }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#aaa',
                  textTransform: 'uppercase', letterSpacing: '0.18em',
                  marginBottom: 14, textAlign: 'center',
                }}>
                  Tus Números
                </div>

                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 10,
                  justifyContent: 'center',
                  padding: '18px 14px',
                  borderRadius: 14,
                  background: '#faf9ff',
                  border: '1px solid #ede9fe',
                }}>
                  {numeros.map(num => (
                    <div key={num} style={{
                      minWidth: 54, padding: '10px 14px',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: '#ffffff',
                      fontSize: 18, fontWeight: 900,
                      textAlign: 'center',
                      fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
                      letterSpacing: '2px',
                      boxShadow: '0 3px 10px rgba(124,58,237,0.25)',
                    }}>
                      {String(num).padStart(3, '0')}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── FOOTER ─────────────────────────────── */}
              <div style={{
                padding: '14px 24px 16px',
                borderTop: '1px solid #f0f0f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px',
                  borderRadius: 8,
                  background: '#ecfdf5',
                  border: '1px solid #d1fae5',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Confirmado</span>
                </div>
              </div>

              {/* ── BOTTOM ACCENT ────────────────────── */}
              <div style={{
                height: 5,
                background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)',
              }} />
            </div>
          </div>

          {/* ── Botón guardar ──────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <button
              onClick={saveTicket}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '14px 32px', borderRadius: 14, border: 'none',
                background: saving
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white', fontWeight: 800, fontSize: 15,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 24px rgba(16,185,129,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                opacity: saving ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(16,185,129,0.5)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(16,185,129,0.35)'; }}
            >
              {saving ? (
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <><Download size={18} /> Guardar ticket como imagen</>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
