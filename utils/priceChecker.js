import { getDb } from './database.js';
import { storeParsers } from '../parsers/storeParsers.js';

let isChecking = false;

export const checkAllPrices = async () => {
    if (isChecking) {
        console.log('Price check already in progress');
        return;
    }
    
    isChecking = true;
    console.log('Starting price check...');
    
    return new Promise((resolve) => {
        const db = getDb();
        
        db.all('SELECT * FROM stores WHERE is_active = 1', async (err, stores) => {
            if (err) {
                console.error('Error fetching stores:', err);
                isChecking = false;
                return;
            }

            const results = [];
            
            for (const store of stores) {
                try {
                    console.log(`Checking ${store.name}...`);
                    const parser = storeParsers[store.name] || storeParsers.default;
                    const price = await parser(store.url);
                    
                    if (price) {
                        console.log(`Found price for ${store.name}: ${price} руб.`);
                        
                        // Check if price has changed
                        db.get(
                            'SELECT price FROM price_history WHERE store_id = ? ORDER BY timestamp DESC LIMIT 1',
                            [store.id],
                            (err, lastPrice) => {
                                if (err) {
                                    console.error('Error checking last price:', err);
                                    return;
                                }
                                
                                if (!lastPrice || lastPrice.price !== price) {
                                    // Insert new price
                                    db.run(
                                        'INSERT INTO price_history (store_id, price) VALUES (?, ?)',
                                        [store.id, price],
                                        (err) => {
                                            if (err) {
                                                console.error('Error saving price:', err);
                                            } else {
                                                console.log(`Saved new price for ${store.name}: ${price} руб.`);
                                            }
                                        }
                                    );
                                }
                            }
                        );
                        
                        results.push({ store: store.name, price });
                    } else {
                        console.log(`No price found for ${store.name}`);
                    }
                    
                    // Delay between requests to be polite
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                } catch (error) {
                    console.error(`Error checking ${store.name}:`, error.message);
                }
            }
            
            isChecking = false;
            console.log('Price check completed');
            resolve(results);
        });
    });
};

export const startPriceChecker = () => {
    // Check immediately on start
    checkAllPrices();
    
    // Then check every hour
    setInterval(checkAllPrices, 60 * 60 * 1000);
};