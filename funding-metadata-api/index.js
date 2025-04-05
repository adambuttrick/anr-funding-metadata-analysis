import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const router = express.Router();

app.use(cors({
    origin: '*',
    credentials: false
}));

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Funding Data API',
            version: '1.0.0',
            description: 'API for accessing data on funders, publishers, and awards'
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: process.env.VERCEL_URL,
                description: 'Deployment server'
            }
        ]
    },
    apis: [__filename],
};

class DataCache {
    constructor() {
        this.funders = {};
        this.publishers = {};
        this.awards = {};
        this.timestamp = '';
        this.isInitialized = false;
    }

    async loadData(dataDir) {
        if (this.isInitialized) return;
        try {
            let funderPath, publisherPath, awardPath;
            
            if (process.env.VERCEL) {
                funderPath = path.join(process.cwd(), 'data', 'funder.json');
                publisherPath = path.join(process.cwd(), 'data', 'publisher.json');
                awardPath = path.join(process.cwd(), 'data', 'award.json');
            } else {
                funderPath = path.join(dataDir, 'funder.json');
                publisherPath = path.join(dataDir, 'publisher.json');
                awardPath = path.join(dataDir, 'award.json');
            }
            
            const [funderData, publisherData, awardData] = await Promise.all([
                readFile(funderPath, 'utf8'),
                readFile(publisherPath, 'utf8'),
                readFile(awardPath, 'utf8')
            ]);
            
            const parsedFunders = JSON.parse(funderData);
            const parsedPublishers = JSON.parse(publisherData);
            const parsedAwards = JSON.parse(awardData);
            
            let funderCount = 0;
            let publisherCount = 0;
            let awardCount = 0;
            
            if (parsedFunders.funders) {
                parsedFunders.funders.forEach(funder => {
                    if (funder.id) {
                        this.funders[funder.id] = funder;
                        funderCount++;
                    }
                });
            }
            
            if (parsedPublishers.publishers) {
                parsedPublishers.publishers.forEach(publisher => {
                    if (publisher.id) {
                        this.publishers[publisher.id] = publisher;
                        publisherCount++;
                    }
                });
            }
            
            if (parsedAwards.awards) {
                parsedAwards.awards.forEach(award => {
                    if (award.id) {
                        this.awards[award.id] = award;
                        awardCount++;
                    }
                });
            }
            
            this.timestamp = new Date().toISOString();
            this.isInitialized = true;
        } catch (error) {
            throw error;
        }
    }

    getFunderById(funderId) {
        return this.funders[funderId] || null;
    }

    getPublisherById(publisherId) {
        return this.publishers[publisherId] || null;
    }

    getAwardById(awardId) {
        return this.awards[awardId] || null;
    }

    getAllFunders() {
        return Object.values(this.funders);
    }

    getAllPublishers() {
        return Object.values(this.publishers);
    }

    getAllAwards() {
        return Object.values(this.awards);
    }

