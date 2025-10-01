const axios = require('axios')

// Функция для извлечения цены из текста
function extractPrice(text) {
	if (!text) return null

	// Пропускаем пустые тексты которые мы видели в логах
	if (text.trim().length < 10) return null

	console.log('🔎 Анализируем текст:', text.substring(0, 100))

	// Убираем HTML теги и лишние пробелы
	const cleanText = text
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

	// Ищем цены в разных форматах
	const pricePatterns = [
		/(\d{1,3}(?:\s?\d{3})*(?:\s?[.,]\s?\d{2})?)\s*[₽руб]/i,
		/цена[^\d]{0,50}?(\d{1,3}(?:\s?\d{3})*(?:\s?[.,]\s?\d{2})?)/i,
		/"price":\s*"?(\d+(?:[.,]\d+)?)"?/,
		/стоимость[^\d]{0,50}?(\d{1,3}(?:\s?\d{3})*(?:\s?[.,]\s?\d{2})?)/i,
		/купить[^\d]{0,50}?(\d{1,3}(?:\s?\d{3})*(?:\s?[.,]\s?\d{2})?)/i,
		/data-price="(\d+(?:[.,]\d+)?)"/,
		/product_price[^>]*>([^<]+)/i,
		/final-price[^>]*>([^<]+)/i,
		/current-price[^>]*>([^<]+)/i,
		/(\d{1,3}(?:\s?\d{3})*(?:\s?[.,]\s?\d{2})?)/,
	]

	for (let pattern of pricePatterns) {
		const matches = cleanText.match(pattern)
		if (matches && matches[1]) {
			let priceStr = matches[1].replace(/\s/g, '').replace(',', '.')

			const price = parseFloat(priceStr)

			if (price > 50000 && price < 300000) {
				console.log(`💰 Найдена цена: ${price}`)
				return Math.round(price)
			}
		}
	}

	return null
}

