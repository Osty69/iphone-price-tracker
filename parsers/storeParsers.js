import axios from 'axios';
import * as cheerio from 'cheerio';

// Generic price extractor from text
const extractPrice = (text) => {
    if (!text) return null;
    
    console.log('Extracting price from:', text);
    
    // Remove spaces and find price pattern
    const cleanText = text.replace(/\s/g, '');
    const match = cleanText.match(/(\d[\d\s]*[\.,]?\d*)/);
    
    if (match) {
        const price = parseFloat(match[1].replace(',', '.'));
        console.log('Extracted price:', price);
        // Basic validation - price should be reasonable for iPhone
        return price > 10000 && price < 1000000 ? price : null;
    }
    
    return null;
};

// Store-specific parsers
export const storeParsers = {
    'BigGeek': async (url) => {
        try {
            console.log('Parsing BigGeek...');
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            
            // BigGeek specific selectors
            const priceText = $('.product-price-current, .price, [data-product-price]').first().text();
            return extractPrice(priceText);
        } catch (error) {
            console.error('BigGeek parser error:', error.message);
            return null;
        }
    },

    'Wildberries': async (url) => {
        try {
            console.log('Parsing Wildberries...');
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
                }
            });
            const $ = cheerio.load(data);
            
            // Wildberries price selectors
            const priceText = $('.price-block__final-price, .final-price').first().text();
            return extractPrice(priceText);
        } catch (error) {
            console.error('Wildberries parser error:', error.message);
            return null;
        }
    },

    'Sotovik': async (url) => {
        try {
            console.log('Parsing Sotovik...');
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(data);
            
            const priceText = $('.price, .product-price, .cost').first().text();
            return extractPrice(priceText);
        } catch (error) {
            console.error('Sotovik parser error:', error.message);
            return null;
        }
    },

    'iPiter': async (url) => {
        try {
            console.log('Parsing iPiter...');
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(data);
            
            const priceText = $('.price, .product-price').first().text();
            return extractPrice(priceText);
        } catch (error) {
            console.error('iPiter parser error:', error.message);
            return null;
        }
    },

    'iStudio': async (url) => {
        try {
            console.log('Parsing iStudio...');
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(data);
            
            const priceText = $('.price, .product-price').first().text();
            return extractPrice(priceText);
        } catch (error) {
            console.error('iStudio parser error:', error.message);
            return null;
        }
    },

    'ReStore': async (url) => {
        try {
            console.log('Parsing ReStore...');
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(data);
            
            const priceText = $('.price, .product-price').first().text();
            return extractPrice(priceText);
        } catch (error) {
            console.error('ReStore parser error:', error.message);
            return null;
        }
    },

    'PiterGSM': async (url) => {
        try {
            console.log('Parsing PiterGSM...');
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(data);
            
            const priceText = $('.price, .product-price').first().text();
            return extractPrice(priceText);
        } catch (error) {
            console.error('PiterGSM parser error:', error.message);
            return null;
        }
    },

    'TehnoYard': async (url) => {
        try {
            console.log('Parsing TehnoYard...');
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(data);
            
            const priceText = $('.price, .product-price').first().text();
            return extractPrice(priceText);
        } catch (error) {
            console.error('TehnoYard parser error:', error.message);
            return null;
        }
    },

    // Default parser for other stores
    'default': async (url) => {
        try {
            console.log('Parsing with default parser...');
            const { data } = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(data);
            
            // Common price selectors
            const selectors = [
                '.price', '.product-price', '.cost', '.current-price',
                '[class*="price"]', '[class*="cost"]', '.final-price',
                '.product-cost', '.item-price', '.price-value',
                '.woocommerce-Price-amount', '.c-price'
            ];
            
            for (const selector of selectors) {
                const priceText = $(selector).first().text();
                const price = extractPrice(priceText);
                if (price) {
                    console.log(`Found price with selector ${selector}: ${price}`);
                    return price;
                }
            }
            
            console.log('No price found with common selectors');
            return null;
        } catch (error) {
            console.error('Default parser error:', error.message);
            return null;
        }
    }
};