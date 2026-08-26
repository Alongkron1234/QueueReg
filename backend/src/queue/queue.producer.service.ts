import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface RegistrationJobData {
  requestId: string;
  studentId: string;
  sectionId: string;
  yearLevel: number;
  timestamp: string;
}

@Injectable()
export class QueueProducerService {
  private readonly logger = new Logger(QueueProducerService.name);

  constructor(
    @InjectQueue('registration_queue')
    private readonly registrationQueue: Queue<RegistrationJobData>,
  ) {}

  async addRegistrationJob(data: RegistrationJobData) {
    // Year 4 = priority 1 (highest), Year 3 = 2, Year 2 = 3, Year 1 = 4
    const priority = Math.max(1, 5 - data.yearLevel);

    const job = await this.registrationQueue.add(
      'process_registration',
      data,
      {
        jobId: data.requestId,
        priority,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `📥 Job added to queue [registration_queue] | RequestId: ${data.requestId} | StudentId: ${data.studentId} | SectionId: ${data.sectionId} | Priority: ${priority}`,
    );

    return job;
  }
}
