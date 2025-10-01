require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const { storeParsers } = require('./parsers/priceParsers');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

let currentPrices = [];
let priceHistory = [];
let lastUpdateTime = null;
let nextUpdateTime = null;
let isUpdating = false;

// Создаем папку data если не существует
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// MongoDB connection - ОБНОВЛЕННЫЙ URI
let db;
// Используем только если задана переменная окружения, иначе пропускаем MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
    // Если MONGODB_URI не задан, пропускаем подключение
    if (!MONGODB_URI) {
        console.log('🔗 MongoDB URI не задан, используем файловую систему');
        return;
    }

    try {
        console.log('🔗 Connecting to MongoDB...');
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db();
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('🔄 Using file system as fallback');
    }
}

// Функция для сохранения данных в файл
function saveDataToFile() {
    const data = {
        currentPrices,
        priceHistory,
        lastUpdateTime,
        nextUpdateTime
    };
    try {
        fs.writeFileSync('data/prices-data.json', JSON.stringify(data, null, 2));
        console.log('💾 Данные сохранены в файл');
    } catch (error) {
        console.error('❌ Ошибка сохранения данных:', error.message);
    }
}

// Функция для загрузки данных из файла
function loadDataFromFile() {
    try {
        if (fs.existsSync('data/prices-data.json')) {
            const data = JSON.parse(fs.readFileSync('data/prices-data.json', 'utf8'));
            currentPrices = data.currentPrices || [];
            priceHistory = data.priceHistory || [];
            lastUpdateTime = data.lastUpdateTime;
            nextUpdateTime = data.nextUpdateTime;
            console.log('📂 Данные загружены из файла');
            console.log(`📊 Загружено ${currentPrices.length} текущих цен`);
            console.log(`📈 Загружено ${priceHistory.length} записей истории`);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error.message);
    }
}

// Функция для получения последней цены магазина
function getLastPrice(storeId) {
    const storeHistory = priceHistory
        .filter(entry => entry.storeId === storeId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return storeHistory.length > 0 ? storeHistory[0].price : null;
}

// Функция для добавления записи в историю (только если цена изменилась)
function addPriceToHistory(storeId, newPrice, source) {
    const lastPrice = getLastPrice(storeId);
    
    // Если цена не изменилась, обновляем timestamp последней записи
    if (lastPrice !== null && lastPrice === newPrice) {
        const lastEntryIndex = priceHistory.findIndex(entry => 
            entry.storeId === storeId && entry.price === newPrice
        );
        
        if (lastEntryIndex !== -1) {
            priceHistory[lastEntryIndex].timestamp = new Date().toISOString();
            console.log(`🕒 Обновлено время последней цены для магазина ${storeId}`);
        }
        return false; // Запись не добавлена
    }
    
    // Если цена изменилась, добавляем новую запись
    priceHistory.push({
        storeId: storeId,
        price: newPrice,
        timestamp: new Date().toISOString(),
        source: source
    });
    
    console.log(`📝 Добавлена новая цена для магазина ${storeId}: ${newPrice} руб.`);
    return true; // Запись добавлена
}

// Функция для получения реальных цен
async function fetchRealPrices() {
    if (isUpdating) {
        console.log('⚠️ Обновление уже выполняется, пропускаем...');
        return currentPrices;
    }
    
    isUpdating = true;
    console.log('🔄 Начинаем сбор реальных цен...');
    const results = [];
    let changesDetected = 0;
    
    for (const store of stores) {
        try {
            console.log(`🔍 Проверяем ${store.name}...`);
            const parser = storeParsers[store.name];
            const price = await parser(store.url);
            let finalPrice = price;
            let source = 'real';
            
            if (price) {
                console.log(`✅ ${store.name}: ${price.toLocaleString('ru-RU')} руб.`);
            } else {
                console.log(`⚠️ ${store.name}: цена не найдена, используем демо-цену`);
                finalPrice = demoPrices[store.name];
                source = 'demo';
            }
            
            // Добавляем в историю только если цена изменилась
            const priceAdded = addPriceToHistory(store.id, finalPrice, source);
            if (priceAdded) {
                changesDetected++;
            }
            
            results.push({
                id: store.id,
                name: store.name,
                price: finalPrice,
                url: store.url,
                timestamp: new Date().toISOString(),
                source: source,
                changed: priceAdded
            });
            
            // Задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`💥 Ошибка при проверке ${store.name}:`, error.message);
            // Используем демо-цену при ошибке
            const finalPrice = demoPrices[store.name];
            const priceAdded = addPriceToHistory(store.id, finalPrice, 'error');
            if (priceAdded) {
                changesDetected++;
            }
            
            results.push({
                id: store.id,
                name: store.name,
                price: finalPrice,
                url: store.url,
                timestamp: new Date().toISOString(),
                source: 'error',
                changed: priceAdded
            });
        }
    }
    
    currentPrices = results;
    lastUpdateTime = new Date().toISOString();
    nextUpdateTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    // Сохраняем данные
    saveDataToFile();
    isUpdating = false;
    
    console.log(`✅ Сбор цен завершен. Изменений: ${changesDetected}`);
    return results;
}

// Инициализируем цены при запуске
async function initializePrices() {
    // Сначала загружаем сохраненные данные
    loadDataFromFile();
    
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

// Автоматическое обновление каждые 10 минут
function startAutoUpdate() {
    setInterval(async () => {
        console.log('🔄 Автоматическое обновление цен (каждые 10 минут)...');
        await fetchRealPrices();
    }, 10 * 60 * 1000); // Каждые 10 минут
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
    
    // Подключаемся к БД (но не ждем подключения)
    connectDB();
    
    // Инициализируем цены
    await initializePrices();
    
    // Запускаем автоматическое обновление
    startAutoUpdate();
});