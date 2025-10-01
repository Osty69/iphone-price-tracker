import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

export const initDatabase = () => {
    return new Promise((resolve, reject) => {
        // Ensure data directory exists
        try {
            mkdirSync(join(__dirname, '..', 'data'), { recursive: true });
        } catch (err) {
            // Directory might already exist
        }

        const dbPath = join(__dirname, '..', 'data', 'prices.db');
        
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
            } else {
                console.log('Connected to SQLite database');
                
                // Create tables
                db.run(`
                    CREATE TABLE IF NOT EXISTS stores (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        url TEXT NOT NULL UNIQUE,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    db.run(`
                        CREATE TABLE IF NOT EXISTS price_history (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            store_id INTEGER,
                            price DECIMAL(10,2),
                            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (store_id) REFERENCES stores (id)
                        )
                    `, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        // Insert initial stores
                        initStores();
                        resolve();
                    });
                });
            }
        });
    });
};

const initStores = () => {
    const stores = [
        { name: 'BigGeek', url: 'https://biggeek.ru/products/smartfon-apple-iphone-17-pro-1-tb-kosmiceskij-oranzevyj-cosmic-orange#esim' },
        { name: 'Sotovik', url: 'https://spb.sotovik.shop/catalog/smartfony/apple_iphone_1/iphone_17_pro/15957/' },
        { name: 'iPiter', url: 'https://ipiter.ru/shop/apple_iphone_17_pro_1tb_nano-sim_esim_cosmic_orange_color' },
        { name: 'iStudio', url: 'https://spb.istudio-shop.ru/catalog/iphone/iphone-17-pro/apple-iphone-17-pro-1tb.html' },
        { name: 'ReStore', url: 'https://re-store.ru/catalog/10117PRO1TBORGE/' },
        { name: 'PiterGSM', url: 'https://pitergsm.ru/catalog/phones/iphone/iphone-17-pro/esim/122644/' },
        { name: 'Wildberries', url: 'https://www.wildberries.ru/catalog/521563039/detail.aspx?size=720581923' },
        { name: 'TehnoYard', url: 'http://tehnoyard.ru/smartfony/appleiphone/iphone-17-pro/apple-iphone-17-pro-1tb-esim-cosmic-orange-oranzhevyj' }
    ];

    stores.forEach(store => {
        db.run(
            'INSERT OR IGNORE INTO stores (name, url) VALUES (?, ?)',
            [store.name, store.url],
            (err) => {
                if (err) {
                    console.error('Error inserting store:', store.name, err);
                }
            }
        );
    });
};

export const getDb = () => db;