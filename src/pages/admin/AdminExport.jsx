import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileSpreadsheet, FileText, Ticket } from 'lucide-react';

export default function AdminExport() {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!currentUser) return;
      const sq = query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid));
      const ss = await getDocs(sq);
      if (ss.empty) { setLoading(false); return; }
      const storeData = { id: ss.docs[0].id, ...ss.docs[0].data() };
      setStore(storeData);

      const [tSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, 'tickets'), where('storeId', '==', storeData.id))),
        getDocs(query(collection(db, 'customers'), where('storeId', '==', storeData.id))),
      ]);

      setTickets(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    init();
  }, [currentUser]);

  // Construye data completa de 1000 números
  const buildData = () => {
    const estadoMap = Object.fromEntries(tickets.map(t => [t.numero, t]));
    const custMap = Object.fromEntries(customers.map(c => [c.id, c]));
    return Array.from({ length: 1000 }, (_, i) => {
      const n = i + 1;
      const t = estadoMap[n];
      const c = t?.cliente_id ? custMap[t.cliente_id] : null;
      return {
        Número: String(n).padStart(3, '0'),
        Estado: t?.estado || 'disponible',
        Cliente: c?.nombre || '',
        Teléfono: c?.telefono || '',
        Cédula: c?.cedula || '',
        Dirección: c?.direccion || '',
        'Fecha Apartado': t?.fecha_apartado?.toDate
          ? t.fecha_apartado.toDate().toLocaleString('es-ES')
          : '',
      };
    });
  };

  const exportExcel = () => {
    const data = buildData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    XLSX.writeFile(wb, `rifas_${store?.nombre || 'tienda'}_${Date.now()}.xlsx`);
  };

  const exportCSV = () => {
    const data = buildData();
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${v}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rifas_${store?.nombre || 'tienda'}.csv`;
    link.click();
  };

  const exportPDF = () => {
    const data = buildData();
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Reporte de Rifas – ${store?.nombre || 'Tienda'}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['Número', 'Estado', 'Cliente', 'Teléfono', 'Cédula', 'Fecha Apartado']],
      body: data.map(r => [r.Número, r.Estado, r.Cliente, r.Teléfono, r.Cédula, r['Fecha Apartado']]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [124, 58, 237] },
      alternateRowStyles: { fillColor: [245, 245, 255] },
    });
    doc.save(`rifas_${store?.nombre || 'tienda'}.pdf`);
  };

  // Stats rápidos
  const totalVendidos = tickets.filter(t => t.estado === 'vendido').length;
  const totalApartados = tickets.filter(t => t.estado === 'apartado').length;
  const ingresos = totalVendidos * (store?.precio_numero || 0);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Exportar datos</h1>
        <p className="text-white/40 text-sm mt-1">Descarga el reporte completo de los 1.000 números</p>
      </div>

      {/* Resumen pre-exportación */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Vendidos', value: totalVendidos, color: 'text-red-400' },
          { label: 'Apartados', value: totalApartados, color: 'text-yellow-400' },
          { label: 'Ingresos', value: `$${ingresos.toLocaleString()}`, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="glass p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Botones de exportación */}
      <div className="glass p-6 space-y-4">
        <h2 className="text-lg font-bold text-white mb-4">Formato de exportación</h2>
        
        <button onClick={exportExcel}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-green-600/15 border border-green-500/20 hover:bg-green-600/25 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-6 h-6 text-green-400" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-white">Exportar a Excel (.xlsx)</p>
            <p className="text-xs text-white/40">1.000 filas con todos los estados y datos de clientes</p>
          </div>
          <Download className="w-5 h-5 text-green-400" />
        </button>

        <button onClick={exportCSV}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-blue-600/15 border border-blue-500/20 hover:bg-blue-600/25 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-white">Exportar a CSV</p>
            <p className="text-xs text-white/40">Compatible con cualquier hoja de cálculo</p>
          </div>
          <Download className="w-5 h-5 text-blue-400" />
        </button>

        <button onClick={exportPDF}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-600/15 border border-red-500/20 hover:bg-red-600/25 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6 text-red-400" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-white">Exportar a PDF</p>
            <p className="text-xs text-white/40">Reporte imprimible con tabla completa</p>
          </div>
          <Download className="w-5 h-5 text-red-400" />
        </button>
      </div>
    </div>
  );
}
