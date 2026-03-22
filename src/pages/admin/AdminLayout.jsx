import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Grid3X3, Users, Download, Settings,
  LogOut, Menu, X, ExternalLink, ChevronRight
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const NAV_LINKS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/grilla', icon: Grid3X3, label: 'Inventario' },
  { to: '/admin/clientes', icon: Users, label: 'Clientes (CRM)' },
  { to: '/admin/exportar', icon: Download, label: 'Exportar' },
  { to: '/admin/ajustes', icon: Settings, label: 'Ajustes' },
];

export default function AdminLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeId, setStoreId] = useState(null);

  useEffect(() => {
    const fetchStore = async () => {
      if (!currentUser) return;
      const q = query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid));
      const snap = await getDocs(q);
      if (!snap.empty) setStoreId(snap.docs[0].id);
    };
    fetchStore();
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      {/* Branding */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 flex items-center justify-center text-xl animate-pulse-glow">🎰</div>
          <div>
            <p className="font-bold text-white text-sm">RifasApp</p>
            <p className="text-xs text-white/40 truncate max-w-32">{currentUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-4 flex-1 space-y-1">
        {NAV_LINKS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
            {to === '/admin' && <ChevronRight className="w-3 h-3 ml-auto opacity-30" />}
          </NavLink>
        ))}

        {/* Ver tienda pública */}
        {storeId && (
          <a
            href={`/tienda/${storeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link mt-4"
          >
            <ExternalLink className="w-5 h-5 flex-shrink-0" />
            Ver mi tienda
          </a>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/5">
        <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:bg-red-500/10">
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="bg-gradient-animated min-h-screen flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass-dark border-r border-white/5 min-h-screen fixed left-0 top-0">
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 bottom-0 w-72 glass-dark z-50 flex flex-col md:hidden"
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Topbar móvil */}
        <header className="md:hidden glass-dark border-b border-white/5 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-white">Panel Admin 🎰</span>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