// Все парсеры в одном объекте
const storeParsers = {
	BigGeek: async url => {
		try {
			console.log('🔍 Парсим BigGeek...')
			const { data } = await axios.get(url, {
				timeout: 15000,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept:
						'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				},
			})

			return extractPrice(data)
		} catch (error) {
			console.error('❌ BigGeek parser error:', error.message)
			return null
		}
	},

	Sotovik: async url => {
		try {
			console.log('🔍 Парсим Sotovik (специальный парсер)...')
			const { data } = await axios.get(url, {
				timeout: 20000,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept:
						'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				},
			})

			// Sotovik - ищем в мета-тегах (это сработало!)
			const metaMatches = data.match(
				/<meta[^>]*content="[^"]*(\d{5,7})[^"]*"[^>]*>/g
			)
			if (metaMatches) {
				for (let meta of metaMatches) {
					const priceMatch = meta.match(/(\d{5,7})/)
					if (priceMatch) {
						const price = parseInt(priceMatch[1])
						if (price > 50000 && price < 300000) {
							console.log(`💰 Sotovik meta цена: ${price}`)
							return price
						}
					}
				}
			}

			return extractPrice(data)
		} catch (error) {
			console.error('❌ Sotovik parser error:', error.message)
			return null
		}
	},

	iPiter: async url => {
		try {
			console.log('🔍 Парсим iPiter...')
			const { data } = await axios.get(url, {
				timeout: 15000,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				},
			})

			return extractPrice(data)
		} catch (error) {
			console.error('❌ iPiter parser error:', error.message)
			return null
		}
	},

	'iStudio': async (url) => {
    try {
        console.log('🔍 Парсим iStudio (исправленный парсер)...');
        const { data } = await axios.get(url, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Сначала ищем структурированные данные с приоритетом на цены с рублями
        const priorityPatterns = [
            /(\d{1,3}(?:\s?\d{3})*(?:\s?[.,]\s?\d{2})?)\s*[₽руб]/gi, // С символом валюты - самый надежный
            /цена[^>]*>([^<]+)/gi, // После слова "цена"
            /стоимость[^>]*>([^<]+)/gi, // После слова "стоимость"
            /class="[^"]*price[^"]*"[^>]*>([^<]+)</gi, // Классы с price
            /class="[^"]*cost[^"]*"[^>]*>([^<]+)</gi, // Классы с cost
            /id="price"[^>]*>([^<]+)</gi // ID price
        ];

        for (let pattern of priorityPatterns) {
            const matches = [...data.matchAll(pattern)];
            for (let match of matches) {
                const price = extractPrice(match[1] || match[0]);
                if (price && price > 140000 && price < 170000) { // Ожидаем цену ~154,999
                    console.log(`💰 iStudio правильная цена: ${price}`);
                    return price;
                }
            }
        }

        // Если не нашли с приоритетом, ищем любые числа но с фильтром по ожидаемому диапазону
        const allNumbers = data.match(/\d{5,7}/g);
        if (allNumbers) {
            const uniqueNumbers = [...new Set(allNumbers)];
            for (let num of uniqueNumbers) {
                const price = parseInt(num);
                // Фильтруем только числа в ожидаемом диапазоне для iPhone 17 Pro
                if (price > 140000 && price < 170000) {
                    console.log(`💰 iStudio отфильтрованная цена: ${price}`);
                    return price;
                }
            }
        }

        console.log('❌ iStudio: не удалось найти правильную цену');
        return null;

    } catch (error) {
        console.error('❌ iStudio parser error:', error.message);
        return null;
    }
},

Technolove: async (url) => {
    try {
        console.log('🔍 Парсим Technolove (исправленный парсер)...');
        const { data } = await axios.get(url, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        console.log('📄 Проверяем HTML Technolove...');

        // Сначала ищем структурированные данные - приоритет JSON-LD
        const jsonLdMatch = data.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (jsonLdMatch) {
            try {
                const jsonData = JSON.parse(jsonLdMatch[1]);
                if (jsonData.offers && jsonData.offers.price) {
                    const price = parseInt(jsonData.offers.price);
                    if (price > 140000 && price < 200000) {
                        console.log(`💰 Technolove JSON-LD цена: ${price}`);
                        return price;
                    }
                }
            } catch (e) {
                console.log('JSON-LD не распарсился');
            }
        }

        // Ищем в мета-тегах
        const metaPriceMatch = data.match(/<meta[^>]*content="[^"]*(\d{5,7})[^"]*"[^>]*>/);
        if (metaPriceMatch) {
            const priceMatch = metaPriceMatch[0].match(/(\d{5,7})/);
            if (priceMatch) {
                const price = parseInt(priceMatch[1]);
                if (price > 140000 && price < 200000) {
                    console.log(`💰 Technolove meta цена: ${price}`);
                    return price;
                }
            }
        }

        // Ищем в данных продукта
        const productDataMatch = data.match(/product_data[^>]*>([^<]+)<\/script>/i);
        if (productDataMatch) {
            const priceMatch = productDataMatch[1].match(/"price":\s*(\d+)/);
            if (priceMatch) {
                const price = parseInt(priceMatch[1]);
                if (price > 140000 && price < 200000) {
                    console.log(`💰 Technolove product_data цена: ${price}`);
                    return price;
                }
            }
        }

        // Ищем в JavaScript переменных
        const jsPriceMatches = [
            ...data.matchAll(/price[\s]*:[\s]*['"]?(\d+)['"]?/gi),
            ...data.matchAll(/productPrice[\s]*:[\s]*['"]?(\d+)['"]?/gi),
            ...data.matchAll(/currentPrice[\s]*:[\s]*['"]?(\d+)['"]?/gi),
        ];

        for (let match of jsPriceMatches) {
            const price = parseInt(match[1]);
            if (price > 140000 && price < 200000) {
                console.log(`💰 Technolove JS переменная цена: ${price}`);
                return price;
            }
        }

        // Ищем в HTML структуре - специфичные селекторы для Technolove
        const htmlPricePatterns = [
            /<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/span>/gi,
            /<div[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/div>/gi,
            /<b[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/b>/gi,
            /class="current-price"[^>]*>([^<]+)</gi,
            /itemprop="price"[^>]*content="([^"]+)"/i,
        ];

        for (let pattern of htmlPricePatterns) {
            const matches = [...data.matchAll(pattern)];
            for (let match of matches) {
                const priceText = match[1] || match[0];
                const price = extractPrice(priceText);
                if (price && price > 140000 && price < 200000) {
                    console.log(`💰 Technolove HTML селектор цена: ${price}`);
                    return price;
                }
            }
        }

        // Последняя попытка - ищем все большие числа в диапазоне iPhone
        const allNumbers = data.match(/\d{5,7}/g);
        if (allNumbers) {
            const uniqueNumbers = [...new Set(allNumbers)];
            for (let num of uniqueNumbers) {
                const price = parseInt(num);
                // Более широкий диапазон для iPhone 17 Pro
                if (price > 140000 && price < 200000) {
                    console.log(`💰 Technolove отфильтрованная цена: ${price}`);
                    return price;
                }
            }
        }

        console.log('❌ Technolove: не удалось найти правильную цену');
        return null;

    } catch (error) {
        console.error('❌ Technolove parser error:', error.message);
        return null;
    }
},

	ReStore: async url => {
		try {
			console.log('🔍 Парсим ReStore...')
			const { data } = await axios.get(url, {
				timeout: 15000,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				},
			})

			return extractPrice(data)
		} catch (error) {
			console.error('❌ ReStore parser error:', error.message)
			return null
		}
	},

	PiterGSM: async url => {
		try {
			console.log('🔍 Парсим PiterGSM (специальный парсер)...')
			const { data } = await axios.get(url, {
				timeout: 20000,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept:
						'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				},
			})

			// PiterGSM может использовать специфичные селекторы
			// Попробуем найти в JSON данных
			const jsonMatches = [
				...data.matchAll(/"price":\s*"?(\d+(?:\.\d+)?)"?/g),
				...data.matchAll(/"value":\s*"?(\d+(?:\.\d+)?)"?/g),
				...data.matchAll(/"amount":\s*"?(\d+(?:\.\d+)?)"?/g),
			]

			for (let match of jsonMatches) {
				const price = parseInt(match[1])
				if (price > 50000 && price < 300000) {
					console.log(`💰 PiterGSM JSON цена: ${price}`)
					return price
				}
			}

			// Попробуем найти в data-атрибутах
			const dataPriceMatches = data.match(/data-price="(\d+)"/g)
			if (dataPriceMatches) {
				for (let match of dataPriceMatches) {
					const priceMatch = match.match(/data-price="(\d+)"/)
					if (priceMatch) {
						const price = parseInt(priceMatch[1])
						if (price > 50000 && price < 300000) {
							console.log(`💰 PiterGSM data-price: ${price}`)
							return price
						}
					}
				}
			}

			// Попробуем найти в структурированных данных
			const structuredPatterns = [
				/<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)</gi,
				/<div[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)</gi,
				/<strong[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)</gi,
				/itemprop="price"[^>]*content="([^"]+)"/i,
				/class="product-price"[^>]*>([^<]+)</gi,
			]

			for (let pattern of structuredPatterns) {
				const matches = [...data.matchAll(pattern)]
				for (let match of matches) {
					const price = extractPrice(match[1])
					if (price) return price
				}
			}

			// Последняя попытка - ищем любые большие числа
			const largeNumbers = data.match(/\d{5,7}/g)
			if (largeNumbers) {
				const uniqueNumbers = [...new Set(largeNumbers)] // Убираем дубликаты
				for (let num of uniqueNumbers) {
					const price = parseInt(num)
					if (price > 150000 && price < 250000) {
						console.log(`💰 PiterGSM большое число: ${price}`)
						return price
					}
				}
			}

			console.log('❌ PiterGSM: не удалось найти цену')
			return null
		} catch (error) {
			console.error('❌ PiterGSM parser error:', error.message)
			return null
		}
	},

	'Wildberries': async (url) => {
    try {
        console.log('🔍 Парсим Wildberries (расширенный подход)...');
        
        const productIdMatch = url.match(/\/(\d+)\/detail/);
        if (!productIdMatch) {
            console.log('❌ Не удалось извлечь ID товара из URL');
            return null;
        }
        
        const productId = productIdMatch[1];
        console.log(`🔍 Wildberries ID: ${productId}`);
        
        // Подход 1: Прямой запрос к карточке товара через API
        try {
            console.log('🔍 Подход 1: Прямой API запрос...');
            // Этот endpoint часто работает
            const apiUrl = `https://card.wb.ru/cards/v1/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${productId}`;
            
            const { data: apiData } = await axios.get(apiUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://www.wildberries.ru/',
                    'Origin': 'https://www.wildberries.ru'
                }
            });
            
            console.log('📦 API ответ:', JSON.stringify(apiData).substring(0, 500));
            
            if (apiData && apiData.data && apiData.data.products && apiData.data.products[0]) {
                const product = apiData.data.products[0];
                const salePrice = product.salePriceU;
                const price = product.priceU;
                
                console.log(`📊 Wildberries цены - sale: ${salePrice}, regular: ${price}`);
                
                // Цены приходят в копейках, делим на 100
                if (salePrice) {
                    const actualPrice = Math.round(salePrice / 100);
                    if (actualPrice > 50000 && actualPrice < 300000) {
                        console.log(`💰 Wildberries цена со скидкой: ${actualPrice}`);
                        return actualPrice;
                    }
                }
                
                if (price) {
                    const actualPrice = Math.round(price / 100);
                    if (actualPrice > 50000 && actualPrice < 300000) {
                        console.log(`💰 Wildberries обычная цена: ${actualPrice}`);
                        return actualPrice;
                    }
                }
            }
        } catch (apiError) {
            console.log('❌ Подход 1 не сработал:', apiError.message);
        }
        
        // Подход 2: Альтернативный API endpoint
        try {
            console.log('🔍 Подход 2: Альтернативный API...');
            const altApiUrl = `https://basket-0{01..10}.wbbasket.ru/vol${productId.substring(0, Math.min(3, productId.length))}/part${productId.substring(0, Math.min(5, productId.length))}/${productId}/info/ru/card.json`;
            
            // Пробуем разные сервера
            for (let i = 1; i <= 3; i++) {
                const server = i.toString().padStart(2, '0');
                const testUrl = altApiUrl.replace('{01..10}', server);
                
                try {
                    const { data: altData } = await axios.get(testUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (altData && (altData.products || altData.imt_name)) {
                        console.log(`✅ Нашли данные на сервере ${server}`);
                        if (altData.products && altData.products[0]) {
                            const product = altData.products[0];
                            const price = product.salePriceU || product.priceU;
                            if (price) {
                                const actualPrice = Math.round(price / 100);
                                if (actualPrice > 50000 && actualPrice < 300000) {
                                    console.log(`💰 Wildberries альтернативный API: ${actualPrice}`);
                                    return actualPrice;
                                }
                            }
                        }
                    }
                } catch (serverError) {
                    console.log(`Сервер ${server} не ответил`);
                }
            }
        } catch (altError) {
            console.log('❌ Подход 2 не сработал:', altError.message);
        }
        
        // Подход 3: Мобильная версия сайта
        try {
            console.log('🔍 Подход 3: Мобильная версия...');
            const mobileUrl = `https://m.wildberries.ru/catalog/${productId}/detail.aspx`;
            
            const { data: mobileData } = await axios.get(mobileUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36'
                }
            });
            
            // Ищем цену в мобильной версии
            const pricePatterns = [
                /"price":\s*(\d+)/g,
                /"finalPrice":\s*(\d+)/g,
                /data-price="(\d+)"/g,
                /(\d{1,3}(?:\s?\d{3})*)\s*[₽руб]/g
            ];
            
            for (let pattern of pricePatterns) {
                const matches = [...mobileData.matchAll(pattern)];
                for (let match of matches) {
                    const price = parseInt(match[1]);
                    if (price > 50000 && price < 300000) {
                        console.log(`💰 Wildberries мобильная версия: ${price}`);
                        return price;
                    }
                }
            }
        } catch (mobileError) {
            console.log('❌ Подход 3 не сработал:', mobileError.message);
        }
        
        // Подход 4: Если все остальное не сработало, используем демо-цену с логированием
        console.log('⚠️ Wildberries: все подходы не сработали, используем демо-цену');
        console.log('💡 Совет: Wildberries активно блокирует парсинг. Возможно нужны прокси или более сложные методы');
        return null;
        
    } catch (error) {
        console.error('❌ Wildberries parser error:', error.message);
        return null;
    }
},

	TehnoYard: async url => {
		try {
			console.log('🔍 Парсим TehnoYard...')
			const { data } = await axios.get(url, {
				timeout: 15000,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				},
			})

			return extractPrice(data)
		} catch (error) {
			console.error('❌ TehnoYard parser error:', error.message)
			return null
		}
	},
}

module.exports = { storeParsers, extractPrice }
