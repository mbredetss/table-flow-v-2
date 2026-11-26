import 'dotenv/config'
import { text } from 'express';
import { Pool } from 'pg';

export const seedCategory = async (poolInstance) => {
    const pool = poolInstance || new Pool({ connectionString: process.env.DATABASE_URL });

    await pool.query({
        text: 'TRUNCATE TABLE menu_items CASCADE', 
    });

    const categories = ['Food', 'Drinks', 'Desserts'];
    for (const category of categories) {
        const query = {
            text: `INSERT INTO menu_categories (name)
           VALUES ($1)`,
            values: [category],
        };
        await pool.query(query);
    };

    if (!poolInstance) {
        await pool.end();
    }
};

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/scripts/seed-category.js')) {
    seedCategory()
        .then(() => {
            console.log('Admin user seeded successfully:');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Failed to seed admin user:', err);
            process.exit(1);
        });
}
