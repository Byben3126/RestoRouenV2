import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { WorkerCreatedEvent } from '../events/worker-created.event';

@Injectable()
export class WorkerNotificationsListener {
  @OnEvent('worker.created')
  async handleWorkerCreated(payload: WorkerCreatedEvent) {
    // Simulation de l'envoi de notification (Discord/Slack)
    console.log(`[Notification] Nouveau worker ajouté : ${payload.email}`);

    await fetch('https://discord.com/api/webhooks/fake-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `👷 Nouveau Worker : **${payload.email}** a rejoint l'équipe en tant que **${payload.email}** !`,
      }),
    });
  }
}
