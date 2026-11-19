import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.test.env' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const seedAdmin = async (poolInstance) => {
  const pool = poolInstance || new Pool();
  const name = 'admin';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const role = 'admin';

  const hashedPassword = await bcrypt.hash(password, 12);

  const query = {
    text: `INSERT INTO users (name, email, password, role)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE
           SET name = EXCLUDED.name,
               password = EXCLUDED.password,
               role = EXCLUDED.role
           RETURNING id, name, email, role`,
    values: [name, email, hashedPassword, role],
  };

  const result = await pool.query(query);

  if (!poolInstance) {
    await pool.end();
  }

  return result.rows[0];
};

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/seed-admin.js')) {
  seedAdmin()
    .then((user) => {
      console.log('Admin user seeded successfully:', user);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to seed admin user:', err);
      process.exit(1);
    });
}

export default seedAdmin;
