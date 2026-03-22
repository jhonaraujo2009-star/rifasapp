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
      <div className="text-center py-2 px-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-semibold">
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
    <div className="flex items-center justify-center gap-2">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="glass w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl">
            <span className="text-lg md:text-xl font-black text-white tabular-nums">
              {String(value ?? 0).padStart(2, '0')}
            </span>
          </div>
          <span className="text-xs text-white/40 mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
}
