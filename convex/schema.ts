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
  }),
  tournament: defineTable({
    started: v.boolean(),
    startedAt: v.optional(v.number()),
  }),
});
