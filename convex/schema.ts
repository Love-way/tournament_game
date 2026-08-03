import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  players: defineTable({
    pseudo: v.string(),
    game: v.string(),
    avatar: v.string(),
    joinedAt: v.number(),
  }),
  matches: defineTable({
    player1Id: v.optional(v.id('players')),
    player2Id: v.optional(v.id('players')),
    winnerId: v.optional(v.id('players')),
    round: v.number(),
    matchIndex: v.number(),
    tournamentId: v.string(),
    // Number of legs for this confrontation: 1 (simple) or 2 (aller-retour).
    legs: v.optional(v.number()),
    // Per-leg scores, used only when legs === 2. Winner = higher cumulative score.
    score1Leg1: v.optional(v.number()),
    score2Leg1: v.optional(v.number()),
    score1Leg2: v.optional(v.number()),
    score2Leg2: v.optional(v.number()),
  }),
  tournament: defineTable({
    started: v.boolean(),
    startedAt: v.optional(v.number()),
  }),
});
