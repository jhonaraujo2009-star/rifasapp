import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import {
  ArrowRight, Ticket, Calendar, DollarSign,
  Zap, Shield, Smartphone, ChevronDown
} from 'lucide-react';

function StoreCard({ store, index }) {
  const color = store.color_principal || '#7c3aed';
  const fechaStr = store.fecha_sorteo
    ? new Date(store.fecha_sorteo.seconds * 1000).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    : 'Por definir';

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -8 }}
      className="group relative"
    >
      <Link to={`/tienda/${store.id}`}>
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 blur-xl -z-10"
          style={{ background: color }}
        />
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 group-hover:border-white/20">
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ background: `radial-gradient(circle at top right, ${color}, transparent 65%)` }} />
          <div className="p-6 relative">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${color}cc, ${color}55)` }}>
                {store.logo_url
                  ? <img src={store.logo_url} alt={store.nombre} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  : store.nombre?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-bold text-lg leading-tight truncate">{store.nombre}</h3>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1"
                  style={{ background: `${color}22`, color }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Activa
                </span>
              </div>
            </div>
            <div className="space-y-2.5 mb-6">
              {[
                { icon: DollarSign, text: `$${(store.precio_numero || 0).toLocaleString()} / número`, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
                { icon: Calendar, text: `Sorteo: ${fechaStr}`, color: 'text-purple-400', bg: 'bg-purple-500/15' },
                { icon: Ticket, text: '1.000 números', color: 'text-amber-400', bg: 'bg-amber-500/15' },
              ].map(({ icon: Icon, text, color: c, bg }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${c}`} />
                  </div>
                  <span className="text-sm text-white/60">{text}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}>
              <Ticket className="w-4 h-4" />
              Ver mis números
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'stores'), where('activa', '==', true));
        const snap = await getDocs(q);
        setStores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { /* silently */ } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#060612', color: 'white', overflowX: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      {/* Orbes de fondo */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '10%', right: '-15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '30%', width: 700, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
              <Ticket size={16} color="white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
              Rifas<span style={{ color: '#a78bfa' }}>App</span>
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/login" style={{ display: 'none', padding: '8px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}
              className="sm-show">
              Iniciar sesión
            </Link>
            <Link to="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 20px rgba(124,58,237,0.35)' }}>
              Crear tienda <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 99, border: '1px solid rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', fontSize: 13, fontWeight: 600, marginBottom: 28 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 2s infinite' }} />
            Plataforma #1 de rifas online en Latinoamérica
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.06, letterSpacing: '-2px', marginBottom: 20, color: 'white' }}>
            Vende rifas online{' '}
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              sin complicaciones
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Crea tu tienda, comparte el link y tus clientes escogen sus números.
            El pago va <strong style={{ color: 'rgba(255,255,255,0.8)' }}>directo a tu WhatsApp.</strong>
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            <Link to="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 16, fontSize: 16, fontWeight: 800, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 40px rgba(124,58,237,0.45)', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <Zap size={18} /> Crear mi tienda gratis <ArrowRight size={16} />
            </Link>
            <a href="#rifas" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 16, fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}>
              Ver rifas activas <ChevronDown size={16} />
            </a>
          </div>

          {/* Feature chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {[
              { icon: Smartphone, text: '100% mobile' },
              { icon: Shield, text: 'Seguro con Firebase' },
              { icon: Zap, text: 'Tiempo real' },
              { icon: Ticket, text: '1.000 números' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                <Icon size={14} color="#a78bfa" /> {text}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 380, margin: '48px auto 0' }}>
          {[
            { num: stores.length > 0 ? `+${stores.length}` : '0', label: 'Rifas activas' },
            { num: '1K', label: 'Números / rifa' },
            { num: '0$', label: 'Para empezar' },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>{s.num}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Divisor */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
      </div>

      {/* Rifas activas */}
      <section id="rifas" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 6 }}>En vivo ahora</p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: 0 }}>Rifas activas</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Participa en los sorteos disponibles</p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd', fontSize: 12, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 2s infinite' }} />
            {stores.length} disponibles
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Cargando rifas...</p>
          </div>
        ) : stores.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={28} color="rgba(255,255,255,0.2)" />
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Aún no hay rifas activas</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 4 }}>¡Crea la primera en menos de 2 minutos!</p>
            </div>
            <Link to="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 14, fontSize: 14, fontWeight: 700, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              Crear mi tienda <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {stores.map((store, i) => <StoreCard key={store.id} store={store} index={i} />)}
          </div>
        )}
      </section>

      {/* CTA final */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', padding: '60px 40px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(79,70,229,0.15))' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(124,58,237,0.12), transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: 32, fontWeight: 900, color: 'white', margin: '0 0 12px' }}>¿Listo para empezar?</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
              Crea tu tienda de rifas en menos de 2 minutos. Sin tarjeta de crédito.
            </p>
            <Link to="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 32px', borderRadius: 18, fontSize: 16, fontWeight: 800, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 6px 40px rgba(124,58,237,0.5)', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <Zap size={18} /> Empezar ahora — Es gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(124,58,237,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={11} color="white" />
            </div>
            RifasApp
          </div>
          <span>© {new Date().getFullYear()} — Plataforma SaaS de rifas online</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Iniciar sesión</Link>
            <Link to="/registro" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Registrarse</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media(min-width:640px){ .sm-show{ display:inline-flex !important; } }
      `}</style>
    </div>
  );
}
