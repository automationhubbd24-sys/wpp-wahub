import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MessageTextRequest } from '@waha/structures/chatting.dto';
import { SessionManager } from '@waha/core/abc/manager.abc';
import { BanProtectionService } from '@waha/core/services/BanProtectionService';
import { OUTGOING_MESSAGE_QUEUE } from './MessageQueueService';

@Processor(OUTGOING_MESSAGE_QUEUE)
@Injectable()
export class MessageQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageQueueProcessor.name);

  constructor(
    private readonly manager: SessionManager,
    private readonly banProtection: BanProtectionService,
  ) {
    super();
  }

  /**
   * Process an outgoing message job
   */
  async process(job: Job<MessageTextRequest, any, string>): Promise<any> {
    const request = job.data;
    const sessionName = request.session || 'default';

    this.logger.log(`Processing job ${job.id} for session ${sessionName} to ${request.chatId}`);

    try {
      const whatsapp = await this.manager.getWorkingSession(sessionName);

      // 1. Parse Spintax (e.g. {Hello|Hi})
      request.text = this.banProtection.parseSpintax(request.text);

      // 2. Simulate human behavior (Typing, Random Delays)
      // This will pause the worker, naturally pacing messages
      await this.banProtection.simulateHumanBehavior(whatsapp, request);

      // 3. Send the actual message
      const result = await whatsapp.sendText(request);
      
      this.logger.log(`Message sent successfully for job ${job.id}`);

      // 4. Wait a bit more after sending to avoid being too fast for next job
      await this.banProtection.waitBetweenMessages();

      return result;
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`, error.stack);
      throw error; // Re-throw to allow BullMQ to retry if configured
    }
  }
}
