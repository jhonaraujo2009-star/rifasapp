import { useMemo } from 'react';
import { motion } from 'framer-motion';

// Renderiza la grilla de 1000 números (1 al 1000) con memoización
// Estado: disponible | apartado | vendido | seleccionado (selección local del carrito)
export default function NumberGrid({ tickets, seleccionados, onSelect, soloDisponibles, busqueda }) {
  // Construye un mapa rápido: numero -> estado
  const estadoMap = useMemo(() => {
    const map = {};
    tickets.forEach((t) => {
      map[t.numero] = t.estado;
    });
    return map;
  }, [tickets]);

  // Genera los 1000 números
  const numeros = useMemo(() => {
    return Array.from({ length: 1000 }, (_, i) => i + 1);
  }, []);

  // Filtra según búsqueda y filtro de disponibles
  const visibles = useMemo(() => {
    return numeros.filter((n) => {
      const estado = estadoMap[n] || 'disponible';
      if (soloDisponibles && estado !== 'disponible') return false;
      if (busqueda && !String(n).padStart(3, '0').includes(busqueda)) return false;
      return true;
    });
  }, [numeros, estadoMap, soloDisponibles, busqueda]);

  const getClase = (numero) => {
    if (seleccionados.includes(numero)) return 'numero-seleccionado';
    const estado = estadoMap[numero] || 'disponible';
    return {
      disponible: 'numero-disponible',
      apartado: 'numero-apartado',
      vendido: 'numero-vendido',
    }[estado] || 'numero-disponible';
  };

  const handleClick = (numero) => {
    const estado = estadoMap[numero] || 'disponible';
    if (estado !== 'disponible') return; // No permite seleccionar si no está disponible
    onSelect(numero);
  };

  return (
    <div>
      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-white/10 border border-white/20 inline-block" />
          Disponible
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-500/50 inline-block" />
          Apartado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-red-500/30 border border-red-500/50 inline-block" />
          Vendido
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-purple-600/70 border border-purple-400 inline-block" />
          Seleccionado
        </span>
      </div>

      {/* Aviso si no hay resultados */}
      {visibles.length === 0 && (
        <div className="text-center py-8 text-white/40">
          No se encontraron números con ese filtro
        </div>
      )}

      {/* Grilla */}
      <div className="numero-grid">
        {visibles.map((numero) => (
          <button
            key={numero}
            onClick={() => handleClick(numero)}
            className={`numero-cell ${getClase(numero)}`}
            title={`Número ${numero}`}
          >
            {String(numero).padStart(3, '0')}
          </button>
        ))}
      </div>

      {/* Conteo */}
      <div className="mt-4 text-xs text-white/30 text-right">
        Mostrando {visibles.length} de 1.000 números
      </div>
    </div>
  );
}
