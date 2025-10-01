const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Для Vercel
const isVercel = process.env.VERCEL === '1';
const publicPath = isVercel ? path.join(process.cwd(), 'public') : path.join(__dirname, '../public');

// Middleware
app.use(express.json());
app.use(express.static(publicPath));

// Данные (только для демо, в реальности будут из API)
const demoPrices = [
    { id: 1, name: 'BigGeek', price: 149990, url: 'https://biggeek.ru/...', source: 'demo' },
    { id: 2, name: 'Sotovik', price: 148990, url: 'https://spb.sotovik.shop/...', source: 'demo' },
    { id: 3, name: 'iPiter', price: 150490, url: 'https://ipiter.ru/...', source: 'demo' },
    { id: 4, name: 'iStudio', price: 149590, url: 'https://spb.istudio-shop.ru/...', source: 'demo' },
    { id: 5, name: 'ReStore', price: 152990, url: 'https://re-store.ru/...', source: 'demo' },
    { id: 6, name: 'PiterGSM', price: 147990, url: 'https://pitergsm.ru/...', source: 'demo' },
    { id: 7, name: 'TehnoYard', price: 149190, url: 'http://tehnoyard.ru/...', source: 'demo' },
    { id: 8, name: 'Technolove', price: 174990, url: 'https://technolove.ru/...', source: 'demo' }
];

// API endpoints - прокси к Serverless Functions
app.get('/api/prices', async (req, res) => {
    try {
        // В продакшене здесь будет вызов вашего API
        // Для демо возвращаем демо-цены
        res.json({
            prices: demoPrices,
            lastUpdate: new Date().toISOString(),
            nextUpdate: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });
    } catch (error) {
        console.error('Error in /api/prices:', error);
        // Fallback to demo prices
        res.json({
            prices: demoPrices,
            lastUpdate: new Date().toISOString(),
            nextUpdate: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });
    }
});

app.post('/api/check-now', async (req, res) => {
    try {
        // Здесь будет вызов парсинга цен
        res.json({ 
            message: 'Price check requested', 
            updated: new Date().toLocaleString('ru-RU')
        });
    } catch (error) {
        console.error('Error in /api/check-now:', error);
        res.status(500).json({ 
            error: 'Failed to check prices'
        });
    }
});

app.get('/api/history/:storeId', (req, res) => {
    // Для демо возвращаем пустую историю
    res.json([]);
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Запуск сервера только для локальной разработки
if (!isVercel) {
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;