let currentChart = null;

class PriceTracker {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.nextUpdateInterval = null;
        this.currentHistory = null;
        this.currentStoreId = localStorage.getItem('selectedStoreId'); // ← Сохраняем выбранный магазин
        this.currentStoreName = null;
        this.init();
    }

    async init() {
        this.applyTheme();
        this.bindEvents();
        this.startUpdateTimer();
        await this.loadPrices();
        await this.loadStores();
    }

    bindEvents() {
    document.getElementById('checkNow').addEventListener('click', () => {
        this.checkPricesNow();
    });

    // document.getElementById('storeSelect').addEventListener('change', (e) => {
    //     this.loadPriceHistory(e.target.value);
    // });

    document.getElementById('themeToggle').addEventListener('click', () => {
        this.toggleTheme();
    });

    // Обработчики для переключателя вида
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            this.switchHistoryView(view);
        });
    });
}

switchHistoryView(view) {
    const tableBtn = document.querySelector('[data-view="table"]');
    const chartBtn = document.querySelector('[data-view="chart"]');
    const historyList = document.getElementById('priceHistory');
    const chartContainer = document.getElementById('chartContainer');
    
    // Обновляем активную кнопку
    tableBtn.classList.toggle('active', view === 'table');
    chartBtn.classList.toggle('active', view === 'chart');
    
    // Переключаем видимость
    if (view === 'chart') {
        historyList.classList.add('hidden');
        chartContainer.classList.remove('hidden');
        this.renderPriceChart();
    } else {
        historyList.classList.remove('hidden');
        chartContainer.classList.add('hidden');
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
    }
}

