import express from 'express'
import { storeParsers } from '../parsers/storeParsers.js'
import { getDb } from '../utils/database.js'
import { checkAllPrices } from '../utils/priceChecker.js'

const router = express.Router()

// Test endpoint for debugging parsers
router.get('/test-parser/:storeName', async (req, res) => {
	const { storeName } = req.params
	const db = getDb()

	db.get(
		'SELECT url FROM stores WHERE name = ?',
		[storeName],
		async (err, store) => {
			if (err || !store) {
				res.status(404).json({ error: 'Store not found' })
				return
			}

			try {
				const parser = storeParsers[storeName] || storeParsers.default
				const price = await parser(store.url)
				res.json({
					store: storeName,
					url: store.url,
					price: price,
					status: price ? 'success' : 'no price found',
				})
			} catch (error) {
				res.status(500).json({
					error: error.message,
					store: storeName,
					url: store.url,
				})
			}
		}
	)
})

// Get current prices
router.get('/prices', (req, res) => {
	const db = getDb()

	const query = `
        SELECT s.id, s.name, s.url, ph.price, ph.timestamp
        FROM stores s
        LEFT JOIN price_history ph ON s.id = ph.store_id
        WHERE ph.id IN (
            SELECT MAX(id) 
            FROM price_history 
            WHERE store_id = s.id 
            GROUP BY store_id
        )
        ORDER BY ph.price ASC
    `

	db.all(query, (err, prices) => {
		if (err) {
			console.error('Database error:', err)
			res.status(500).json({ error: err.message })
			return
		}
		console.log('Returning prices:', prices)
		res.json(prices)
	})
})

// Get price history for a store
router.get('/history/:storeId', (req, res) => {
	const db = getDb()
	const { storeId } = req.params

	db.all(
		'SELECT price, timestamp FROM price_history WHERE store_id = ? ORDER BY timestamp DESC LIMIT 50',
		[storeId],
		(err, history) => {
			if (err) {
				res.status(500).json({ error: err.message })
				return
			}
			res.json(history)
		}
	)
})

// Manual price check
router.post('/check-now', async (req, res) => {
	try {
		console.log('Manual price check requested')
		await checkAllPrices()
		res.json({ message: 'Price check completed' })
	} catch (error) {
		console.error('Price check error:', error)
		res.status(500).json({ error: error.message })
	}
})

export default router
