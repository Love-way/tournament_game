import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('players').order('desc').collect();
  },
});

export const add = mutation({
  args: {
    pseudo: v.string(),
    game: v.string(),
    avatar: v.string(),
  },
  handler: async (ctx, args) => {
    const pseudo = args.pseudo.trim();
    if (pseudo.length < 2 || pseudo.length > 20) {
      throw new Error('Le pseudo doit faire entre 2 et 20 caractères.');
    }

    const tournament = await ctx.db.query('tournament').first();
    if (tournament?.started) {
      throw new Error('Les inscriptions sont fermées, le tournoi a déjà démarré.');
    }

    const existing = await ctx.db
      .query('players')
      .filter((q) => q.eq(q.field('pseudo'), pseudo))
      .first();
    if (existing) {
      throw new Error('Ce pseudo est déjà pris. Choisis-en un autre !');
    }

    return await ctx.db.insert('players', {
      pseudo,
      game: args.game,
      avatar: args.avatar,
      joinedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id('players') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const addAdmin = mutation({
  args: {
    pseudo: v.string(),
    game: v.string(),
    avatar: v.string(),
  },
  handler: async (ctx, args) => {
    const pseudo = args.pseudo.trim();
    if (!pseudo) throw new Error('Pseudo requis');

    const existing = await ctx.db
      .query('players')
      .filter((q) => q.eq(q.field('pseudo'), pseudo))
      .first();
    if (existing) {
      throw new Error('Ce pseudo est déjà pris !');
    }

    return await ctx.db.insert('players', {
      pseudo,
      game: args.game,
      avatar: args.avatar,
      joinedAt: Date.now(),
    });
  },
});
