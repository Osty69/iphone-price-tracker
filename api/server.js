// Улучшенные заголовки для обхода защиты
const getHeaders = (store) => {
    const baseHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
    };

    // Специфичные заголовки для некоторых магазинов
    if (store === 'iPiter') {
        return {
            ...baseHeaders,
            'Referer': 'https://ipiter.ru/',
            'Sec-Fetch-User': '?1'
        };
    }

    if (store === 'Sotovik') {
        return {
            ...baseHeaders,
            'Referer': 'https://spb.sotovik.shop/'
        };
    }

    return baseHeaders;
};

// Встроенные парсеры магазинов с улучшенными заголовками
const storeParsers = {
    'BigGeek': async (url) => {
        try {
            const { data } = await axios.get(url, {
                timeout: 15000,
                headers: getHeaders('BigGeek')
            });
            return extractPrice(data);
        } catch (error) {
            console.error('❌ BigGeek parser error:', error.message);
            return null;
        }
    },

    'Sotovik': async (url) => {
        try {
            const { data } = await axios.get(url, {
                timeout: 20000,
                headers: getHeaders('Sotovik')
            });

            // Ищем в структурированных данных
            const jsonLdMatch = data.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
            if (jsonLdMatch) {
                try {
                    const jsonData = JSON.parse(jsonLdMatch[1]);
                    if (jsonData.offers && jsonData.offers.price) {
                        const price = parseInt(jsonData.offers.price);
                        if (price > 140000 && price < 200000) return price;
                    }
                } catch (e) {}
            }

            const metaMatches = data.match(/<meta[^>]*content="[^"]*(\d{5,7})[^"]*"[^>]*>/g);
            if (metaMatches) {
                for (let meta of metaMatches) {
                    const priceMatch = meta.match(/(\d{5,7})/);
                    if (priceMatch) {
                        const price = parseInt(priceMatch[1]);
                        if (price > 140000 && price < 200000) return price;
                    }
                }
            }
            return extractPrice(data);
        } catch (error) {
            console.error('❌ Sotovik parser error:', error.message);
            return null;
        }
    },

    'iPiter': async (url) => {
        try {
            const { data } = await axios.get(url, {
                timeout: 15000,
                headers: getHeaders('iPiter')
            });
            
            // Специфичный поиск для iPiter
            const pricePatterns = [
                /<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/span>/i,
                /<div[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/div>/i,
                /"price":\s*"(\d+)"/i,
                /data-price="(\d+)"/i
            ];

            for (let pattern of pricePatterns) {
                const match = data.match(pattern);
                if (match) {
                    const price = extractPrice(match[1]);
                    if (price) return price;
                }
            }

            return extractPrice(data);
        } catch (error) {
            console.error('❌ iPiter parser error:', error.message);
            return null;
        }
    },

    'iStudio': async (url) => {
        try {
            const { data } = await axios.get(url, {
                timeout: 20000,
                headers: getHeaders('iStudio')
            });

            const priorityPatterns = [
                /(\d{1,3}(?:\s?\d{3})*(?:\s?[.,]\s?\d{2})?)\s*[₽руб]/gi,
                /цена[^>]*>([^<]+)/gi,
                /class="[^"]*price[^"]*"[^>]*>([^<]+)</gi,
                /itemprop="price"[^>]*content="([^"]+)"/i
            ];

            for (let pattern of priorityPatterns) {
                const matches = [...data.matchAll(pattern)];
                for (let match of matches) {
                    const price = extractPrice(match[1] || match[0]);
                    if (price && price > 140000 && price < 170000) return price;
                }
            }

            const allNumbers = data.match(/\d{5,7}/g);
            if (allNumbers) {
                const uniqueNumbers = [...new Set(allNumbers)];
                for (let num of uniqueNumbers) {
                    const price = parseInt(num);
                    if (price > 140000 && price < 170000) return price;
                }
            }
            return null;
        } catch (error) {
            console.error('❌ iStudio parser error:', error.message);
            return null;
        }
    },

    'ReStore': async (url) => {
        try {
            const { data } = await axios.get(url, {
                timeout: 15000,
                headers: getHeaders('ReStore')
            });
            
            // ReStore часто использует data-атрибуты
            const dataPriceMatch = data.match(/data-price="(\d+)"/);
            if (dataPriceMatch) {
                const price = parseInt(dataPriceMatch[1]);
                if (price > 140000 && price < 200000) return price;
            }
            
            return extractPrice(data);
        } catch (error) {
            console.error('❌ ReStore parser error:', error.message);
            return null;
        }
    },

    'PiterGSM': async (url) => {
        try {
            const { data } = await axios.get(url, {
                timeout: 20000,
                headers: getHeaders('PiterGSM')
            });

            // Ищем в JSON данных
            const jsonMatches = [
                ...data.matchAll(/"price":\s*"?(\d+(?:\.\d+)?)"?/g),
                ...data.matchAll(/"value":\s*"?(\d+(?:\.\d+)?)"?/g),
            ];

            for (let match of jsonMatches) {
                const price = parseInt(match[1]);
                if (price > 140000 && price < 200000) return price;
            }

            // Ищем в data-атрибутах
            const dataPriceMatches = data.match(/data-price="(\d+)"/g);
            if (dataPriceMatches) {
                for (let match of dataPriceMatches) {
                    const priceMatch = match.match(/data-price="(\d+)"/);
                    if (priceMatch) {
                        const price = parseInt(priceMatch[1]);
                        if (price > 140000 && price < 200000) return price;
                    }
                }
            }

            // Ищем большие числа
            const largeNumbers = data.match(/\d{5,7}/g);
            if (largeNumbers) {
                const uniqueNumbers = [...new Set(largeNumbers)];
                for (let num of uniqueNumbers) {
                    const price = parseInt(num);
                    if (price > 140000 && price < 200000) return price;
                }
            }
            return null;
        } catch (error) {
            console.error('❌ PiterGSM parser error:', error.message);
            return null;
        }
    },

    'TehnoYard': async (url) => {
        try {
            const { data } = await axios.get(url, {
                timeout: 15000,
                headers: getHeaders('TehnoYard')
            });
            return extractPrice(data);
        } catch (error) {
            console.error('❌ TehnoYard parser error:', error.message);
            return null;
        }
    },

    'Technolove': async (url) => {
        try {
            const { data } = await axios.get(url, {
                timeout: 20000,
                headers: getHeaders('Technolove')
            });

            // Technolove - ищем в различных форматах
            const patterns = [
                /(\d{1,3}(?:\s?\d{3})*(?:\s?[.,]\s?\d{2})?)\s*[₽руб]/gi,
                /цена[^>]*>([^<]+)/gi,
                /стоимость[^>]*>([^<]+)/gi,
                /class="[^"]*price[^"]*"[^>]*>([^<]+)</gi,
                /id="price"[^>]*>([^<]+)</gi
            ];

            for (let pattern of patterns) {
                const matches = [...data.matchAll(pattern)];
                for (let match of matches) {
                    const price = extractPrice(match[1] || match[0]);
                    if (price && price > 140000 && price < 200000) return price;
                }
            }

            // Ищем числа в диапазоне
            const allNumbers = data.match(/\d{5,7}/g);
            if (allNumbers) {
                const uniqueNumbers = [...new Set(allNumbers)];
                for (let num of uniqueNumbers) {
                    const price = parseInt(num);
                    if (price > 140000 && price < 200000) return price;
                }
            }
            return null;
        } catch (error) {
            console.error('❌ Technolove parser error:', error.message);
            return null;
        }
    },

    'default': async (url) => {
        try {
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: getHeaders('default')
            });
            return extractPrice(data);
        } catch (error) {
            console.error('❌ Default parser error:', error.message);
            return null;
        }
    }
};