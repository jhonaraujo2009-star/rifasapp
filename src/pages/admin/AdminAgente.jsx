// =============================================================
//  AdminAgente.jsx
//  Agente de IA exclusivo para el administrador.
//  Soporta: texto, voz (MediaRecorder), Function Calling con
//  Firebase y generación automática de ticket con html2canvas.
// =============================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { runAgent } from '../../lib/geminiAgent';
import { verificarDisponibilidad, actualizarEstadoNumeros } from '../../lib/firebaseTools';
import html2canvas from 'html2canvas-pro';
import {
  Bot, Mic, MicOff, Send, Download, Sparkles,
  CheckCircle, AlertCircle, Loader2, Ticket
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Helpers ─────────────────────────────────────────────────── */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function parseNumeros(arr) {
  return arr.map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n >= 0 && n <= 999);
}

/* ── Diseño del ticket (idéntico a AdminTicket.jsx) ────────── */
function TicketCard({ rifaName, nombre, numeros, fecha }) {
  return (
    <div
      style={{
        width: 420,
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 4px 30px rgba(0,0,0,0.35)',
        flexShrink: 0,
      }}
    >
      <div style={{ background: '#ffffff', position: 'relative' }}>
        {/* Watermark */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden',
          pointerEvents: 'none', borderRadius: 18,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 0,
        }}>
          {Array.from({ length: 7 }).map((_, rowIdx) => (
            <div key={rowIdx} style={{
              display: 'flex', gap: '32px', whiteSpace: 'nowrap',
              transform: `rotate(-35deg) translateX(${rowIdx % 2 === 0 ? '-40px' : '20px'})`,
              marginBottom: '18px', opacity: 0.07,
            }}>
              {Array.from({ length: 4 }).map((_, colIdx) => (
                <span key={colIdx} style={{
                  fontSize: 18, fontWeight: 800, color: '#7c3aed',
                  letterSpacing: '3px', fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase', userSelect: 'none', flexShrink: 0,
                }}>Rifas Albeiro</span>
              ))}
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          padding: '22px 24px 20px', textAlign: 'center',
          position: 'relative', overflow: 'hidden', zIndex: 1,
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -15, left: -15, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 8, position: 'relative' }}>
            Comprobante de Compra
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.3px', position: 'relative' }}>
            {rifaName}
          </div>
        </div>

        {/* Info rows */}
        <div style={{ padding: '20px 24px 0', position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Comprador', value: nombre, valueStyle: { fontSize: 15, fontWeight: 800, color: '#1a1a2e' } },
            { label: 'Fecha', value: fecha, valueStyle: { fontSize: 14, fontWeight: 600, color: '#444' } },
            {
              label: 'Cantidad',
              value: `${numeros.length} ${numeros.length === 1 ? 'número' : 'números'}`,
              valueStyle: { fontSize: 13, fontWeight: 700, color: '#7c3aed', background: '#f3f0ff', padding: '4px 12px', borderRadius: 6 },
            },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</span>
              <span style={row.valueStyle}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Notch divider */}
        <div style={{ position: 'relative', height: 28, margin: '8px 0', zIndex: 1 }}>
          <div style={{ position: 'absolute', left: 28, right: 28, top: '50%', borderTop: '2px dashed #e0e0e0' }} />
          <div style={{ position: 'absolute', left: -14, top: 0, width: 28, height: 28, borderRadius: '50%', background: '#060612' }} />
          <div style={{ position: 'absolute', right: -14, top: 0, width: 28, height: 28, borderRadius: '50%', background: '#060612' }} />
        </div>

        {/* Numbers */}
        <div style={{ padding: '0 24px 22px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 14, textAlign: 'center' }}>
            Tus Números
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', padding: '18px 14px', borderRadius: 14, background: '#faf9ff', border: '1px solid #ede9fe' }}>
            {numeros.map(num => (
              <div key={num} style={{
                minWidth: 54, padding: '10px 14px', borderRadius: 10,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: '#ffffff', fontSize: 18, fontWeight: 900, textAlign: 'center',
                fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
                letterSpacing: '2px', boxShadow: '0 3px 10px rgba(124,58,237,0.25)',
              }}>
                {String(num).padStart(3, '0')}
              </div>
            ))}
          </div>
        </div>

        {/* Footer contact */}
        <div style={{ padding: '14px 24px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#777', lineHeight: 1.8 }}>
            📍 Mercado Principal de Tovar, frente a la tienda de maquillaje
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginTop: 2 }}>
            📞 0412-049-6690
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ height: 5, background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)', position: 'relative', zIndex: 1 }} />
      </div>
    </div>
  );
}

