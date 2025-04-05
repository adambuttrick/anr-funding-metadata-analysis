import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
            const [funderData, publisherData, awardData] = await Promise.all([
                readFile(path.join(dataDir, 'funder.json'), 'utf8'),
                readFile(path.join(dataDir, 'publisher.json'), 'utf8'),
                readFile(path.join(dataDir, 'award.json'), 'utf8')
            ]);
            
            const parsedFunders = JSON.parse(funderData);
            if (parsedFunders.funders) {
                parsedFunders.funders.forEach(funder => {
                    if (funder.id) {
                        this.funders[funder.id] = funder;
                    }
                });
            }
            
            const parsedPublishers = JSON.parse(publisherData);
            if (parsedPublishers.publishers) {
                parsedPublishers.publishers.forEach(publisher => {
                    if (publisher.id) {
                        this.publishers[publisher.id] = publisher;
                    }
                });
            }
            
            const parsedAwards = JSON.parse(awardData);
            if (parsedAwards.awards) {
                parsedAwards.awards.forEach(award => {
                    if (award.id) {
                        this.awards[award.id] = award;
                    }
                });
            }

            this.timestamp = new Date().toISOString();
            this.isInitialized = true;
            console.log('Data loaded successfully');
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    clearCache() {
        this.funders = {};
        this.publishers = {};
        this.awards = {};
        this.timestamp = '';
        this.isInitialized = false;
        console.log('Cache cleared successfully');
    }
}

const runCacheClear = async () => {
    const cache = new DataCache();
    const dataDir = path.join(__dirname, 'data');
    
    try {
        await cache.loadData(dataDir);
        console.log('Current cache status:');
        console.log(`Funders: ${Object.keys(cache.funders).length}`);
        console.log(`Publishers: ${Object.keys(cache.publishers).length}`);
        console.log(`Awards: ${Object.keys(cache.awards).length}`);
        
        cache.clearCache();
        
        console.log('Cache after clearing:');
        console.log(`Funders: ${Object.keys(cache.funders).length}`);
        console.log(`Publishers: ${Object.keys(cache.publishers).length}`);
        console.log(`Awards: ${Object.keys(cache.awards).length}`);
        
        console.log('Cache cleared successfully');
    } catch (error) {
        console.error('Error:', error);
    }
};

runCacheClear();