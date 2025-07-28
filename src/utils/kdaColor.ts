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

export function getKdaBackgroundClass(kda: string | number): string {

  
  if (kda === 'Perfect') {
    return 'bg-gradient-to-r from-blue-500 via-cyan-300 to-green-300 animate-glow text-black';
  }

  const num = typeof kda === 'number' ? kda : parseFloat(kda);
  if (isNaN(num)) return 'bg-neutral-800';

  if (num < 2) {
    return 'bg-red-900';
  } else if (num >= 3 && num < 4) {
    return 'bg-cyan-900';
  } else if (num >= 4 && num < 5) {
    return 'bg-cyan-700';
  } else if (num > 5) {
    return 'bg-orange-600';
  }

  return 'bg-neutral-700';
}