/* ── Burbuja de mensaje ─────────────────────────────────────── */
function MessageBubble({ msg, onDownload }) {
  const isAgent = msg.role === 'agent';

  return (
    <div style={{
      display: 'flex', gap: 10, marginBottom: 18,
      flexDirection: isAgent ? 'row' : 'row-reverse',
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: isAgent ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isAgent ? '0 0 12px rgba(124,58,237,0.3)' : 'none',
        border: isAgent ? 'none' : '1px solid rgba(255,255,255,0.1)',
      }}>
        {isAgent ? <Bot size={16} color="white" /> : <span style={{ fontSize: 14 }}>👤</span>}
      </div>

      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Text bubble */}
        {msg.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: isAgent ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
            background: isAgent ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.07)',
            border: isAgent ? '1px solid rgba(124,58,237,0.2)' : '1px solid rgba(255,255,255,0.08)',
            color: 'white', fontSize: 14, lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {msg.text}
          </div>
        )}

        {/* Status pill (audio/loading) */}
        {msg.type === 'audio' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', width: 'fit-content' }}>
            <Mic size={12} color="#a78bfa" />
            <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>Mensaje de voz</span>
          </div>
        )}

        {/* Ticket image */}
        {msg.ticketImage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            <img
              src={msg.ticketImage}
              alt="Ticket generado"
              style={{ maxWidth: 320, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              onClick={() => onDownload(msg.ticketImage, msg.ticketName)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
              }}
            >
              <Download size={14} /> Guardar ticket
            </button>
          </div>
        )}

        {/* Function call feedback pills */}
        {msg.actions?.map((a, i) => (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20, width: 'fit-content',
            background: a.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${a.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            {a.ok
              ? <CheckCircle size={12} color="#10b981" />
              : <AlertCircle size={12} color="#f87171" />}
            <span style={{ fontSize: 12, color: a.ok ? '#6ee7b7' : '#f87171', fontWeight: 600 }}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Componente principal ───────────────────────────────────── */
export default function AdminAgente() {
  const { currentUser } = useAuth();

  const [store, setStore]           = useState(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingTicket, setPendingTicket] = useState(null); // { nombre, numeros }

  const messagesEndRef   = useRef(null);
  const hiddenTicketRef  = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const ticketDataRef    = useRef(null);   // almacena datos del ticket mientras el agente responde
  const ticketResolveRef = useRef(null);   // resolve de la promesa de captura

  /* ── Cargar tienda activa ───────────────────────────────── */
  useEffect(() => {
    if (!currentUser) return;
    getDocs(query(collection(db, 'stores'), where('ownerId', '==', currentUser.uid)))
      .then(snap => {
        if (!snap.empty) setStore({ id: snap.docs[0].id, ...snap.docs[0].data() });
        setStoreLoading(false);
      });
  }, [currentUser]);

  /* ── Mensaje de bienvenida ──────────────────────────────── */
  useEffect(() => {
    if (!storeLoading) {
      setMessages([{
        id: Date.now(),
        role: 'agent',
        text: `¡Hola! 👋 Soy tu asistente IA para la rifa **${store?.nombre || 'activa'}**.\n\nPuedo ayudarte a:\n• 🔍 Verificar disponibilidad de números\n• ✅ Marcar números como vendidos o disponibles\n• 🎫 Generar tickets automáticamente\n\nEscribe un comando o mantén presionado el micrófono para hablar.`,
      }]);
    }
  }, [storeLoading]);

  /* ── Auto-scroll al fondo ───────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Captura del ticket oculto cuando se renderiza ─────── */
  useEffect(() => {
    if (!pendingTicket || !hiddenTicketRef.current) return;

    // Dar tiempo al DOM para renderizar
    const timer = setTimeout(async () => {
      try {
        const canvas = await html2canvas(hiddenTicketRef.current, {
          backgroundColor: '#ffffff',
          scale: 3,
          useCORS: true,
          logging: false,
        });
        const imageUrl = canvas.toDataURL('image/png');

        // Resolver la promesa para que el agente pueda continuar
        if (ticketResolveRef.current) {
          ticketResolveRef.current({ imageUrl, nombre: pendingTicket.nombre });
          ticketResolveRef.current = null;
        }
      } catch (err) {
        console.error('Error capturando ticket:', err);
        if (ticketResolveRef.current) {
          ticketResolveRef.current({ imageUrl: null, nombre: pendingTicket.nombre });
          ticketResolveRef.current = null;
        }
      } finally {
        setPendingTicket(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pendingTicket]);

  /* ── Callback que Gemini invoca para cada función ────────── */
  const onFunctionCall = useCallback(async (name, args) => {
    if (!store) return { error: 'No hay tienda activa' };

    if (name === 'verificarDisponibilidad') {
      const numeros = args.numeros || [];
      const result = await verificarDisponibilidad(store.id, numeros);
      // Pill de acción en el chat
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'agent-actions') {
          return [...prev.slice(0, -1), { ...last, actions: [...(last.actions || []), { ok: true, label: `🔍 Verificados: ${numeros.join(', ')}` }] }];
        }
        return [...prev, { id: Date.now(), role: 'agent', text: '', actions: [{ ok: true, label: `🔍 Verificados: ${numeros.join(', ')}` }] }];
      });
      return result;
    }

    if (name === 'actualizarEstadoNumeros') {
      const { numeros = [], estado } = args;
      const result = await actualizarEstadoNumeros(store.id, numeros, estado);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(), role: 'agent', text: '',
          actions: [{
            ok: true,
            label: `${estado === 'vendido' ? '✅ Marcados vendidos' : '🔄 Marcados disponibles'}: ${numeros.join(', ')}`,
          }],
        },
      ]);
      return result;
    }

    if (name === 'generarTicket') {
      const { nombre_comprador, numeros = [] } = args;
      const parsedNumeros = parseNumeros(numeros);

      // Preparar ticket oculto y capturar
      const imageData = await new Promise(resolve => {
        ticketResolveRef.current = resolve;
        setPendingTicket({ nombre: nombre_comprador, numeros: parsedNumeros });
      });

      if (imageData?.imageUrl) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(), role: 'agent', text: '',
            ticketImage: imageData.imageUrl,
            ticketName: `ticket_${nombre_comprador.replace(/\s+/g, '_')}`,
          },
        ]);
      }

      return { success: true, nombre_comprador, numeros: parsedNumeros, mensaje: 'Ticket generado y mostrado en el chat.' };
    }

    return { error: `Función desconocida: ${name}` };
  }, [store]);

  /* ── Hablar respuesta en audio (TTS) ────────────────────── */
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Detener si está hablando
    
    // Limpiar markdown básico para mejor lectura
    const cleanText = text.replace(/[*_#]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES'; // Español
    utterance.rate = 1.05;    // Un poquito más rápido
    window.speechSynthesis.speak(utterance);
  };

  /* ── Enviar mensaje de texto ────────────────────────────── */
  const sendText = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }]);
    setLoading(true);

    try {
      const reply = await runAgent({
        textInput: text,
        rifaName: store?.nombre || 'Rifa activa',
        onFunctionCall,
      });
      setMessages(prev => [...prev, { id: Date.now(), role: 'agent', text: reply }]);
      speakText(reply);
    } catch (err) {
      console.error('Error agente:', err);
      const errMsg = err?.message || String(err);
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'agent',
        text: `⚠️ Error: ${errMsg}\n\nSi el error menciona la API key, reinicia el servidor con: npm run dev`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Grabar audio (toggle: clic para iniciar / clic para detener) ── */
  const toggleRecording = async () => {
    if (loading) return;

    // Si ya está grabando → detener y enviar
    if (isRecording) {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    // Iniciar grabación
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      const startTime = Date.now();

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());

        const duration = Date.now() - startTime;
        if (duration < 800 || audioChunksRef.current.length === 0) {
          toast.error('Grabación muy corta. Habla por al menos 1 segundo.');
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const base64 = await blobToBase64(blob);

        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: '', type: 'audio' }]);
        setLoading(true);

        try {
          const reply = await runAgent({
            audioBase64: base64,
            audioMimeType: mimeType,
            rifaName: store?.nombre || 'Rifa activa',
            onFunctionCall,
          });
          setMessages(prev => [...prev, { id: Date.now(), role: 'agent', text: reply }]);
          speakText(reply);
        } catch (err) {
          console.error('Error agente audio:', err);
          const errMsg = err?.message || String(err);
          setMessages(prev => [...prev, {
            id: Date.now(), role: 'agent',
            text: `⚠️ Error procesando audio: ${errMsg}`,
          }]);
        } finally {
          setLoading(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.success('🎤 Grabando... Toca el micrófono de nuevo para enviar', { duration: 2000 });
    } catch (err) {
      toast.error('No se pudo acceder al micrófono: ' + err.message);
    }
  };

  /* ── Descargar ticket ───────────────────────────────────── */
  const handleDownload = (imageUrl, name) => {
    const link = document.createElement('a');
    link.download = `${name}_${Date.now()}.png`;
    link.href = imageUrl;
    link.click();
    toast.success('✅ Ticket guardado');
  };

  /* ── Render ─────────────────────────────────────────────── */
  if (storeLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const rifaName = store?.nombre || 'Rifa Activa';

  return (
    <div style={{ maxWidth: 800, fontFamily: 'Inter, sans-serif', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 4 }}>
          Inteligencia Artificial
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
            <Bot size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0 }}>Agente IA Admin</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              Rifa activa: <span style={{ color: '#c4b5fd', fontWeight: 600 }}>{rifaName}</span>
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7' }}>En línea</span>
          </div>
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px 4px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.3) transparent',
      }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} onDownload={handleDownload} />
        ))}

        {/* Indicador de carga */}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={16} color="white" />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} color="#a78bfa" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Procesando...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, padding: '14px 0 4px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          {/* Text input */}
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
              placeholder='Escribe un comando... ej: "Marca el 031 como vendido y hazle el ticket a María"'
              rows={2}
              disabled={loading || isRecording}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 16px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white', fontSize: 14, outline: 'none',
                fontFamily: 'Inter, sans-serif', resize: 'none',
                lineHeight: 1.5,
                opacity: (loading || isRecording) ? 0.5 : 1,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#a78bfa'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Mic button — toggle */}
          <button
            onClick={toggleRecording}
            disabled={loading}
            title={isRecording ? 'Toca para enviar' : 'Toca para grabar'}
            style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: isRecording
                ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                : 'rgba(255,255,255,0.07)',
              color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isRecording ? '0 0 20px rgba(220,38,38,0.5)' : 'none',
              transition: 'all 0.2s',
              opacity: loading ? 0.4 : 1,
              border: isRecording ? '2px solid #dc2626' : '1px solid rgba(255,255,255,0.1)',
              animation: isRecording ? 'micPulse 1s ease-in-out infinite' : 'none',
            }}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Send button */}
          <button
            onClick={sendText}
            disabled={!input.trim() || loading || isRecording}
            style={{
              width: 48, height: 48, borderRadius: 14, border: 'none', flexShrink: 0,
              background: (!input.trim() || loading || isRecording)
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: 'white', cursor: (!input.trim() || loading || isRecording) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: (!input.trim() || loading) ? 'none' : '0 2px 12px rgba(124,58,237,0.4)',
              transition: 'all 0.2s',
            }}
          >
            <Send size={18} />
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '8px 0 0', textAlign: 'center' }}>
          Enter para enviar · {isRecording ? '🔴 Grabando — toca 🎤 de nuevo para enviar' : 'Toca 🎤 para grabar voz'} · Shift+Enter = nueva línea
        </p>
      </div>

      {/* ── Ticket oculto para captura ────────────────────────
          Posicionado fuera de la pantalla pero visible para html2canvas
      ─────────────────────────────────────────────────────── */}
      {pendingTicket && (
        <div
          style={{
            position: 'fixed',
            left: -9999, top: -9999,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          <div ref={hiddenTicketRef}>
            <TicketCard
              rifaName={rifaName}
              nombre={pendingTicket.nombre}
              numeros={pendingTicket.numeros}
              fecha={new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(220,38,38,0.5); }
          50% { box-shadow: 0 0 25px rgba(220,38,38,0.9); }
        }
      `}</style>
    </div>
  );
}
