/**
 * Shuffle an array using Fisher-Yates algorithm.
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get the round name based on position from the end.
 */
export function getRoundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return '🏆 FINALE';
  if (fromEnd === 1) return 'DEMI-FINALE';
  if (fromEnd === 2) return 'QUARTS';
  if (fromEnd === 3) return 'HUITIÈMES';
  return `TOUR ${round}`;
}

/**
 * Calculate total rounds for n players.
 */
export function getTotalRounds(n: number): number {
  if (n < 2) return 0;
  return Math.ceil(Math.log2(n));
}
