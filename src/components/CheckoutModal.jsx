import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, addDoc, writeBatch, doc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { X, User, Phone, CreditCard, MapPin, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CheckoutModal({ store, seleccionados, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nombre: '', telefono: '', cedula: '', direccion: ''
  });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const confirmar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim()) {
      return toast.error('Nombre y teléfono son obligatorios');
    }
    setLoading(true);

    try {
      const batch = writeBatch(db);

      // 1. Crear/actualizar cliente
      const custRef = await addDoc(collection(db, 'customers'), {
        storeId: store.id,
        nombre: form.nombre,
        telefono: form.telefono,
        cedula: form.cedula || '',
        direccion: form.direccion || '',
        numeros: seleccionados,
        createdAt: serverTimestamp(),
      });

      // 2. Actualizar estado de los tickets a "apartado"
      seleccionados.forEach((numero) => {
        const ticketId = `${store.id}_${String(numero).padStart(3, '0')}`;
        const ticketRef = doc(db, 'tickets', ticketId);
        batch.update(ticketRef, {
          estado: 'apartado',
          cliente_id: custRef.id,
          cliente_nombre: form.nombre,
          fecha_apartado: serverTimestamp(),
        });
      });

      await batch.commit();

      // 3. Construir URL de WhatsApp
      const numStr = seleccionados.join(', ');
      const mensaje = encodeURIComponent(
        `¡Hola! 👋 Soy *${form.nombre}*` +
        (form.cedula ? `, C.I: *${form.cedula}*` : '') +
        `.\n\nQuiero apartar los números: *${numStr}*` +
        `\n\nPrecio por número: $${store.precio_numero}` +
        `\nTotal: $${(seleccionados.length * (store.precio_numero || 0)).toLocaleString()}` +
        (form.direccion ? `\n\nDirección: ${form.direccion}` : '') +
        `\n\n¡Gracias! 🎰`
      );
      const waNumber = store.whatsapp?.replace(/\D/g, '');
      window.open(`https://wa.me/${waNumber}?text=${mensaje}`, '_blank');

      toast.success('¡Números apartados! Revisa WhatsApp 🎉');
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Error al apartar los números. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const total = seleccionados.length * (store.precio_numero || 0);

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="modal-content"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Confirmar apartado</h2>
              <p className="text-sm text-white/50 mt-0.5">
                {seleccionados.length} número{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Números seleccionados */}
          <div className="glass-dark p-4 rounded-xl mb-5">
            <p className="text-xs text-white/40 mb-2 font-medium uppercase">Números seleccionados</p>
            <div className="flex flex-wrap gap-2">
              {seleccionados.map((n) => (
                <span key={n} className="badge badge-purple text-sm px-3 py-1">
                  {String(n).padStart(3, '0')}
                </span>
              ))}
            </div>
            <div className="border-t border-white/10 mt-3 pt-3 flex justify-between">
              <span className="text-sm text-white/50">Total a cancelar</span>
              <span className="text-lg font-bold text-green-400">
                ${total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={confirmar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Nombre completo <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input name="nombre" type="text" required value={form.nombre} onChange={handle}
                  placeholder="Tu nombre completo" className="input-glass pl-10" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Teléfono <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input name="telefono" type="tel" required value={form.telefono} onChange={handle}
                  placeholder="+58 4XX XXX XXXX" className="input-glass pl-10" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Cédula <span className="text-white/30 text-xs">(opcional)</span></label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input name="cedula" type="text" value={form.cedula} onChange={handle}
                  placeholder="V-12345678" className="input-glass pl-10" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Dirección <span className="text-white/30 text-xs">(opcional)</span></label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input name="direccion" type="text" value={form.direccion} onChange={handle}
                  placeholder="Tu dirección" className="input-glass pl-10" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-whatsapp mt-2">
              {loading ? (
                <span className="spinner w-5 h-5 border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <MessageCircle className="w-5 h-5" />
                  Confirmar y enviar a WhatsApp
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-white/25 text-center mt-4">
            Al confirmar, los números quedan apartados por 12 horas mientras realizas el pago.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
