import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueProducerService } from './queue.producer.service';
import { RegistrationProcessor } from './registration.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'registration_queue',
    }),
  ],
  providers: [QueueProducerService, RegistrationProcessor],
  exports: [BullModule, QueueProducerService],
})
export class QueueModule {}
