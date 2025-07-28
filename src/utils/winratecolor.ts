export function getWinrateClass(
  winrate: string | number,
  type: 'background' | 'text' = 'text'
): string {
  const num = typeof winrate === 'number' ? winrate : parseFloat(winrate);
  if (isNaN(num)) return '';

  if (type === 'background') {
    if (num >= 81) {
      return 'bg-gradient-to-r from-blue-500 via-cyan-300 to-green-300';
    } else if (num >= 70) {
      return 'bg-cyan-600';
    } else if (num >= 60) {
      return 'bg-cyan-400';
    } else {
      return 'bg-gray-300';
    }
  } else {
    if (num >= 81) {
      return 'text-transparent bg-gradient-to-r from-blue-500 via-cyan-300 to-green-300 bg-clip-text';
    } else if (num >= 70) {
      return 'text-cyan-600';
    } else if (num >= 60) {
      return 'text-cyan-400';
    } else {
      return 'text-gray-400';
    }
  }
}