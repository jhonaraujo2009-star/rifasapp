import { useMemo, useState } from 'react';
import { Shuffle, X } from 'lucide-react';

/*
  NumberGrid — tema CLARO (blanco/light) para la vista del cliente
  ──────────────────────────────────────────────────────────────────
  ● Blanco / marfil   = Disponible
  ● Verde claro       = Apartado
  ● Rojo/rosa claro   = Vendido
  ● Violeta/dorado    = Seleccionado actualmente
*/

export default function NumberGrid({ tickets, seleccionados, onSelect, soloDisponibles, busqueda }) {
  const [hovered, setHovered] = useState(null);

  const estadoMap = useMemo(() => {
    const map = {};
    tickets.forEach(t => { map[t.numero] = t.estado; });
    return map;
  }, [tickets]);

  const numeros = useMemo(() => Array.from({ length: 1000 }, (_, i) => i + 1), []);

  const visibles = useMemo(() => numeros.filter(n => {
    const estado = estadoMap[n] || 'disponible';
    if (soloDisponibles && estado !== 'disponible') return false;
    if (busqueda) {
      const b = String(busqueda).trim();
      if (!String(n).padStart(3, '0').includes(b) && !String(n).includes(b)) return false;
    }
    return true;
  }), [numeros, estadoMap, soloDisponibles, busqueda]);

  const conteo = useMemo(() => ({
    disponibles: numeros.filter(n => (estadoMap[n] || 'disponible') === 'disponible').length,
    apartados: numeros.filter(n => estadoMap[n] === 'apartado').length,
    vendidos: numeros.filter(n => estadoMap[n] === 'vendido').length,
  }), [numeros, estadoMap]);

  const handleClick = (n) => {
    if ((estadoMap[n] || 'disponible') !== 'disponible') return;
    onSelect(n);
  };

  const seleccionarAleatorios = (cantidad) => {
    const disp = numeros.filter(
      n => (estadoMap[n] || 'disponible') === 'disponible' && !seleccionados.includes(n)
    );
    disp.sort(() => Math.random() - 0.5).slice(0, cantidad).forEach(n => onSelect(n));
  };

  const limpiar = () => seleccionados.forEach(n => onSelect(n));

  /* ── Estilo de cada celda (tema CLARO) ─────────────── */
  const getCelda = (n) => {
    const isSel = seleccionados.includes(n);
    const estado = estadoMap[n] || 'disponible';
    const isHov = hovered === n;

    if (isSel) return {
      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
      border: '2px solid #7c3aed',
      color: '#fff',
      fontWeight: 900,
      boxShadow: '0 2px 12px rgba(124,58,237,0.45)',
      transform: 'scale(1.1)',
      cursor: 'pointer',
    };
    if (estado === 'apartado') return {
      background: '#dcfce7',        // verde pastel
      border: '1px solid #86efac',
      color: '#15803d',
      fontWeight: 700,
      cursor: 'not-allowed',
    };
    if (estado === 'vendido') return {
      background: '#fee2e2',        // rojo pastel
      border: '1px solid #fca5a5',
      color: '#b91c1c',
      fontWeight: 600,
      cursor: 'not-allowed',
      textDecoration: 'line-through',
      opacity: 0.8,
    };
    if (isHov) return {
      background: '#ede9fe',        // violeta suave hover
      border: '1.5px solid #7c3aed',
      color: '#5b21b6',
      fontWeight: 700,
      cursor: 'pointer',
      transform: 'scale(1.05)',
      boxShadow: '0 2px 8px rgba(124,58,237,0.2)',
    };
    // Disponible normal — fondo blanco limpio
    return {
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      color: '#374151',
      fontWeight: 600,
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    };
  };

  return (
    <div>
      {/* ── Controles rápidos ────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Mini stats en claro */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: `Disponibles`, val: conteo.disponibles, bg: '#f3f4f6', border: '#d1d5db', color: '#374151' },
            { label: `Apartados`, val: conteo.apartados, bg: '#dcfce7', border: '#86efac', color: '#15803d' },
            { label: `Vendidos`, val: conteo.vendidos, bg: '#fee2e2', border: '#fca5a5', color: '#b91c1c' },
          ].map(({ label, val, bg, border, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: bg, border: `1px solid ${border}` }}>
              <span style={{ fontSize: 13, fontWeight: 800, color }}>{val}</span>
              <span style={{ fontSize: 11, color, opacity: 0.7 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Selección rápida + limpiar */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[1, 3, 5, 10].map(n => (
            <button key={n} onClick={() => seleccionarAleatorios(n)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: '#ede9fe', border: '1px solid #c4b5fd', color: '#5b21b6', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ddd6fe'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ede9fe'; }}>
              <Shuffle size={10} /> +{n} aleatorio{n > 1 ? 's' : ''}
            </button>
          ))}
          {seleccionados.length > 0 && (
            <button onClick={limpiar}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <X size={10} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Grilla ───────────────────────────────── */}
      {visibles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
          No se encontraron números con ese filtro
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
          gap: 5,
          width: '100%',
        }}>
          {visibles.map(n => {
            const s = getCelda(n);
            return (
              <button key={n}
                onClick={() => handleClick(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                title={`Número ${String(n).padStart(3, '0')} — ${estadoMap[n] || 'disponible'}`}
                style={{
                  height: 44,
                  borderRadius: 9,
                  fontSize: 11.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.12s ease',
                  userSelect: 'none',
                  outline: 'none',
                  ...s,
                }}
              >
                {String(n).padStart(3, '0')}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Pie ──────────────────────────────────── */}
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          {visibles.length.toLocaleString()} de 1.000 números
        </span>
        {seleccionados.length > 0 && (
          <div style={{ padding: '4px 12px', borderRadius: 20, background: '#ede9fe', border: '1px solid #c4b5fd', fontSize: 12, fontWeight: 800, color: '#5b21b6' }}>
            ✓ {seleccionados.length} seleccionado{seleccionados.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
