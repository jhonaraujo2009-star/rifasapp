import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Grid3X3, Users, Download, Settings,
  LogOut, Menu, X, ExternalLink, Ticket, ChevronRight
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const NAV_LINKS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/grilla', icon: Grid3X3, label: 'Inventario' },
  { to: '/admin/clientes', icon: Users, label: 'Clientes' },
  { to: '/admin/exportar', icon: Download, label: 'Exportar' },
  { to: '/admin/ajustes', icon: Settings, label: 'Ajustes' },
];

export default function AdminLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeId, setStoreId] = useState(null);
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    getDocs(query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid)))
      .then(snap => {
        if (!snap.empty) {
          setStoreId(snap.docs[0].id);
          setStoreName(snap.docs[0].data().nombre || 'Mi tienda');
        }
      });
  }, [currentUser]);

  // Cerrar sidebar al cambiar de ruta
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentLabel = NAV_LINKS.find(n => n.end
    ? location.pathname === n.to
    : location.pathname.startsWith(n.to))?.label || 'Panel';

  const Sidebar = ({ onClose }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0b1e' }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.4)', flexShrink: 0 }}>
            <Ticket size={17} color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, color: 'white', fontSize: 15, letterSpacing: '-0.3px' }}>
              Rifas<span style={{ color: '#a78bfa' }}>App</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {currentUser?.email}
            </div>
          </div>
        </div>
        {storeName && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Tienda activa</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{storeName}</div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.15em', padding: '4px 10px 8px' }}>Menú principal</div>
        {NAV_LINKS.map(({ to, icon: Icon, label, end }) => {
          const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink key={to} to={to} end={end} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                background: isActive ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))' : 'transparent',
                border: isActive ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                fontWeight: isActive ? 700 : 500, fontSize: 14,
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: isActive ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={isActive ? '#a78bfa' : 'rgba(255,255,255,0.4)'} />
                </div>
                {label}
                {isActive && <ChevronRight size={13} style={{ marginLeft: 'auto', color: '#a78bfa' }} />}
              </div>
            </NavLink>
          );
        })}

        {storeId && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
            <a href={`/tienda/${storeId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 500, border: '1px dashed rgba(255,255,255,0.1)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ExternalLink size={14} color="rgba(255,255,255,0.4)" />
                </div>
                Ver mi tienda
                <ExternalLink size={11} style={{ marginLeft: 'auto', opacity: 0.4 }} />
              </div>
            </a>
          </>
        )}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'rgba(239,68,68,0.7)', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'rgb(252,165,165)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={15} color="rgba(239,68,68,0.8)" />
          </div>
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#060612', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar desktop */}
      <aside style={{ width: 240, minHeight: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'none' }}
        className="admin-sidebar-desktop">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, backdropFilter: 'blur(4px)' }}
            />
            <motion.aside key="drawer"
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, zIndex: 60 }}>
              <button onClick={() => setSidebarOpen(false)}
                style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <X size={14} />
              </button>
              <Sidebar />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} className="admin-main-content">
        {/* Topbar */}
        <header style={{ position: 'sticky', top: 0, zIndex: 30, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,6,18,0.85)', backdropFilter: 'blur(20px)', padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSidebarOpen(true)} className="admin-menu-btn"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Menu size={17} />
            </button>
            <div>
              <div style={{ fontWeight: 800, color: 'white', fontSize: 15 }}>{currentLabel}</div>
              {storeName && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{storeName}</div>}
            </div>
          </div>
          {storeId && (
            <a href={`/tienda/${storeId}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              <ExternalLink size={12} /> Ver tienda
            </a>
          )}
        </header>

        <main style={{ flex: 1, padding: '24px 20px', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media(min-width:768px){
          .admin-sidebar-desktop{ display:block !important; }
          .admin-main-content{ margin-left:240px; }
          .admin-menu-btn{ display:none !important; }
        }
      `}</style>
    </div>
  );
}
