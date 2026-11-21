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
  pgm.createTable('orders', {
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
    table_number: {
      type: 'TEXT',
      notNull: true,
    },
    status: {
      type: 'TEXT',
      notNull: true,
      default: 'pending',
    },
    total_price: {
      type: 'INTEGER',
      notNull: true,
    },
    payment_reference: {
      type: 'TEXT',
      notNull: true,
      unique: true,
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

  pgm.createIndex('orders', 'customer_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('orders');
};
