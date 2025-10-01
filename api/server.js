const express = require('express');
const path = require('path');
const { storeParsers } = require('../parsers/priceParsers');

const app = express();

// Для Vercel
const isVercel = process.env.VERCEL === '1';
const publicPath = isVercel ? path.join(process.cwd(), 'public') : path.join(__dirname, '../public');

// Middleware
app.use(express.json());
app.use(express.static(publicPath));

// Магазины
const stores = [
    { id: 1, name: 'BigGeek', url: 'https://biggeek.ru/products/smartfon-apple-iphone-17-pro-1-tb-kosmiceskij-oranzevyj-cosmic-orange#esim' },
    { id: 2, name: 'Sotovik', url: 'https://spb.sotovik.shop/catalog/smartfony/apple_iphone_1/iphone_17_pro/15957/' },
    { id: 3, name: 'iPiter', url: 'https://ipiter.ru/shop/apple_iphone_17_pro_1tb_nano-sim_esim_cosmic_orange_color' },
    { id: 4, name: 'iStudio', url: 'https://spb.istudio-shop.ru/catalog/iphone/iphone-17-pro/apple-iphone-17-pro-1tb.html' },
    { id: 5, name: 'ReStore', url: 'https://re-store.ru/catalog/10117PRO1TBORGE/' },
    { id: 6, name: 'PiterGSM', url: 'https://pitergsm.ru/catalog/phones/iphone/iphone-17-pro/esim/122644/' },
    { id: 7, name: 'TehnoYard', url: 'http://tehnoyard.ru/smartfony/appleiphone/iphone-17-pro/apple-iphone-17-pro-1tb-esim-cosmic-orange-oranzhevyj' },
    { id: 8, name: 'Technolove', url: 'https://technolove.ru/catalog/product/smartfon_apple_iphone_17_pro_1tb_cosmic_orange_oranzhevyy_esim/' }
];

// Демо-цены как fallback
const demoPrices = {
    'BigGeek': 149990,
    'Sotovik': 148990,
    'iPiter': 150490,
    'iStudio': 149590,
    'ReStore': 152990,
    'PiterGSM': 147990,
    'TehnoYard': 149190,
    'Technolove': 174990
};

// Главный endpoint - всегда парсит актуальные цены
app.get('/api/prices', async (req, res) => {
    console.log('🔄 Parsing fresh prices...');
    
    try {
        const prices = [];
        
        // Парсим все магазины
        for (const store of stores) {
            try {
                console.log(`🔍 Checking ${store.name}...`);
                const parser = storeParsers[store.name] || storeParsers.default;
                const price = await parser(store.url);
                
                if (price) {
                    console.log(`✅ ${store.name}: ${price.toLocaleString('ru-RU')} руб.`);
                    prices.push({
                        id: store.id,
                        name: store.name,
                        price: price,
                        url: store.url,
                        timestamp: new Date().toISOString(),
                        source: 'real'
                    });
                } else {
                    console.log(`⚠️ ${store.name}: using demo price`);
                    prices.push({
                        id: store.id,
                        name: store.name,
                        price: demoPrices[store.name],
                        url: store.url,
                        timestamp: new Date().toISOString(),
                        source: 'demo'
                    });
                }
                
                // Небольшая задержка между запросами
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`💥 ${store.name} error:`, error.message);
                prices.push({
                    id: store.id,
                    name: store.name,
                    price: demoPrices[store.name],
                    url: store.url,
                    timestamp: new Date().toISOString(),
                    source: 'error'
                });
            }
        }
        
        console.log(`✅ Parsing completed: ${prices.length} stores`);
        
        res.json({
            prices: prices,
            lastUpdate: new Date().toISOString(),
            nextUpdate: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });
        
    } catch (error) {
        console.error('💥 API error:', error);
        
        // Fallback - демо-цены
        const fallbackPrices = stores.map(store => ({
            id: store.id,
            name: store.name,
            price: demoPrices[store.name],
            url: store.url,
            timestamp: new Date().toISOString(),
            source: 'fallback'
        }));
        
        res.json({
            prices: fallbackPrices,
            lastUpdate: new Date().toISOString(),
            nextUpdate: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });
    }
});

// Простой endpoint для ручного обновления
app.post('/api/check-now', async (req, res) => {
    console.log('🔄 Manual price check requested');
    
    // Просто возвращаем успех, т.к. /api/prices всегда парсит свежие цены
    res.json({ 
        message: 'Prices will be updated on next load', 
        updated: new Date().toLocaleString('ru-RU')
    });
});

// Упрощенная история (пустая)
app.get('/api/history/:storeId', (req, res) => {
    res.json([]);
});

app.get('/api/next-update', (req, res) => {
    res.json({
        nextUpdate: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        lastUpdate: new Date().toISOString()
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Экспорт для Vercel
module.exports = app;