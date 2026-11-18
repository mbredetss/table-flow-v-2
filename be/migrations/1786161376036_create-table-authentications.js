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
  pgm.createTable('authentications', {
    id: {
      type: 'UUID',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    refresh_token: {
      type: 'TEXT',
      notNull: true,
      unique: true,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('now()'),
    },
    expires_at: {
      type: 'TIMESTAMP',
      notNull: true,
    },
  });

  pgm.createIndex('authentications', 'refresh_token');
  pgm.createIndex('authentications', 'user_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('authentications');
};
