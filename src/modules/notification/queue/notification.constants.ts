/** File par laquelle passe tout envoi de notification (Redis, BullMQ) */
export const NOTIFICATIONS_QUEUE = 'notifications';

/** Seul job de la file : envoyer une notification déjà rédigée (données : NotificationToSend) */
export const SEND_NOTIFICATION_JOB = 'send';
