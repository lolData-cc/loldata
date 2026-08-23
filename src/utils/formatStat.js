export function formatStat(num) {
    if (!isFinite(num))
        return "0";
    return Number.isInteger(num) ? num.toString() : num.toFixed(1);
}
