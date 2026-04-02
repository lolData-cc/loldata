export function getWinrateClass(
  winrate: string | number,
  games: number = 0,
  type: 'background' | 'text' = 'text'
): string {
  const num = typeof winrate === 'number' ? winrate : parseFloat(winrate);
  if (isNaN(num)) return '';

  const glowGradient =
    'bg-gradient-to-r from-jade via-[#60ffc0] to-jade bg-[length:200%_200%] bg-clip-text text-transparent animate-glow drop-shadow-[0_0_6px_rgba(0,217,146,0.4)]';

  if (type === 'background') {
    if (num >= 80 && games >= 5) return 'bg-jade';
    if (num >= 70) return 'bg-jade/80';
    if (num >= 60) return 'bg-jade/60';
    return 'bg-flash/30';
  }

  if (num >= 80 && games >= 5) return glowGradient;
  if (num >= 70) return 'text-jade';
  if (num >= 60) return 'text-jade/70';
  return 'text-flash/50';
}
