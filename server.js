const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const { storeParsers } = require('./parsers/priceParsers');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/price-tracker';

async function connectDB() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db();
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        // Fallback to file system if MongoDB fails
        console.log('🔄 Using file system as fallback');
    }
}

// Обновите функции сохранения/загрузки
async function saveDataToFile() {
    // Пробуем MongoDB сначала
    if (db) {
        try {
            await db.collection('data').updateOne(
                { type: 'priceData' },
                { 
                    $set: { 
                        currentPrices, 
                        priceHistory, 
                        lastUpdateTime, 
                        nextUpdateTime,
                        updatedAt: new Date()
                    } 
                },
                { upsert: true }
            );
            console.log('💾 Данные сохранены в MongoDB');
            return;
        } catch (error) {
            console.error('❌ Ошибка сохранения в MongoDB:', error);
        }
    }
    
    // Fallback: сохраняем в файл
    try {
        const data = {
            currentPrices,
            priceHistory,
            lastUpdateTime,
            nextUpdateTime
        };
        fs.writeFileSync('data/prices-data.json', JSON.stringify(data, null, 2));
        console.log('💾 Данные сохранены в файл (fallback)');
    } catch (error) {
        console.error('❌ Ошибка сохранения в файл:', error.message);
    }
}

async function loadDataFromFile() {
    // Пробуем MongoDB сначала
    if (db) {
        try {
            const data = await db.collection('data').findOne({ type: 'priceData' });
            if (data) {
                currentPrices = data.currentPrices || [];
                priceHistory = data.priceHistory || [];
                lastUpdateTime = data.lastUpdateTime;
                nextUpdateTime = data.nextUpdateTime;
                console.log('📂 Данные загружены из MongoDB');
                return;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки из MongoDB:', error);
        }
    }
    
    // Fallback: загружаем из файла
    try {
        if (fs.existsSync('data/prices-data.json')) {
            const data = JSON.parse(fs.readFileSync('data/prices-data.json', 'utf8'));
            currentPrices = data.currentPrices || [];
            priceHistory = data.priceHistory || [];
            lastUpdateTime = data.lastUpdateTime;
            nextUpdateTime = data.nextUpdateTime;
            console.log('📂 Данные загружены из файла (fallback)');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error.message);
    }
}

// Остальной код server.js остается без изменений...
let currentPrices = [];
let priceHistory = [];
let lastUpdateTime = null;
let nextUpdateTime = null;
let isUpdating = false;

// Исходные данные магазинов
const stores = [
    // ... ваш существующий код stores ...
];

// Демо-цены
const demoPrices = {
    // ... ваш существующий код demoPrices ...
};

// Создаем папку data если не существует
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// ОБНОВИТЕ функцию initializePrices чтобы использовать connectDB
async function initializePrices() {
    // Подключаемся к БД
    await connectDB();
    
    // Загружаем данные
    await loadDataFromFile();
    
    // Если данных нет или они устарели (больше 10 минут), обновляем
    if (currentPrices.length === 0 || !lastUpdateTime || 
        (new Date() - new Date(lastUpdateTime)) > 10 * 60 * 1000) {
        console.log('🔄 Данные устарели или отсутствуют, начинаем сбор...');
        await fetchRealPrices();
    } else {
        console.log('✅ Используем сохраненные данные');
        const timeSinceUpdate = Math.round((new Date() - new Date(lastUpdateTime)) / 60000);
        console.log(`⏰ Данные обновлены ${timeSinceUpdate} минут назад`);
        
        // Устанавливаем следующее обновление
        nextUpdateTime = new Date(new Date(lastUpdateTime).getTime() + 10 * 60 * 1000).toISOString();
    }
}

// Остальной код server.js (fetchRealPrices, API endpoints и т.д.) остается без изменений

// Автоматическое обновление каждые 10 минут
function startAutoUpdate() {
    setInterval(async () => {
        console.log('🔄 Автоматическое обновление цен (каждые 10 минут)...');
        await fetchRealPrices();
    }, 60 * 60 * 1000); // Каждые 10 минут
}

// API endpoints
app.get('/api/prices', (req, res) => {
    console.log('📊 API: Returning current prices');
    res.json({
        prices: currentPrices,
        lastUpdate: lastUpdateTime,
        nextUpdate: nextUpdateTime
    });
});

app.post('/api/check-now', async (req, res) => {
    console.log('🔄 API: Manual price check requested');
    
    try {
        const newPrices = await fetchRealPrices();
        res.json({ 
            message: 'Real prices updated', 
            updated: new Date().toLocaleString('ru-RU'),
            storesChecked: newPrices.length,
            realPrices: newPrices.filter(p => p.source === 'real').length
        });
    } catch (error) {
        console.error('💥 Error during price check:', error);
        res.status(500).json({ 
            error: 'Failed to fetch prices',
            message: error.message 
        });
    }
});

app.get('/api/history/:storeId', (req, res) => {
    const storeId = parseInt(req.params.storeId);
    
    const storeHistory = priceHistory
        .filter(entry => entry.storeId === storeId)
        .slice(-20)
        .reverse();
    
    res.json(storeHistory);
});

// Получить информацию о следующем обновлении
app.get('/api/next-update', (req, res) => {
    res.json({
        nextUpdate: nextUpdateTime,
        lastUpdate: lastUpdateTime
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, async () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Open http://localhost:${PORT} in your browser`);
    console.log('🔄 Автоматическое обновление каждые 10 минут');
    
    // Инициализируем цены
    await initializePrices();
    
    // Запускаем автоматическое обновление
    startAutoUpdate();
});