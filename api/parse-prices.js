const { storeParsers } = require('../parsers/priceParsers');

// Исходные данные магазинов
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

// Демо-цены
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

module.exports = async (req, res) => {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔄 Starting price parsing...');
        
        const results = [];
        const storeId = req.query.storeId;

        // Если указан конкретный магазин
        if (storeId) {
            const store = stores.find(s => s.id === parseInt(storeId));
            if (store) {
                console.log(`🔍 Parsing single store: ${store.name}`);
                const price = await parseStorePrice(store);
                results.push(price);
            }
        } else {
            // Парсим все магазины
            console.log(`🔍 Parsing all ${stores.length} stores...`);
            
            for (const store of stores) {
                try {
                    const price = await parseStorePrice(store);
                    results.push(price);
                    
                    // Задержка между запросами
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`❌ Error parsing ${store.name}:`, error.message);
                    results.push({
                        id: store.id,
                        name: store.name,
                        price: demoPrices[store.name],
                        url: store.url,
                        timestamp: new Date().toISOString(),
                        source: 'error'
                    });
                }
            }
        }

        console.log(`✅ Price parsing completed: ${results.length} stores`);
        
        res.json({
            prices: results,
            lastUpdate: new Date().toISOString(),
            nextUpdate: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });

    } catch (error) {
        console.error('💥 API error:', error);
        res.status(500).json({ 
            error: 'Failed to parse prices',
            message: error.message 
        });
    }
};

async function parseStorePrice(store) {
    console.log(`🔍 Checking ${store.name}...`);
    
    try {
        const parser = storeParsers[store.name] || storeParsers.default;
        const price = await parser(store.url);
        
        if (price) {
            console.log(`✅ ${store.name}: ${price.toLocaleString('ru-RU')} руб.`);
            return {
                id: store.id,
                name: store.name,
                price: price,
                url: store.url,
                timestamp: new Date().toISOString(),
                source: 'real'
            };
        } else {
            console.log(`⚠️ ${store.name}: using demo price`);
            return {
                id: store.id,
                name: store.name,
                price: demoPrices[store.name],
                url: store.url,
                timestamp: new Date().toISOString(),
                source: 'demo'
            };
        }
    } catch (error) {
        console.error(`💥 ${store.name} parser error:`, error.message);
        return {
            id: store.id,
            name: store.name,
            price: demoPrices[store.name],
            url: store.url,
            timestamp: new Date().toISOString(),
            source: 'error'
        };
    }
}