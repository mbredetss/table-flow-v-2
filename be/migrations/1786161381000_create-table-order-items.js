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
  pgm.createTable('order_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    order_id: {
      type: 'UUID',
      notNull: true,
      references: 'orders(id)',
      onDelete: 'CASCADE',
    },
    menu_item_id: {
      type: 'UUID',
      notNull: true,
      references: 'menu_items(id)',
      onDelete: 'RESTRICT',
    },
    quantity: {
      type: 'INTEGER',
      notNull: true,
      check: 'quantity > 0',
    },
    note: {
      type: 'TEXT',
      notNull: false,
    },
    unit_price: {
      type: 'INTEGER',
      notNull: true,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('order_items', 'order_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('order_items');
};
