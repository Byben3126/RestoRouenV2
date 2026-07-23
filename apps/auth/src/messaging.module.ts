// messaging.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: { host: process.env.APP_SERVICE_HOST ?? '127.0.0.1', port: parseInt(process.env.PORT_APP_TCP ?? '3102') },
      },
    ]),
  ],
  exports: [ClientsModule], // 👈 crucial : rend AUTH_SERVICE dispo aux modules qui importent celui-ci
})
export class MessagingModule {}
