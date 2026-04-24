import { useEffect, useState } from 'react';

export default function CountdownTimer({ fechaSorteo }) {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    if (!fechaSorteo) return;
    const target = fechaSorteo?.seconds ? fechaSorteo.seconds * 1000 : new Date(fechaSorteo).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ expired: true });
        return;
      }
      setTimeLeft({
        dias: Math.floor(diff / (1000 * 60 * 60 * 24)),
        horas: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutos: Math.floor((diff / (1000 * 60)) % 60),
        segundos: Math.floor((diff / 1000) % 60),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fechaSorteo]);

  if (!fechaSorteo) return null;

  if (timeLeft.expired) {
    return (
      <div style={{
        textAlign: 'center', padding: '10px 16px', borderRadius: 12,
        background: '#fee2e2', border: '1px solid #fca5a5',
        color: '#b91c1c', fontSize: 14, fontWeight: 700
      }}>
        🎉 ¡El sorteo ya se realizó!
      </div>
    );
  }

  const units = [
    { label: 'Días', value: timeLeft.dias },
    { label: 'Horas', value: timeLeft.horas },
    { label: 'Min', value: timeLeft.minutos },
    { label: 'Seg', value: timeLeft.segundos },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {units.map(({ label, value }, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 12, background: '#f3f4f6', border: '1px solid #e5e7eb',
            }}>
              <span style={{
                fontSize: 22, fontWeight: 900, color: '#1f2937',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {String(value ?? 0).padStart(2, '0')}
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span style={{
              fontSize: 20, fontWeight: 900, color: '#d1d5db',
              marginBottom: 18, /* offset label height */
            }}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}
