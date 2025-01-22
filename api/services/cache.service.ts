import statsModel from "../models/stats.model";

class CacheService {

    private inited: boolean = false;
    private cache: {
        zanoBured: number[];
    }

    constructor() {
        this.cache = {
            zanoBured: [],
        }
    }

    init() {

        if (this.inited) return;
        this.inited = true;

        (async () => {
            while (true) {

                try {
                    const burnedZanoResult = await statsModel.getZanoBurned([
                        {
                            start: Date.now() - 3_600_000 * 24 * 7 * 30,
    
                            end: Date.now(),
                        },
                    ]);
                 
                    this.cache.zanoBured = burnedZanoResult;
                } catch (error) {
                    console.error(error);
                }


                await new Promise(r => setTimeout(r, 10000));
            }
        })();
        
    }


    async getCachedData() {
        return this.cache;
    }
}

const cacheService = new CacheService();
cacheService.init();

export default cacheService;
