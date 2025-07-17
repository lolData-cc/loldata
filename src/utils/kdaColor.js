export function getKdaClass(kda) {
    if (kda === 'Perfect') {
        return 'bg-gradient-to-r from-blue-500 via-cyan-300 to-green-300 text-transparent bg-clip-text animate-glow';
    }
    const num = typeof kda === 'number' ? kda : parseFloat(kda);
    if (isNaN(num))
        return '';
    if (num >= 4 && num < 5) {
        return 'text-cyan-400';
    }
    else if (num >= 3 && num < 4) {
        return 'text-cyan-600';
    }
    return '';
}
