import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { MessageTextRequest } from '@waha/structures/chatting.dto';
import { Queue } from 'bullmq';

export const OUTGOING_MESSAGE_QUEUE = 'outgoing-messages';

@Injectable()
export class MessageQueueService {
  constructor(
    @InjectQueue(OUTGOING_MESSAGE_QUEUE) private readonly queue: Queue,
  ) {}

  /**
   * Add a message to the outgoing queue
   */
  async enqueue(request: MessageTextRequest): Promise<any> {
    // Add to queue with a unique ID if possible or just as a new job
    const job = await this.queue.add('send-text', request, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
    return { jobId: job.id, status: 'enqueued' };
  }
}
