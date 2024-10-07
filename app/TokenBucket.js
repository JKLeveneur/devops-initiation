import {createClient} from "redis";
import 'dotenv/config.js'

class TokenBucket {
    static VITESSE_RECUPERATION_JETON = 1;
    static INITIAL_NOMBRE_JETONS = 15;
    static COUT_JETONS_REQUETE = 6;

    constructor() {
        if (TokenBucket.instance) {
            return TokenBucket.instance
        }

        TokenBucket.instance = this
        TokenBucket.instance.redisClient = null
        this.userBuckets = new Map()
    }

    async getRedisInstance() {
        if (TokenBucket.instance.redisClient) {
            return TokenBucket.instance.redisClient
        }

        TokenBucket.instance.redisClient = await createClient({
                password: process.env.REDIS_PASSWORD,
                socket: {
                    host: process.env.REDIS_HOST,
                    port: process.env.REDIS_PORT,
                }
            })
            .on('error', err => console.log('Redis Client Error', err))
            .connect();

        return TokenBucket.instance.redisClient;
    }

     async updateBucket(userIP) {
         userIP = 'jeankenny_' + userIP

         console.log('new request from user ' + userIP)

         let redisInstance = await TokenBucket.instance.getRedisInstance();
         let userBuckets = JSON.parse(await redisInstance.get(userIP))

         console.log(userBuckets)

         if (!userBuckets) {
             console.log('user don\'t exist so create him')

             await redisInstance.set(userIP, JSON.stringify({
                 'jetons': TokenBucket.INITIAL_NOMBRE_JETONS,
                 'timestamp': Date.now()
             }));

             userBuckets = JSON.parse(await redisInstance.get(userIP))

             /* this.userBuckets.set(userIP, {
                 'jetons': TokenBucket.INITIAL_NOMBRE_JETONS,
                 'timestamp': Date.now()
             }); */

             console.log(`User ${userIP} having ${userBuckets.jetons} jetons at ${userBuckets.timestamp}`)
         }

         console.log(`User ${userIP} request allowed`)

         await redisInstance.set(userIP, JSON.stringify({
             'jetons': userBuckets.jetons,
             'timestamp': Date.now()
         }));

         userBuckets = JSON.parse(await redisInstance.get(userIP))

         let nouveauNombreJetons = userBuckets.jetons - TokenBucket.COUT_JETONS_REQUETE

         let nombreSecondesDepuisDerniereRequete = (Date.now() - userBuckets.timestamp) / 1000

         console.log(`User ${userIP} last request at ${nombreSecondesDepuisDerniereRequete} secondes`)

        let nombreJetonsAAjouter = Math.floor(nombreSecondesDepuisDerniereRequete) * TokenBucket.COUT_JETONS_REQUETE

        if (nouveauNombreJetons + nombreJetonsAAjouter <= TokenBucket.INITIAL_NOMBRE_JETONS) {
            nouveauNombreJetons += nouveauNombreJetons
        } else {
            nouveauNombreJetons = TokenBucket.INITIAL_NOMBRE_JETONS
        }

         if ((userBuckets.jetons - TokenBucket.COUT_JETONS_REQUETE <= 0) || (nouveauNombreJetons - TokenBucket.COUT_JETONS_REQUETE <= 0)) {
             console.log(`User ${userIP} don't have jeton`)

             await redisInstance.set(userIP, JSON.stringify({
                 'jetons': nouveauNombreJetons,
                 'timestamp': Date.now()
             }));

             return false;
         }

         /* await redisInstance.set(userIP, {
             'jetons': nouveauNombreJetons,
             'timestamp': Date.now()
         }); */

         await redisInstance.set(userIP, JSON.stringify({
             'jetons': nouveauNombreJetons,
             'timestamp': Date.now()
         }));

         userBuckets = JSON.parse(await redisInstance.get(userIP))

         /* this.userBuckets.set(userIP, {
             'jetons': nouveauNombreJetons,
             'timestamp': Date.now()
         }); */

         console.log(`User ${userIP} having ${userBuckets.jetons} jetons at ${userBuckets.timestamp}`)

         return true
     }
}

const instance = new TokenBucket()

export default instance