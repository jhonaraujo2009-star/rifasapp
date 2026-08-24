// =============================================================
//  firebaseTools.js
//  Funciones reales que el agente Gemini invoca via Function Calling.
//  Se conectan directamente a tu Firestore.
//  Los IDs de tickets siguen el formato: {storeId}_{000-999}
//
//  ✅ Optimizado: consultas en PARALELO con Promise.all
// =============================================================
import { db } from '../firebase';
import {
  doc, getDoc, writeBatch
} from 'firebase/firestore';

/**
 * Verifica la disponibilidad de uno o varios números de rifa.
 * ✅ Ahora usa Promise.all — consulta todos al mismo tiempo.
 * @param {string} storeId - ID de la tienda activa
 * @param {string[]} numeros - Array de números como strings (ej: ["031","048"])
 * @returns {Promise<Array>} Lista con el estado de cada número
 */
export async function verificarDisponibilidad(storeId, numeros) {
  const promises = numeros.map(async (num) => {
    const n = parseInt(num, 10);
    if (isNaN(n) || n < 0 || n > 999) {
      return { numero: num, estado: 'inválido', mensaje: 'Número fuera de rango (0-999)' };
    }
    const padded = String(n).padStart(3, '0');
    const ticketId = `${storeId}_${padded}`;

    try {
      const snap = await getDoc(doc(db, 'tickets', ticketId));
      if (snap.exists()) {
        const data = snap.data();
        return {
          numero: padded,
          estado: data.estado || 'disponible',
          cliente: data.cliente_nombre || null,
        };
      } else {
        return { numero: padded, estado: 'no encontrado' };
      }
    } catch (e) {
      return { numero: padded, estado: 'error', mensaje: e.message };
    }
  });

  return Promise.all(promises);
}

/**
 * Actualiza el estado de uno o varios números en Firestore.
 * @param {string} storeId
 * @param {string[]} numeros
 * @param {'vendido'|'disponible'} estado
 * @param {string|null} [nombreComprador] — nombre del comprador (solo para vendido)
 * @returns {Promise<Object>}
 */
export async function actualizarEstadoNumeros(storeId, numeros, estado, nombreComprador = null) {
  const batch = writeBatch(db);
  const actualizados = [];

  for (const num of numeros) {
    const n = parseInt(num, 10);
    if (isNaN(n) || n < 0 || n > 999) continue;

    const padded = String(n).padStart(3, '0');
    const ticketId = `${storeId}_${padded}`;
    const ref = doc(db, 'tickets', ticketId);

    const updateData =
      estado === 'disponible'
        ? { estado: 'disponible', cliente_nombre: null, cliente_id: null, fecha_apartado: null, fecha_compra: null }
        : { estado: 'vendido', fecha_apartado: new Date(), cliente_nombre: nombreComprador || null, fecha_compra: new Date() };

    batch.update(ref, updateData);
    actualizados.push(padded);
  }

  await batch.commit();
  return { actualizados, nuevoEstado: estado, total: actualizados.length, comprador: nombreComprador || null };
}
