import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, MessageCircle, Ticket, Send } from 'lucide-react';

/*
  CheckoutModal (público) — Tema CLARO
  ──────────────────────────────────────────────────────────
  El cliente selecciona sus números y presiona "Solicitar por WhatsApp".
  Se abre un chat de WhatsApp pre-llenado con los números que quiere.
  ⚠️ NO escribe nada en Firestore. Solo el admin puede cambiar
     el estado de los tickets desde el Panel de Administración.
  ✅ Simplificado: sin campos de nombre, teléfono ni cédula.
*/
export default function CheckoutModal({ store, seleccionados, onClose, onSuccess }) {
  const precio = store?.precio_numero || 0;
  const total = seleccionados.length * precio;
  const whatsapp = store?.whatsapp?.replace(/\D/g, '') || '';
  const color = store?.color_principal || '#7c3aed';

  const numerosOrdenados = [...seleccionados].sort((a, b) => a - b);

  const generarMensaje = () => {
    const nums = numerosOrdenados
      .map(n => String(n).padStart(3, '0')).join(', ');
    return encodeURIComponent(
      `¡Hola! 👋 Quiero apartar estos números de la rifa *${store.nombre}*:\n\n` +
      `🎟️ *Números:* ${nums}\n` +
      `📦 *Cantidad:* ${seleccionados.length} número${seleccionados.length > 1 ? 's' : ''}\n` +
      `💰 *Total:* $${total.toLocaleString()}\n\n` +
      `¿Cómo realizo el pago? 🙏`
    );
  };

  const enviar = () => {
    if (!whatsapp) { toast.error('Esta tienda no tiene WhatsApp configurado'); return; }
    window.open(`https://wa.me/${whatsapp}?text=${generarMensaje()}`, '_blank');
    toast.success('¡Abriendo WhatsApp! El admin confirmará tu pedido.');
    onSuccess?.();
  };

  return (
    <AnimatePresence>
      <motion.div key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', zIndex: 200 }}
      />

      <motion.div key="modal"
        initial={{ opacity: 0, y: 70, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          maxWidth: 520, margin: '0 auto',
          background: '#ffffff',
          borderRadius: '24px 24px 0 0',
          border: '1px solid #e5e7eb',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, sans-serif',
          overflow: 'hidden',
          boxShadow: '0 -8px 50px rgba(0,0,0,0.15)',
        }}
      >
        {/* Barra de color */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${color}, #25d366)`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, color: '#1a1a2e', fontSize: 18 }}>
              🎟️ Solicitar números
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
              {seleccionados.length} número{seleccionados.length > 1 ? 's' : ''} · <strong style={{ color: '#111' }}>${total.toLocaleString()}</strong> total
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 12, background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Chip de números */}
            <div style={{ padding: '16px 18px', borderRadius: 16, background: '#f8f7ff', border: `1.5px solid ${color}30` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Ticket size={12} color={color} /> Números seleccionados
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                {numerosOrdenados.map(n => (
                  <span key={n} style={{
                    padding: '6px 14px', borderRadius: 10,
                    background: `linear-gradient(135deg, ${color}18, ${color}0a)`,
                    border: `1.5px solid ${color}40`,
                    fontSize: 14, fontWeight: 800, color: color,
                    letterSpacing: '0.02em',
                  }}>
                    {String(n).padStart(3, '0')}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>💰 Total a pagar</span>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#1a1a2e' }}>${total.toLocaleString()}</span>
              </div>
            </div>

            {/* Info box - WhatsApp */}
            <div style={{ padding: '14px 16px', borderRadius: 14, background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#dcfce7', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageCircle size={16} color="#25d366" />
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                Se abrirá <strong style={{ color: '#166534' }}>WhatsApp</strong> con tu solicitud lista. El admin de <strong style={{ color: '#1a1a2e' }}>{store.nombre}</strong> confirmará y apartará tus números.
              </div>
            </div>

            {/* Aviso */}
            <div style={{ padding: '12px 16px', borderRadius: 12, background: '#eff6ff', border: '1.5px solid #bfdbfe', fontSize: 13, color: '#1e40af', lineHeight: 1.5, textAlign: 'center', fontWeight: 500 }}>
              💡 Los números quedarán disponibles hasta que el admin confirme tu solicitud
            </div>
          </div>
        </div>

        {/* Footer — botón único */}
        <div style={{ padding: '16px 22px 28px', borderTop: '1px solid #f0f0f0', flexShrink: 0, background: '#fafafa' }}>
          <button onClick={enviar}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '17px',
              borderRadius: 16,
              border: 'none',
              background: 'linear-gradient(135deg, #25d366, #20bd5a)',
              color: 'white',
              fontWeight: 800,
              fontSize: 17,
              cursor: 'pointer',
              boxShadow: '0 6px 28px rgba(37,211,102,0.35), 0 2px 8px rgba(37,211,102,0.2)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(37,211,102,0.45), 0 2px 10px rgba(37,211,102,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(37,211,102,0.35), 0 2px 8px rgba(37,211,102,0.2)'; }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1.02)'}
          >
            <Send size={19} /> Solicitar por WhatsApp
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
