import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('matches').collect();
  },
});

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
      });
      matchMap.set(`1:${matchIdx}`, id);

      // Immediately propagate bye winners
      if (winner) {
        await propagate(winner, 1, matchIdx);
      }
    }
  },
});

export const setWinner = mutation({
  args: { matchId: v.id('matches'), winnerId: v.id('players') },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    const oldWinnerId = match.winnerId;
    const winnerChanged = oldWinnerId && oldWinnerId !== args.winnerId;

    // Set the new winner
    await ctx.db.patch(args.matchId, { winnerId: args.winnerId });

    // Find next round match and update the player slot
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

    if (isSlot1) {
      await ctx.db.patch(nextMatch._id, { player1Id: args.winnerId });
    } else {
      await ctx.db.patch(nextMatch._id, { player2Id: args.winnerId });
    }

    // If winner changed, cascade-clear all subsequent rounds that had the old winner
    if (winnerChanged) {
      let curRound = nextRound;
      let curMatchIndex = nextMatchIndex;
      while (true) {
        const m = await ctx.db
          .query('matches')
          .filter((q) =>
            q.and(
              q.eq(q.field('tournamentId'), match.tournamentId),
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
  },
});
