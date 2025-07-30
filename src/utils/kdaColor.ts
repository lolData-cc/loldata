export function getKdaClass(kda: string | number): string {
  if (kda === 'Perfect') {
    return 'bg-gradient-to-r from-blue-500 via-cyan-300 to-green-300 text-transparent bg-clip-text animate-glow';
  }

  const num = typeof kda === 'number' ? kda : parseFloat(kda);
  if (isNaN(num)) return '';

  if (num < 2) {
    return 'text-flash/30';
  } else if (num >= 3 && num < 4) {
    return 'text-cyan-600';
  } else if (num >= 4 && num < 5) {
    return 'text-cyan-400';
  } else if (num > 5) {
    return 'text-orange-400';
  }

  return '';
}

export function getKdaBackgroundStyle(kda: string | number) {
  if (kda === 'Perfect') {
    return {
      className: 'bg-gradient-to-r from-[#148460] via-cyan-300 to-[#00d992] animate-glow text-black',
      style: {},
    };
  }

  const num = typeof kda === 'number' ? kda : parseFloat(kda);
  if (isNaN(num)) return { className: 'bg-neutral-800', style: {} };

  if (num <= 1) {
    return { className: 'text-black', style: { backgroundColor: '#148460' } };
  }

  if (num > 5) {
    return {
      className: 'bg-gradient-to-r from-[#148460] via-cyan-300 to-[#00d992] animate-glow text-black',
      style: {},
    };
  }

  // Interpolazione: 1 < num <= 5 → NIENTE animate-glow
  const t = Math.min(Math.max((num - 1) / 4, 0), 1);

  const interpolate = (start: number, end: number, factor: number) =>
    Math.round(start + (end - start) * factor);

  const r = interpolate(20, 0, t);
  const g = interpolate(132, 217, t);
  const b = interpolate(96, 146, t);

  return {
    className: 'text-black', // ❌ niente animate-glow
    style: { backgroundColor: `rgb(${r}, ${g}, ${b})` },
  };
}
