export function getWinrateClass(
  winrate: string | number,
  games: number = 0,
  type: 'background' | 'text' = 'text'
): string {
  const num = typeof winrate === 'number' ? winrate : parseFloat(winrate);
  if (isNaN(num)) return '';

  const gradientClass =
    'bg-gradient-to-r from-[#148460] via-cyan-300 to-[#00d992] bg-clip-text text-transparent';

  if (type === 'background') {
    if (num >= 80 && games >= 5) {
      return `${gradientClass} animate-glow`; 
    } else if (num >= 70) {
      return 'bg-cyan-600';
    } else if (num >= 60) {
      return 'bg-cyan-400';
    } else {
      return 'bg-gray-300';
    }
  } else {
    if (num >= 80 && games >= 5) {
      return `${gradientClass} animate-glow`;
    } else if (num >= 70) {
      return 'text-cyan-600';
    } else if (num >= 60) {
      return 'text-cyan-400';
    } else {
      return 'text-gray-400';
    }
  }
}
