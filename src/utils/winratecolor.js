export function getWinrateClass(winrate) {
    const num = typeof winrate === 'number' ? winrate : parseFloat(winrate);
    if (isNaN(num))
        return '';
    if (num >= 81) {
        return 'bg-gradient-to-r from-blue-500 via-cyan-300 to-green-300 text-transparent bg-clip-text';
    }
    else if (num >= 70) {
        return 'text-cyan-600';
    }
    else if (num >= 60) {
        return 'text-cyan-400';
    }
    return '';
}
