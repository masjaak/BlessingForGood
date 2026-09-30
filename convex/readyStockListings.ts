import { query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("readyStockListings").take(1);
    return rows.length;
  },
});