    searchFunders(query) {
        if (!query || query.trim() === '') {
            return [];
        }
        
        const normalizedQuery = query.toLowerCase().trim();
        
        return Object.values(this.funders).filter(funder => {
            if (funder.attributes?.name && 
                funder.attributes.name.toLowerCase().includes(normalizedQuery)) {
                return true;
            }
            
            if (funder.attributes?.alternate_names) {
                for (const altName of funder.attributes.alternate_names) {
                    if (altName.toLowerCase().includes(normalizedQuery)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
    }
    
    searchPublishers(query) {
        if (!query || query.trim() === '') {
            return [];
        }
        
        const normalizedQuery = query.toLowerCase().trim();
        
        return Object.values(this.publishers).filter(publisher => {
            if (publisher.attributes?.name && 
                publisher.attributes.name.toLowerCase().includes(normalizedQuery)) {
                return true;
            }
            
            if (publisher.attributes?.alternate_names) {
                for (const altName of publisher.attributes.alternate_names) {
                    if (altName.toLowerCase().includes(normalizedQuery)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
    }
    
    searchAwards(query) {
        if (!query || query.trim() === '') {
            return [];
        }
        
        const normalizedQuery = query.toLowerCase().trim();
        
        return Object.values(this.awards).filter(award => {
            if (award.id && award.id.toLowerCase().includes(normalizedQuery)) {
                return true;
            }
            
            if (award.attributes?.title && 
                award.attributes.title.toLowerCase().includes(normalizedQuery)) {
                return true;
            }
            
            if (award.attributes?.award_number && 
                award.attributes.award_number.toLowerCase().includes(normalizedQuery)) {
                return true;
            }
            
            return false;
        });
    }

    getFunderPublishers(funderId) {
        const funder = this.funders[funderId];
        if (!funder || !funder.relationships?.publishers) {
            return [];
        }
        return funder.relationships.publishers;
    }

    getPublishersByFunder(funderId) {
        const result = [];
        Object.values(this.publishers).forEach(publisher => {
            if (publisher.stats?.by_funder?.[funderId]) {
                result.push(publisher);
            }
        });
        return result;
    }

    getAwardsByFunder(funderId) {
        return Object.values(this.awards).filter(award => {
            return award.relationships?.funders?.some(funder => funder.id === funderId);
        });
    }

    getAwardsByPublisher(publisherId) {
        return Object.values(this.awards).filter(award => {
            return award.stats?.publisher_breakdown?.some(pb => pb.id === publisherId);
        });
    }

    getFunderStats(funderId) {
        const funder = this.funders[funderId];
        if (!funder || !funder.stats) {
            return null;
        }
        return {
            id: funderId,
            type: "funder",
            stats: funder.stats
        };
    }

    getFunderAttributes(funderId) {
        const funder = this.funders[funderId];
        if (!funder) {
            return null;
        }
        const { stats, ...attributes } = funder;
        return attributes;
    }

    getPublisherStats(publisherId) {
        const publisher = this.publishers[publisherId];
        if (!publisher || !publisher.stats) {
            return null;
        }
        return {
            id: publisherId,
            type: "publisher",
            stats: publisher.stats
        };
    }

    getPublisherAttributes(publisherId) {
        const publisher = this.publishers[publisherId];
        if (!publisher) {
            return null;
        }
        const { stats, ...attributes } = publisher;
        return attributes;
    }
}

const cache = new DataCache();

const ensureCacheInitialized = async (req, res, next) => {
    if (!cache.isInitialized) {
        try {
            const dataDir = path.join(__dirname, 'data');
            await cache.loadData(dataDir);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to initialize data cache' });
        }
    }
    next();
};

router.use(cors({
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

router.use(ensureCacheInitialized);

/**
 * @swagger
 * /api/v1/funders:
 *   get:
 *     summary: List All Funders
 *     description: Returns a paginated list of all funders with their complete data
 *     tags: [Funders]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated array of funders with their data
 */
router.get('/funders', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    const funders = cache.getAllFunders();
    const paginatedFunders = funders.slice(startIndex, startIndex + limit);
    
    res.json({
        data: paginatedFunders,
        meta: {
            total: funders.length,
            page: page,
            limit: limit,
            pages: Math.ceil(funders.length / limit),
            timestamp: cache.timestamp
        }
    });
});

/**
 * @swagger
 * /api/v1/funders/{funderId}:
 *   get:
 *     summary: Get Funder Details
 *     description: Returns detailed information for a specific funder
 *     tags: [Funders]
 *     parameters:
 *       - in: path
 *         name: funderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed funder information
 *       404:
 *         description: Funder not found
 */
router.get('/funders/:funderId', (req, res) => {
    const funder = cache.getFunderById(req.params.funderId);
    if (!funder) {
        return res.status(404).json({ detail: `Funder ${req.params.funderId} not found` });
    }
    res.json({ data: funder });
});

/**
 * @swagger
 * /api/v1/funders/{funderId}/attributes:
 *   get:
 *     summary: Get Funder Attributes
 *     description: Returns only the attributes and relationships for a specific funder (no stats)
 *     tags: [Funders]
 *     parameters:
 *       - in: path
 *         name: funderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Funder attributes information
 *       404:
 *         description: Funder attributes not found
 */
router.get('/funders/:funderId/attributes', (req, res) => {
    const funderAttributes = cache.getFunderAttributes(req.params.funderId);
    if (!funderAttributes) {
        return res.status(404).json({ detail: `Funder ${req.params.funderId} attributes not found` });
    }
    res.json({ data: funderAttributes });
});

/**
 * @swagger
 * /api/v1/funders/{funderId}/stats:
 *   get:
 *     summary: Get Funder Stats
 *     description: Returns only the statistics for a specific funder
 *     tags: [Funders]
 *     parameters:
 *       - in: path
 *         name: funderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Funder statistics information
 *       404:
 *         description: Funder stats not found
 */
router.get('/funders/:funderId/stats', (req, res) => {
    const funderStats = cache.getFunderStats(req.params.funderId);
    if (!funderStats) {
        return res.status(404).json({ 
            detail: `Funder ${req.params.funderId} stats not found. Stats may not be available for this funder.` 
        });
    }
    res.json({ data: funderStats });
});

/**
 * @swagger
 * /api/v1/funders/{funderId}/publishers:
 *   get:
 *     summary: List Funder Publishers
 *     description: Returns a paginated list of publishers associated with a specific funder
 *     tags: [Funders]
 *     parameters:
 *       - in: path
 *         name: funderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated array of publishers related to the specified funder
 *       404:
 *         description: Funder not found or no publishers found
 */
router.get('/funders/:funderId/publishers', (req, res) => {
    const funderId = req.params.funderId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    if (!cache.getFunderById(funderId)) {
        return res.status(404).json({ detail: `Funder ${funderId} not found` });
    }
    
    const publishers = cache.getPublishersByFunder(funderId);
    if (!publishers.length) {
        return res.status(404).json({ detail: `No publishers found for funder ${funderId}` });
    }
    
    const paginatedPublishers = publishers.slice(startIndex, startIndex + limit);
    
    res.json({ 
        data: paginatedPublishers,
        meta: {
            total: publishers.length,
            page: page,
            limit: limit,
            pages: Math.ceil(publishers.length / limit),
            timestamp: cache.timestamp
        }
    });
});

/**
 * @swagger
 * /api/v1/funders/{funderId}/awards:
 *   get:
 *     summary: List Funder Awards
 *     description: Returns a paginated list of awards associated with a specific funder
 *     tags: [Funders]
 *     parameters:
 *       - in: path
 *         name: funderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated array of awards related to the specified funder
 *       404:
 *         description: Funder not found or no awards found
 */
router.get('/funders/:funderId/awards', (req, res) => {
    const funderId = req.params.funderId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    if (!cache.getFunderById(funderId)) {
        return res.status(404).json({ detail: `Funder ${funderId} not found` });
    }
    
    const awards = cache.getAwardsByFunder(funderId);
    if (!awards.length) {
        return res.status(404).json({ detail: `No awards found for funder ${funderId}` });
    }
    
    const paginatedAwards = awards.slice(startIndex, startIndex + limit);
    
    res.json({ 
        data: paginatedAwards,
        meta: {
            total: awards.length,
            page: page,
            limit: limit,
            pages: Math.ceil(awards.length / limit),
            timestamp: cache.timestamp
        }
    });
});

/**
 * @swagger
 * /api/v1/publishers:
 *   get:
 *     summary: List All Publishers
 *     description: Returns a paginated list of all publishers with their complete data
 *     tags: [Publishers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated array of publishers with their data
 */
router.get('/publishers', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    const publishers = cache.getAllPublishers();
    const paginatedPublishers = publishers.slice(startIndex, startIndex + limit);
    
    res.json({
        data: paginatedPublishers,
        meta: {
            total: publishers.length,
            page: page,
            limit: limit,
            pages: Math.ceil(publishers.length / limit),
            timestamp: cache.timestamp
        }
    });
});

/**
 * @swagger
 * /api/v1/publishers/{publisherId}:
 *   get:
 *     summary: Get Publisher Details
 *     description: Returns detailed information for a specific publisher
 *     tags: [Publishers]
 *     parameters:
 *       - in: path
 *         name: publisherId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed publisher information
 *       404:
 *         description: Publisher not found
 */
router.get('/publishers/:publisherId', (req, res) => {
    const publisher = cache.getPublisherById(req.params.publisherId);
    if (!publisher) {
        return res.status(404).json({ detail: `Publisher ${req.params.publisherId} not found` });
    }
    res.json({ data: publisher });
});

/**
 * @swagger
 * /api/v1/publishers/{publisherId}/attributes:
 *   get:
 *     summary: Get Publisher Attributes
 *     description: Returns only the attributes and relationships for a specific publisher (no stats)
 *     tags: [Publishers]
 *     parameters:
 *       - in: path
 *         name: publisherId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Publisher attributes information
 *       404:
 *         description: Publisher attributes not found
 */
router.get('/publishers/:publisherId/attributes', (req, res) => {
    const publisherAttributes = cache.getPublisherAttributes(req.params.publisherId);
    if (!publisherAttributes) {
        return res.status(404).json({ detail: `Publisher ${req.params.publisherId} attributes not found` });
    }
    res.json({ data: publisherAttributes });
});

/**
 * @swagger
 * /api/v1/publishers/{publisherId}/stats:
 *   get:
 *     summary: Get Publisher Stats
 *     description: Returns only the statistics for a specific publisher
 *     tags: [Publishers]
 *     parameters:
 *       - in: path
 *         name: publisherId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Publisher statistics information
 *       404:
 *         description: Publisher stats not found
 */
router.get('/publishers/:publisherId/stats', (req, res) => {
    const publisherStats = cache.getPublisherStats(req.params.publisherId);
    if (!publisherStats) {
        return res.status(404).json({ 
            detail: `Publisher ${req.params.publisherId} stats not found. Stats may not be available for this publisher.` 
        });
    }
    res.json({ data: publisherStats });
});

/**
 * @swagger
 * /api/v1/publishers/{publisherId}/awards:
 *   get:
 *     summary: List Publisher Awards
 *     description: Returns a paginated list of awards associated with a specific publisher
 *     tags: [Publishers]
 *     parameters:
 *       - in: path
 *         name: publisherId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated array of awards related to the specified publisher
 *       404:
 *         description: Publisher not found or no awards found
 */
router.get('/publishers/:publisherId/awards', (req, res) => {
    const publisherId = req.params.publisherId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    if (!cache.getPublisherById(publisherId)) {
        return res.status(404).json({ detail: `Publisher ${publisherId} not found` });
    }
    
    const awards = cache.getAwardsByPublisher(publisherId);
    if (!awards.length) {
        return res.status(404).json({ detail: `No awards found for publisher ${publisherId}` });
    }
    
    const paginatedAwards = awards.slice(startIndex, startIndex + limit);
    
    res.json({ 
        data: paginatedAwards,
        meta: {
            total: awards.length,
            page: page,
            limit: limit,
            pages: Math.ceil(awards.length / limit),
            timestamp: cache.timestamp
        }
    });
});

/**
 * @swagger
 * /api/v1/awards:
 *   get:
 *     summary: List All Awards
 *     description: Returns a paginated list of all awards with their complete data
 *     tags: [Awards]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated array of awards with their data
 */
router.get('/awards', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    const awards = cache.getAllAwards();
    const paginatedAwards = awards.slice(startIndex, startIndex + limit);
    
    res.json({
        data: paginatedAwards,
        meta: {
            total: awards.length,
            page: page,
            limit: limit,
            pages: Math.ceil(awards.length / limit),
            timestamp: cache.timestamp
        }
    });
});

/**
 * @swagger
 * /api/v1/awards/{awardId}:
 *   get:
 *     summary: Get Award Details
 *     description: Returns detailed information for a specific award
 *     tags: [Awards]
 *     parameters:
 *       - in: path
 *         name: awardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed award information
 *       404:
 *         description: Award not found
 */
router.get('/awards/:awardId', (req, res) => {
    const award = cache.getAwardById(req.params.awardId);
    if (!award) {
        return res.status(404).json({ detail: `Award ${req.params.awardId} not found` });
    }
    res.json({ data: award });
});

/**
 * @swagger
 * /api/v1/search/funders:
 *   get:
 *     summary: Search Funders by Name
 *     description: Returns a paginated list of funders that match the given search query
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string to match against funder names
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated array of funders matching the search query
 *       400:
 *         description: Search query is required
 */
router.get('/search/funders', (req, res) => {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    if (!query) {
        return res.status(400).json({ detail: "Search query parameter 'q' is required" });
    }
    
    const matchingFunders = cache.searchFunders(query);
    const paginatedFunders = matchingFunders.slice(startIndex, startIndex + limit);
    
    res.json({
        data: paginatedFunders,
        meta: {
            total: matchingFunders.length,
            page: page,
            limit: limit,
            pages: Math.ceil(matchingFunders.length / limit),
            timestamp: cache.timestamp,
            query: query
        }
    });
});

/**
 * @swagger
 * /api/v1/search/publishers:
 *   get:
 *     summary: Search Publishers by Name
 *     description: Returns a paginated list of publishers that match the given search query
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string to match against publisher names
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated array of publishers matching the search query
 *       400:
 *         description: Search query is required
 */
router.get('/search/publishers', (req, res) => {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    if (!query) {
        return res.status(400).json({ detail: "Search query parameter 'q' is required" });
    }
    
    const matchingPublishers = cache.searchPublishers(query);
    const paginatedPublishers = matchingPublishers.slice(startIndex, startIndex + limit);
    
    res.json({
        data: paginatedPublishers,
        meta: {
            total: matchingPublishers.length,
            page: page,
            limit: limit,
            pages: Math.ceil(matchingPublishers.length / limit),
            timestamp: cache.timestamp,
            query: query
        }
    });
});

/**
 * @swagger
 * /api/v1/search/awards:
 *   get:
 *     summary: Search Awards by Code
 *     description: Returns a paginated list of awards that match the given search query
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string to match against award codes, numbers, or titles
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated array of awards matching the search query
 *       400:
 *         description: Search query is required
 */
router.get('/search/awards', (req, res) => {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    if (!query) {
        return res.status(400).json({ detail: "Search query parameter 'q' is required" });
    }
    
    const matchingAwards = cache.searchAwards(query);
    const paginatedAwards = matchingAwards.slice(startIndex, startIndex + limit);
    
    res.json({
        data: paginatedAwards,
        meta: {
            total: matchingAwards.length,
            page: page,
            limit: limit,
            pages: Math.ceil(matchingAwards.length / limit),
            timestamp: cache.timestamp,
            query: query
        }
    });
});

app.get('/', (req, res) => {
    res.redirect('/docs');
});

app.use('/api/v1', router);

const swaggerDocs = swaggerJsdoc(swaggerOptions);

app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerDocs, {
    explorer: true,
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js'
    ]
}));

if (import.meta.url === `file://${__filename}`) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API documentation available at http://localhost:${PORT}/docs`);
    });
}

export default app;

export const config = {
    api: {
        bodyParser: false,
    },
};