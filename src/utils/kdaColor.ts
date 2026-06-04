export function getKdaClass(kda: string | number): string {
  if (kda === 'Perfect') {
    return 'bg-gradient-to-r from-jade via-[#60ffc0] to-jade bg-[length:200%_200%] bg-clip-text text-transparent animate-glow';
  }

  const num = typeof kda === 'number' ? kda : parseFloat(kda);
  if (isNaN(num)) return '';

  if (num < 2) return 'text-flash/30';
  if (num < 3) return 'text-flash/50';
  if (num < 4) return 'text-jade/70';
  if (num < 5) return 'text-jade';
  return 'text-jade drop-shadow-[0_0_4px_rgba(0,217,146,0.4)]';
}

export function getKdaBackgroundStyle(kda: string | number) {
  if (kda === 'Perfect') {
    return {
      className: '!text-liquirice !font-black',
      style: {
        background: 'linear-gradient(90deg, #00d992, #00b8ff, #60ffc0, #00d992)',
        backgroundSize: '200% 100%',
        animation: 'perfectKdaShift 2s ease-in-out infinite',
        boxShadow: '0 0 12px rgba(0,217,146,0.4), 0 0 24px rgba(0,184,255,0.2)',
      },
    };
  }

  const num = typeof kda === 'number' ? kda : parseFloat(kda);
  if (isNaN(num)) return { className: 'border-flash/10', style: { backgroundColor: 'rgba(215, 216, 217, 0.05)' } };

  if (num < 1.5) {
    return {
      className: 'border-[#c93232]/20',
      style: { backgroundColor: 'rgba(201, 50, 50, 0.15)' },
    };
  }

  if (num < 2.5) {
    return {
      className: 'border-flash/10',
      style: { backgroundColor: 'rgba(215, 216, 217, 0.08)' },
    };
  }

  if (num < 3.5) {
    return {
      className: 'border-jade/15',
      style: { backgroundColor: 'rgba(0, 217, 146, 0.1)' },
    };
  }

  if (num < 5) {
    return {
      className: 'border-jade/20',
      style: { backgroundColor: 'rgba(0, 217, 146, 0.15)' },
    };
  }

  return {
    className: 'border-jade/30',
    style: { backgroundColor: 'rgba(0, 217, 146, 0.2)', boxShadow: '0 0 8px rgba(0, 217, 146, 0.15)' },
  };
}
