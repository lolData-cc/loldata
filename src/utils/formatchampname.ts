export function formatChampName(name?: string): string {
  if (!name) return 'Unknown';

  const forceUpperCase = ['IV', 'VI', 'VII'];

  return name
    .replace(/['’\.]/g, '')
    .split(/\s+/)          
    .map((part, index) => {
      if (index > 0 && forceUpperCase.includes(part.toUpperCase())) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}