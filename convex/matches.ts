import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { MutationCtx } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('matches').collect();
  },
});

// Quarts and Demi-finales are played aller-retour (2 legs); Huitièmes and
// Finale stay a single confrontation, regardless of bracket size.
function legsForRound(round: number, totalRounds: number): number {
  const fromEnd = totalRounds - round;
  return fromEnd === 1 || fromEnd === 2 ? 2 : 1;
}

export const generate = mutation({
  args: { playerIds: v.array(v.id('players')) },
  handler: async (ctx, args) => {
    // Clear existing matches
    const existing = await ctx.db.query('matches').collect();
    for (const m of existing) await ctx.db.delete(m._id);

    const players = args.playerIds;
    const n = players.length;
    if (n < 2) return;

    const totalRounds = Math.ceil(Math.log2(n));
    const bracketSize = Math.pow(2, totalRounds);
    const tournamentId = Date.now().toString();

    // Pad with nulls to nearest power of 2
    const padded: (Id<'players'> | null)[] = [...players];
    while (padded.length < bracketSize) padded.push(null);

    // Track match IDs by "round:index" for propagation
    const matchMap = new Map<string, Id<'matches'>>();

    // Create all round 2+ empty slots first
    for (let round = 2; round <= totalRounds; round++) {
      const count = bracketSize / Math.pow(2, round);
      for (let idx = 0; idx < count; idx++) {
        const id = await ctx.db.insert('matches', {
          round,
          matchIndex: idx,
          tournamentId,
          legs: legsForRound(round, totalRounds),
        });
        matchMap.set(`${round}:${idx}`, id);
      }
    }

    // Helper: propagate winner to next round slot
    const propagate = async (winnerId: Id<'players'>, round: number, matchIndex: number) => {
      const nextRound = round + 1;
      if (nextRound > totalRounds) return;
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const isSlot1 = matchIndex % 2 === 0;
      const nextId = matchMap.get(`${nextRound}:${nextMatchIndex}`);
      if (!nextId) return;
      if (isSlot1) {
        await ctx.db.patch(nextId, { player1Id: winnerId });
      } else {
        await ctx.db.patch(nextId, { player2Id: winnerId });
      }
    };

    // Create round 1 matches
    for (let matchIdx = 0; matchIdx < bracketSize / 2; matchIdx++) {
      const p1 = padded[matchIdx * 2];
      const p2 = padded[matchIdx * 2 + 1];

      // Skip null-null slots
      if (p1 === null && p2 === null) continue;

      const isBye = (p1 !== null && p2 === null) || (p1 === null && p2 !== null);
      const winner = isBye ? (p1 ?? p2) : undefined;

      const id = await ctx.db.insert('matches', {
        player1Id: p1 ?? undefined,
        player2Id: p2 ?? undefined,
        winnerId: winner ?? undefined,
        round: 1,
        matchIndex: matchIdx,
        tournamentId,
        legs: legsForRound(1, totalRounds),
      });
      matchMap.set(`1:${matchIdx}`, id);

      // Immediately propagate bye winners
      if (winner) {
        await propagate(winner, 1, matchIdx);
      }
    }
  },
});

// Propagates a confrontation's winner into the next round's player slot.
async function propagateWinner(ctx: MutationCtx, match: Doc<'matches'>, winnerId: Id<'players'>) {
  const nextRound = match.round + 1;
  const nextMatchIndex = Math.floor(match.matchIndex / 2);
  const isSlot1 = match.matchIndex % 2 === 0;

  const nextMatch = await ctx.db
    .query('matches')
    .filter((q) =>
      q.and(
        q.eq(q.field('round'), nextRound),
        q.eq(q.field('matchIndex'), nextMatchIndex),
        q.eq(q.field('tournamentId'), match.tournamentId)
      )
    )
    .first();
  if (!nextMatch) return;

  await ctx.db.patch(nextMatch._id, isSlot1 ? { player1Id: winnerId } : { player2Id: winnerId });
}

// Clears winnerId starting at (round, matchIndex) and cascades upward through
// the bracket as long as each subsequent match already had a winner decided.
async function cascadeClear(ctx: MutationCtx, tournamentId: string, round: number, matchIndex: number) {
  let curRound = round;
  let curMatchIndex = matchIndex;
  while (true) {
    const m = await ctx.db
      .query('matches')
      .filter((q) =>
        q.and(
          q.eq(q.field('tournamentId'), tournamentId),
          q.eq(q.field('round'), curRound),
          q.eq(q.field('matchIndex'), curMatchIndex)
        )
      )
      .first();
    if (!m || !m.winnerId) break;
    await ctx.db.patch(m._id, { winnerId: undefined });
    curMatchIndex = Math.floor(curMatchIndex / 2);
    curRound++;
  }
}

// Sets a confrontation's winner, propagates it forward, and — if this
// overturns a previously decided winner — cascade-clears the branch that
// depended on the old result.
async function setConfrontationWinner(ctx: MutationCtx, match: Doc<'matches'>, winnerId: Id<'players'>) {
  const oldWinnerId = match.winnerId;
  const winnerChanged = !!oldWinnerId && oldWinnerId !== winnerId;

  await ctx.db.patch(match._id, { winnerId });
  await propagateWinner(ctx, match, winnerId);

  if (winnerChanged) {
    const nextRound = match.round + 1;
    const nextMatchIndex = Math.floor(match.matchIndex / 2);
    await cascadeClear(ctx, match.tournamentId, nextRound, nextMatchIndex);
  }
}

export const setWinner = mutation({
  args: { matchId: v.id('matches'), winnerId: v.id('players') },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;
    await setConfrontationWinner(ctx, match, args.winnerId);
  },
});

// Records the score for one leg of an aller-retour confrontation. Once both
// legs have a score, the cumulative winner is decided automatically; a tied
// aggregate leaves the confrontation open for a manual decision via setWinner.
export const setLegScore = mutation({
  args: {
    matchId: v.id('matches'),
    leg: v.union(v.literal(1), v.literal(2)),
    score1: v.number(),
    score2: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;
    if (match.legs !== 2) {
      throw new Error('Ce match ne se joue pas en aller-retour.');
    }
    if (!match.player1Id || !match.player2Id) {
      throw new Error('Les deux joueurs de cette confrontation ne sont pas encore connus.');
    }
    if (
      !Number.isInteger(args.score1) || args.score1 < 0 ||
      !Number.isInteger(args.score2) || args.score2 < 0
    ) {
      throw new Error('Score invalide.');
    }

    await ctx.db.patch(match._id, args.leg === 1
      ? { score1Leg1: args.score1, score2Leg1: args.score2 }
      : { score1Leg2: args.score1, score2Leg2: args.score2 });

    const updated = await ctx.db.get(match._id);
    if (!updated) return;

    const { score1Leg1, score2Leg1, score1Leg2, score2Leg2 } = updated;
    const bothLegsPlayed =
      score1Leg1 !== undefined && score2Leg1 !== undefined &&
      score1Leg2 !== undefined && score2Leg2 !== undefined;
    if (!bothLegsPlayed) return;

    const agg1 = score1Leg1! + score1Leg2!;
    const agg2 = score2Leg1! + score2Leg2!;

    if (agg1 === agg2) {
      // Cumulative tie — require a manual decision (setWinner) to proceed.
      if (updated.winnerId) {
        await cascadeClear(ctx, updated.tournamentId, updated.round, updated.matchIndex);
      }
      return;
    }

    const winnerId = agg1 > agg2 ? updated.player1Id! : updated.player2Id!;
    await setConfrontationWinner(ctx, updated, winnerId);
  },
});
