import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Shuffle, ChevronLeft, ChevronRight, Hash, Ticket } from 'lucide-react';

/*
  PrintAvailableNumbers
  ─────────────────────────────────────────────────
  Modal que permite al admin imprimir números disponibles
  en una tabla formateada para rifas.
  - Puede elegir cuántos números quiere imprimir
  - Los selecciona aleatoriamente de los disponibles
  - Puede pedir otro lote con los restantes
  - Diseñado para imprimirse bonito en hojas de papel
*/

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PrintAvailableNumbers({ disponibles, storeName, onClose }) {
  const [cantidad, setCantidad] = useState(Math.min(disponibles.length, 100));
  const [numerosAleatorios, setNumerosAleatorios] = useState(null);
  const [loteActual, setLoteActual] = useState(0);
  const [lotes, setLotes] = useState([]);
  const printRef = useRef(null);

  const totalDisponibles = disponibles.length;
  const columnas = 10; // números por fila en la tabla impresa

  // Genera los lotes: divide los disponibles en lotes del tamaño solicitado
  const generarLotes = () => {
    const shuffled = shuffleArray(disponibles);
    const cant = Math.max(1, Math.min(cantidad, totalDisponibles));
    const newLotes = [];
    for (let i = 0; i < shuffled.length; i += cant) {
      newLotes.push(shuffled.slice(i, i + cant).sort((a, b) => a - b));
    }
    setLotes(newLotes);
    setLoteActual(0);
    setNumerosAleatorios(newLotes[0]);
  };

  const irALote = (idx) => {
    if (idx >= 0 && idx < lotes.length) {
      setLoteActual(idx);
      setNumerosAleatorios(lotes[idx]);
    }
  };

  const imprimir = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const nums = numerosAleatorios || [];
    const filas = [];
    for (let i = 0; i < nums.length; i += columnas) {
      filas.push(nums.slice(i, i + columnas));
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Números Disponibles - ${storeName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', Arial, sans-serif;
            padding: 20mm 15mm;
            color: #1a1a1a;
          }
          .header {
            text-align: center;
            margin-bottom: 8mm;
            padding-bottom: 5mm;
            border-bottom: 2px solid #7c3aed;
          }
          .header h1 {
            font-size: 22pt;
            font-weight: 900;
            color: #7c3aed;
            margin-bottom: 2mm;
          }
          .header .subtitle {
            font-size: 10pt;
            color: #666;
            font-weight: 600;
          }
          .header .badge {
            display: inline-block;
            background: #f3f0ff;
            color: #7c3aed;
            padding: 2mm 5mm;
            border-radius: 20px;
            font-size: 9pt;
            font-weight: 700;
            margin-top: 3mm;
            border: 1px solid #e0d4fc;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5mm;
            font-size: 9pt;
            color: #555;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 3mm;
          }
          th {
            display: none;
          }
          td {
            border: 1px solid #d4d4d4;
            padding: 3.5mm 2mm;
            text-align: center;
            font-size: 11pt;
            font-weight: 700;
            color: #1a1a1a;
            width: ${100 / columnas}%;
            transition: none;
          }
          tr:nth-child(even) td {
            background: #f9f7ff;
          }
          tr:nth-child(odd) td {
            background: #fff;
          }
          td:hover {
            background: #ede9fe;
          }
          .footer {
            margin-top: 8mm;
            text-align: center;
            font-size: 8pt;
            color: #999;
            border-top: 1px solid #e5e5e5;
            padding-top: 3mm;
          }
          .page-info {
            text-align: center;
            margin-top: 4mm;
            font-size: 9pt;
            color: #7c3aed;
            font-weight: 700;
          }
          @media print {
            body { padding: 10mm; }
            td { font-size: 10pt; padding: 3mm 1.5mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎟️ ${storeName}</h1>
          <div class="subtitle">Números Disponibles para Rifa</div>
          <div class="badge">Lote ${loteActual + 1} de ${lotes.length} · ${nums.length} números</div>
        </div>
        <div class="info-row">
          <span>📅 Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>🎯 Total disponibles: ${totalDisponibles}</span>
        </div>
        <table>
          <tbody>
            ${filas.map(fila => `
              <tr>
                ${fila.map(n => `<td>${String(n).padStart(3, '0')}</td>`).join('')}
                ${fila.length < columnas ? `<td colspan="${columnas - fila.length}" style="border:none;"></td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="page-info">
          Lote ${loteActual + 1} / ${lotes.length} — ${nums.length} de ${totalDisponibles} números disponibles
        </div>
        <div class="footer">
          Generado automáticamente · ${storeName} · ${new Date().toLocaleString('es-ES')}
        </div>
        <script>window.onload = () => { window.print(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Preview en la tabla del modal
  const previewNums = numerosAleatorios || [];
  const previewFilas = [];
  for (let i = 0; i < previewNums.length; i += columnas) {
    previewFilas.push(previewNums.slice(i, i + columnas));
  }

  return (
    <AnimatePresence>
      <motion.div key="print-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 300 }}
      />

      <motion.div key="print-modal"
        initial={{ opacity: 0, scale: 0.93, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 301, width: '92vw', maxWidth: 780, maxHeight: '90vh',
          background: '#0d0b1e', borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, sans-serif', overflow: 'hidden',
          boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Color bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #7c3aed, #4f46e5, #7c3aed)', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Printer size={20} color="#a78bfa" />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'white', fontSize: 17 }}>Imprimir Números Disponibles</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {totalDisponibles} números disponibles en total
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>

          {/* Configuración */}
          {!numerosAleatorios && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Info card */}
              <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                  <strong style={{ color: '#a78bfa' }}>¿Cómo funciona?</strong><br/>
                  Elige cuántos números quieres imprimir. Se seleccionarán <strong style={{ color: 'white' }}>aleatoriamente</strong> de los disponibles y se dividirán en lotes para imprimir en hojas separadas.
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                  <Hash size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                  ¿Cuántos números por hoja?
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    min={1}
                    max={totalDisponibles}
                    value={cantidad}
                    onChange={e => setCantidad(Math.max(1, Math.min(totalDisponibles, parseInt(e.target.value) || 1)))}
                    style={{
                      width: 120, padding: '14px 16px', borderRadius: 14,
                      border: '1px solid rgba(124,58,237,0.35)',
                      background: 'rgba(124,58,237,0.1)',
                      color: 'white', fontSize: 18, fontWeight: 800,
                      outline: 'none', textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>de {totalDisponibles} disponibles</span>
                </div>

                {/* Quick select buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {[50, 100, 150, 200, 250, 300, 500].filter(n => n <= totalDisponibles).map(n => (
                    <button key={n} onClick={() => setCantidad(n)}
                      style={{
                        padding: '8px 16px', borderRadius: 10,
                        border: `1px solid ${cantidad === n ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        background: cantidad === n ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                        color: cantidad === n ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setCantidad(totalDisponibles)}
                    style={{
                      padding: '8px 16px', borderRadius: 10,
                      border: `1px solid ${cantidad === totalDisponibles ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      background: cantidad === totalDisponibles ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                      color: cantidad === totalDisponibles ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Todos ({totalDisponibles})
                  </button>
                </div>
              </div>

              {/* Info de lotes */}
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: 'rgba(147,197,253,0.9)', lineHeight: 1.5 }}>
                📄 Se generarán <strong>{Math.ceil(totalDisponibles / cantidad)}</strong> lote{Math.ceil(totalDisponibles / cantidad) > 1 ? 's' : ''} de números para imprimir
                {cantidad < totalDisponibles && ` — el último lote tendrá ${totalDisponibles % cantidad || cantidad} números`}
              </div>
            </motion.div>
          )}

          {/* Preview tabla */}
          {numerosAleatorios && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Lote navigation */}
              {lotes.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                  <button onClick={() => irALote(loteActual - 1)} disabled={loteActual === 0}
                    style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: loteActual === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)', cursor: loteActual === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, color: 'white', fontSize: 15 }}>Lote {loteActual + 1} de {lotes.length}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{numerosAleatorios.length} números en este lote</div>
                  </div>
                  <button onClick={() => irALote(loteActual + 1)} disabled={loteActual === lotes.length - 1}
                    style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: loteActual === lotes.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)', cursor: loteActual === lotes.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Tabla preview */}
              <div ref={printRef} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {previewFilas.map((fila, i) => (
                      <tr key={i}>
                        {fila.map(n => (
                          <td key={n} style={{
                            border: '1px solid rgba(255,255,255,0.06)',
                            padding: '10px 6px', textAlign: 'center',
                            fontSize: 13, fontWeight: 700,
                            color: '#c4b5fd',
                            background: i % 2 === 0 ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
                            width: `${100 / columnas}%`,
                          }}>
                            {String(n).padStart(3, '0')}
                          </td>
                        ))}
                        {fila.length < columnas && (
                          <td colSpan={columnas - fila.length} style={{ border: 'none' }}></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lote dots */}
              {lotes.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                  {lotes.map((_, i) => (
                    <button key={i} onClick={() => irALote(i)}
                      style={{
                        width: i === loteActual ? 24 : 8, height: 8,
                        borderRadius: 99, border: 'none',
                        background: i === loteActual ? '#7c3aed' : 'rgba(255,255,255,0.15)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          {!numerosAleatorios ? (
            <button onClick={generarLotes}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                padding: '14px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: 'white', fontWeight: 800, fontSize: 15,
                cursor: 'pointer', boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Shuffle size={17} /> Generar {cantidad} números aleatorios
            </button>
          ) : (
            <>
              <button onClick={() => { setNumerosAleatorios(null); setLotes([]); }}
                style={{
                  padding: '14px 20px', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', fontWeight: 600, fontSize: 14,
                }}
              >
                ← Cambiar cantidad
              </button>
              <button onClick={generarLotes}
                style={{
                  padding: '14px 20px', borderRadius: 14,
                  border: '1px solid rgba(124,58,237,0.3)',
                  background: 'rgba(124,58,237,0.12)',
                  color: '#c4b5fd', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                <Shuffle size={14} /> Reordenar
              </button>
              <button onClick={imprimir}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  padding: '14px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: 'white', fontWeight: 800, fontSize: 15,
                  cursor: 'pointer', boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Printer size={17} /> Imprimir este lote
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
