import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Phone, User, MessageCircle, Ticket, Send, ChevronRight, IdCard } from 'lucide-react';

/*
  CheckoutModal (público)
  ──────────────────────────────────────────────────────────
  El cliente llena sus datos y presiona "Apartar por WhatsApp".
  Se abre un chat de WhatsApp pre-llenado con los números que quiere.
  ⚠️ NO escribe nada en Firestore. Solo el admin puede cambiar
     el estado de los tickets desde el Panel de Administración.
*/
export default function CheckoutModal({ store, seleccionados, onClose, onSuccess }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', cedula: '' });
  const [step, setStep] = useState(1); // 1 = datos, 2 = resumen

  const precio = store?.precio_numero || 0;
  const total = seleccionados.length * precio;
  const whatsapp = store?.whatsapp?.replace(/\D/g, '') || '';
  const color = store?.color_principal || '#b8860b';

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const generarMensaje = () => {
    const nums = [...seleccionados].sort((a, b) => a - b)
      .map(n => String(n).padStart(3, '0')).join(', ');
    return encodeURIComponent(
      `¡Hola! 👋 Quiero apartar estos números de la rifa *${store.nombre}*:\n\n` +
      `🎟️ *Números:* ${nums}\n` +
      `💰 *Total:* $${total.toLocaleString()}\n\n` +
      `📋 *Mis datos:*\n` +
      `• Nombre: ${form.nombre}\n` +
      `• Teléfono: ${form.telefono}\n` +
      (form.cedula ? `• Cédula: ${form.cedula}\n` : '') +
      `\n¿Cómo realizo el pago? 🙏`
    );
  };

  const confirmar = () => {
    if (!whatsapp) { toast.error('Esta tienda no tiene WhatsApp configurado'); return; }
    window.open(`https://wa.me/${whatsapp}?text=${generarMensaje()}`, '_blank');
    toast.success('¡Abriendo WhatsApp! El admin confirmará tu pedido.');
    onSuccess?.();
  };

  const avanzar = () => {
    if (!form.nombre.trim() || !form.telefono.trim()) {
      toast.error('Completa tu nombre y teléfono');
      return;
    }
    setStep(2);
  };

  const numerosOrdenados = [...seleccionados].sort((a, b) => a - b);

  return (
    <AnimatePresence>
      <motion.div key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 200 }}
      />

      <motion.div key="modal"
        initial={{ opacity: 0, y: 70, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          maxWidth: 520, margin: '0 auto',
          background: '#0d0b1e',
          borderRadius: '24px 24px 0 0',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Barra de color */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}66, ${color})`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, color: 'white', fontSize: 16 }}>
              {step === 1 ? '📋 Tus datos de contacto' : '✅ Confirmar solicitud'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {seleccionados.length} número{seleccionados.length > 1 ? 's' : ''} · ${total.toLocaleString()} total
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {step === 1 ? (
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Chip de números */}
              <div style={{ padding: '14px 16px', borderRadius: 14, background: `${color}18`, border: `1px solid ${color}35` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Ticket size={11} color={color} /> Números a solicitar
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 90, overflowY: 'auto' }}>
                  {numerosOrdenados.map(n => (
                    <span key={n} style={{ padding: '3px 10px', borderRadius: 8, background: `${color}30`, border: `1px solid ${color}55`, fontSize: 12, fontWeight: 700, color }}>
                      {String(n).padStart(3, '0')}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Total estimado</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>${total.toLocaleString()}</span>
                </div>
              </div>

              {/* Aviso */}
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: 'rgba(147,197,253,0.9)', lineHeight: 1.5 }}>
                💡 Al enviar el mensaje el admin confirmará tu reserva. Los números quedarán disponibles hasta que el admin los confirme.
              </div>

              {/* Campos */}
              {[
                { name: 'nombre', label: 'Nombre completo', placeholder: 'Juan Pérez', icon: User, required: true },
                { name: 'telefono', label: 'Teléfono / WhatsApp', placeholder: '+57 300 000 0000', icon: Phone, required: true },
                { name: 'cedula', label: 'Cédula (opcional)', placeholder: '12345678', icon: IdCard, required: false },
              ].map(({ name, label, placeholder, icon: Icon, required }) => (
                <div key={name}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 7 }}>
                    {label} {required && <span style={{ color: '#f87171' }}>*</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Icon size={14} color="rgba(255,255,255,0.28)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input name={name} value={form[name]} onChange={handleChange}
                      placeholder={placeholder} autoComplete="off"
                      style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 36, paddingRight: 14, paddingTop: 12, paddingBottom: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, outline: 'none' }}
                      onFocus={e => { e.target.style.borderColor = color; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Resumen */}
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { label: 'Nombre', val: form.nombre },
                  { label: 'Teléfono', val: form.telefono },
                  ...(form.cedula ? [{ label: 'Cédula', val: form.cedula }] : []),
                  { label: 'Números', val: numerosOrdenados.map(n => String(n).padStart(3, '0')).join(', ') },
                  { label: 'Total', val: `$${total.toLocaleString()}`, bold: true },
                ].map(({ label, val, bold }, i) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 16px', background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: bold ? 900 : 600, color: bold ? '#22c55e' : 'rgba(255,255,255,0.82)', textAlign: 'right', wordBreak: 'break-all', maxWidth: '65%' }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '13px 16px', borderRadius: 13, background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MessageCircle size={16} color="#25d366" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>
                  Se abrirá <strong style={{ color: 'white' }}>WhatsApp</strong> con tu solicitud lista para enviar a <strong style={{ color: 'white' }}>{store.nombre}</strong>. El admin confirmará y apartará tus números.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
          {step === 2 && (
            <button onClick={() => setStep(1)}
              style={{ padding: '13px 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Atrás
            </button>
          )}
          {step === 1 ? (
            <button onClick={avanzar}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${color}, ${color}99)`, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: `0 4px 20px ${color}44` }}>
              Continuar <ChevronRight size={17} />
            </button>
          ) : (
            <button onClick={confirmar}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #25d366, #128c7e)', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 24px rgba(37,211,102,0.4)' }}>
              <Send size={17} /> Enviar solicitud por WhatsApp
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
