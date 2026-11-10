/** Serveur Redis partagé par les files BullMQ et le cache */
export const redisConnection = () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
});
