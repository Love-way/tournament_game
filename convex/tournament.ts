import { mutation, query } from './_generated/server';

export const getState = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tournament').first();
  },
});

export const start = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('tournament').first();
    if (existing) {
      await ctx.db.patch(existing._id, { started: true, startedAt: Date.now() });
    } else {
      await ctx.db.insert('tournament', { started: true, startedAt: Date.now() });
    }
  },
});

export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query('players').collect();
    for (const p of players) await ctx.db.delete(p._id);

    const matches = await ctx.db.query('matches').collect();
    for (const m of matches) await ctx.db.delete(m._id);

    const tournament = await ctx.db.query('tournament').first();
    if (tournament) {
      await ctx.db.patch(tournament._id, { started: false, startedAt: undefined });
    }
  },
});