// Метод для отрисовки диаграммы
renderPriceChart() {
    if (!this.currentStoreId) return;
    
    const history = this.currentHistory;
    
    if (!history || history.length === 0) {
        document.getElementById('chartContainer').innerHTML = 
            '<div class="loading">Нет данных для построения диаграммы</div>';
        return;
    }
    
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Уничтожаем предыдущую диаграмму
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Подготавливаем данные
    const labels = history.map(entry => {
        const date = new Date(entry.timestamp);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }).reverse();
    
    const prices = history.map(entry => entry.price).reverse();
    
    // Создаем градиент для линии
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 113, 227, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 113, 227, 0.1)');
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Цена в ${this.currentStoreName}`,
                data: prices,
                borderColor: 'var(--accent-color)',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'var(--accent-color)',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Динамика цен: ${this.currentStoreName}`,
                    color: 'var(--text-primary)',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    labels: {
                        color: 'var(--text-primary)'
                    }
                },
                tooltip: {
                    backgroundColor: 'var(--bg-secondary)',
                    titleColor: 'var(--text-primary)',
                    bodyColor: 'var(--text-primary)',
                    borderColor: 'var(--border-color)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `Цена: ${context.parsed.y.toLocaleString('ru-RU')} руб.`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'var(--border-color)'
                    },
                    ticks: {
                        color: 'var(--text-secondary)',
                        maxRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: 'var(--border-color)'
                    },
                    ticks: {
                        color: 'var(--text-secondary)',
                        callback: function(value) {
                            return value.toLocaleString('ru-RU') + ' руб.';
                        }
                    }
                }
            }
        }
    });
}

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const toggleBtn = document.getElementById('themeToggle');
        if (this.theme === 'dark') {
            toggleBtn.innerHTML = '<span>☀️</span><span>Светлая тема</span>';
        } else {
            toggleBtn.innerHTML = '<span>🌙</span><span>Темная тема</span>';
        }
        localStorage.setItem('theme', this.theme);
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
    }

    startUpdateTimer() {
        this.updateTimer();
        // Обновляем таймер каждую секунду
        setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    updateTimer() {
    const timerElement = document.getElementById('nextUpdateTimer');
    const nextUpdate = this.nextUpdateTime;
    
    if (!nextUpdate) {
        timerElement.textContent = '-';
        return;
    }

    const now = new Date();
    const nextUpdateDate = new Date(nextUpdate);
    const timeLeft = nextUpdateDate - now;

    if (timeLeft <= 0) {
        timerElement.textContent = 'обновите страницу';
        return;
    }

    // Исправляем расчет времени
    const minutes = Math.floor(timeLeft / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    if (minutes > 0) {
        timerElement.textContent = `${minutes}м ${seconds}с`;
    } else {
        timerElement.textContent = `${seconds}с`;
    }
}

    showLoading() {
        document.getElementById('loadingIndicator').classList.remove('hidden');
        document.getElementById('checkNow').disabled = true;
        document.getElementById('checkNow').textContent = 'Загрузка...';
    }

    hideLoading() {
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('checkNow').disabled = false;
        document.getElementById('checkNow').textContent = 'Проверить цены сейчас';
    }

async loadPrices() {
    try {
        console.log('Loading prices...');
        const response = await fetch('/api/prices');
        const data = await response.json();
        console.log('Prices loaded:', data);
        
        this.nextUpdateTime = data.nextUpdate;
        this.updateTimer();
        
        // Обновляем время последнего обновления
        if (data.lastUpdate) {
            const lastUpdate = new Date(data.lastUpdate);
            document.getElementById('lastUpdateTime').textContent = 
                lastUpdate.toLocaleString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
        }
        
        this.renderPrices(data.prices);
        this.updateStats(data.prices);
    } catch (error) {
        console.error('Error loading prices:', error);
        document.getElementById('pricesList').innerHTML = 
            '<div class="loading">Ошибка загрузки цен</div>';
    }
}

    async loadStores() {
        try {
            const response = await fetch('/api/prices');
            const data = await response.json();
            const select = document.getElementById('storeSelect');
            
            select.innerHTML = '<option value="">Выберите магазин для просмотра истории</option>';
            
            data.prices.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = store.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading stores:', error);
        }
    }

    renderPrices(prices) {
    const container = document.getElementById('pricesList');
    
    if (!prices || prices.length === 0) {
        container.innerHTML = '<div class="loading">Цены не найдены</div>';
        return;
    }

    // Сортируем цены от самой низкой к самой высокой
    const sortedPrices = [...prices].sort((a, b) => a.price - b.price);
    
    const minPrice = Math.min(...prices.map(p => p.price));
    const maxPrice = Math.max(...prices.map(p => p.price));
    
    container.innerHTML = sortedPrices.map(store => {
        let priceClass = '';
        if (store.price === minPrice) priceClass = 'min-price';
        if (store.price === maxPrice) priceClass = 'max-price';
        
        // Проверяем, является ли этот магазин выбранным
        const isSelected = store.id.toString() === this.currentStoreId;
        if (isSelected) priceClass += ' selected';
        
        return `
            <div class="price-item ${priceClass}" data-store-id="${store.id}">
                <div class="store-info">
                    <div class="store-name">${store.name}</div>
                    <a href="${store.url}" target="_blank" class="store-url">${new URL(store.url).hostname}</a>
                </div>
                <div class="price-amount">
                    ${store.price.toLocaleString('ru-RU')} руб.
                    ${store.source === 'demo' ? ' <span style="color: var(--warning-color); font-size: 0.8em;">(демо)</span>' : ''}
                </div>
            </div>
        `;
    }).join('') + `
        <div class="selection-hint">
            💡 Нажмите на магазин чтобы увидеть историю цен
        </div>
    `;
    
    // Добавляем обработчики клика на элементы цен
    this.addPriceItemClickHandlers();
    
    // Автоматически загружаем историю для выбранного магазина
    this.loadSelectedStoreHistory();
}

// Метод для автоматической загрузки истории выбранного магазина
loadSelectedStoreHistory() {
    if (this.currentStoreId) {
        const selectedElement = document.querySelector(`.price-item[data-store-id="${this.currentStoreId}"]`);
        if (selectedElement) {
            this.loadPriceHistory(this.currentStoreId);
        } else {
            // Если выбранный магазин не найден в текущих ценах, сбрасываем выбор
            localStorage.removeItem('selectedStoreId');
            this.currentStoreId = null;
        }
    }
}

// Метод для добавления обработчиков клика на элементы цен
addPriceItemClickHandlers() {
    const priceItems = document.querySelectorAll('.price-item');
    
    priceItems.forEach(item => {
        item.addEventListener('click', () => {
            const storeId = item.dataset.storeId;
            this.selectStore(storeId, item);
        });
    });
}

// Метод для выбора магазина
// Метод для выбора магазина
selectStore(storeId, element) {
    // Убираем выделение у всех элементов
    document.querySelectorAll('.price-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Добавляем выделение выбранному элементу
    element.classList.add('selected');
    
    // Сохраняем выбранный магазин в localStorage
    localStorage.setItem('selectedStoreId', storeId);
    this.currentStoreId = storeId;
    
    // Загружаем историю цен
    this.loadPriceHistory(storeId);
    
    // Прокручиваем к разделу истории
    document.querySelector('.history-section').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

    updateStats(prices) {
        if (!prices || prices.length === 0) return;

        const minPrice = Math.min(...prices.map(p => p.price));
        const maxPrice = Math.max(...prices.map(p => p.price));
        const avgPrice = prices.reduce((a, b) => a + b.price, 0) / prices.length;
        const minStore = prices.find(p => p.price === minPrice);
        const maxStore = prices.find(p => p.price === maxPrice);

        document.getElementById('minPrice').textContent = `${minPrice.toLocaleString('ru-RU')} руб.`;
        document.getElementById('minStore').textContent = minStore.name;
        document.getElementById('avgPrice').textContent = `${avgPrice.toLocaleString('ru-RU')} руб.`;
        document.getElementById('maxPrice').textContent = `${maxPrice.toLocaleString('ru-RU')} руб.`;
        document.getElementById('maxStore').textContent = maxStore.name;
    }

    // Обновите метод loadPriceHistory
async loadPriceHistory(storeId) {
    if (!storeId) {
        document.getElementById('priceHistory').innerHTML = 
            '<div class="loading">Выберите магазин из списка выше чтобы увидеть историю цен</div>';
        document.getElementById('chartContainer').classList.add('hidden');
        return;
    }

    try {
        // Находим название магазина по ID
        const storeElement = document.querySelector(`.price-item[data-store-id="${storeId}"]`);
        if (!storeElement) {
            console.error('Store element not found for ID:', storeId);
            return;
        }
        
        const storeName = storeElement.querySelector('.store-name').textContent;
        
        const response = await fetch(`/api/history/${storeId}`);
        const history = await response.json();
        
        // Сохраняем историю для использования в диаграмме
        this.currentHistory = history;
        this.currentStoreId = storeId;
        this.currentStoreName = storeName;
        
        this.renderHistory(history, storeName);
        
        // Если активен вид диаграммы, обновляем её
        if (document.querySelector('[data-view="chart"]').classList.contains('active')) {
            this.renderPriceChart();
        }
    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('priceHistory').innerHTML = 
            '<div class="loading">Ошибка загрузки истории</div>';
    }
}

    renderHistory(history, storeName) {
    const container = document.getElementById('priceHistory');
    
    if (history.length === 0) {
        container.innerHTML = '<div class="loading">История цен пуста</div>';
        return;
    }

    // Сортируем по дате (новые сверху)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let historyHTML = `<h3 style="margin-bottom: 15px; color: var(--text-primary);">История цен: ${storeName}</h3>`;
    
    // Проверяем, есть ли изменения вообще
    const uniquePrices = [...new Set(history.map(item => item.price))];
    const hasChanges = uniquePrices.length > 1;
    
    if (!hasChanges) {
        historyHTML += `<div class="no-changes-message">
            <p>💰 Цена стабильна: ${history[0].price.toLocaleString('ru-RU')} руб.</p>
            <small>Изменений не обнаружено за весь период</small>
        </div>`;
    }
    
    let lastPrice = null;
    
    history.forEach((record, index) => {
        const date = new Date(record.timestamp).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Вычисляем изменение цены относительно предыдущей записи
        let changeHTML = '';
        let itemClass = 'history-item';
        
        if (lastPrice !== null) {
            const change = record.price - lastPrice;
            const changePercent = ((change / lastPrice) * 100).toFixed(1);
            
            if (change > 0) {
                changeHTML = `<span class="history-change positive">+${change.toLocaleString('ru-RU')} руб. (+${changePercent}%)</span>`;
                itemClass += ' changed';
            } else if (change < 0) {
                changeHTML = `<span class="history-change negative">${change.toLocaleString('ru-RU')} руб. (${changePercent}%)</span>`;
                itemClass += ' changed';
            } else {
                changeHTML = `<span class="history-change neutral">Без изменений</span>`;
                itemClass += ' unchanged';
            }
        } else {
            changeHTML = '<span class="history-change neutral">Первая запись</span>';
            itemClass += ' changed';
        }
        
        historyHTML += `
            <div class="${itemClass}">
                <div class="history-price">
                    ${record.price.toLocaleString('ru-RU')} руб.
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    ${changeHTML}
                    <div class="history-date">${date}</div>
                </div>
            </div>
        `;
        
        lastPrice = record.price;
    });

    container.innerHTML = historyHTML;
}

    async checkPricesNow() {
        this.showLoading();
        
        try {
            const response = await fetch('/api/check-now', { method: 'POST' });
            const result = await response.json();
            
            console.log('Price check completed:', result);
            
            // Ждем немного чтобы сервер успел обновить цены
            setTimeout(async () => {
                await this.loadPrices();
                this.hideLoading();
                
                // Показываем уведомление об успехе
                this.showNotification('Цены успешно обновлены!', 'success');
            }, 2000);
            
        } catch (error) {
            console.error('Error checking prices:', error);
            this.hideLoading();
            this.showNotification('Ошибка при обновлении цен', 'error');
        }
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            ${type === 'success' ? 'background: var(--success-color);' : 'background: var(--error-color);'}
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Добавляем CSS для анимаций уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PriceTracker();
});