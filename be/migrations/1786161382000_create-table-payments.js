/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('payments', {
    id: {
      type: 'UUID',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    customer_id: {
      type: 'UUID',
      notNull: true,
      references: 'users(id)',
    },
    midtrans_order_id: {
      type: 'TEXT',
      notNull: true,
      unique: true,
    },
    amount: {
      type: 'INTEGER',
      notNull: true,
    },
    status: {
      type: 'TEXT',
      notNull: true,
      default: "'pending'",
    },
    qris_url: {
      type: 'TEXT',
      notNull: false,
    },
    cart_snapshot: {
      type: 'JSONB',
      notNull: true,
    },
    order_id: {
      type: 'UUID',
      notNull: false,
      references: 'orders(id)',
    },
    expires_at: {
      type: 'TIMESTAMP',
      notNull: true,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('payments', 'midtrans_order_id');
  pgm.createIndex('payments', 'customer_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('payments');
};
