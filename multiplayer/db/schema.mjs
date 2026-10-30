import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const rooms=sqliteTable('rooms',{
 code:text('code').primaryKey(),
 data:text('data').notNull(),
 version:integer('version').notNull().default(1),
 updatedAt:integer('updated_at').notNull()
},table=>[index('rooms_updated_at').on(table.updatedAt)]);
export const limits=sqliteTable('limits',{
 key:text('key').primaryKey(),
 count:integer('count').notNull(),
 expiresAt:integer('expires_at').notNull()
});
