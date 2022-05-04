import { amqpConnect, toJSON } from './index';
import { config as configType, messageBody } from '../types';

export default class MessageDeleter {
  private transports: configType['transports']

  constructor({ config }: { config: configType}) {
    this.transports = config.transports;
  }

  async consume({
    filters: {
      limit = Infinity,
      type,
      messageId,
      afterOccurredOn,
      beforeOccurredOn,
    },
    transport,
    queueName,
    prefetchValue,
  }: {
    transport: string,
    queueName: string,
    prefetchValue: number,
    filters: {
      limit?: number,
      type?: string,
      messageId?: string,
      afterOccurredOn?: number,
      beforeOccurredOn?: number
    }
  }): Promise<void> {
    if (!this.transports[transport]) {
      throw Error(`Transport ${transport} is not defined`);
    }

    const { connectionString, queues } = this.transports[transport];
    const queue = queues.find(({ name }) => name === queueName);

    if (!queue) {
      throw Error(`Queue ${queue} is not defined`);
    }

    const connection = await amqpConnect(connectionString);

    try {
      const channel = await connection.createChannel();

      if (prefetchValue) {
        channel.prefetch(prefetchValue);
      }

      const assertQueue = await channel.assertQueue(
        queueName,
      );

      let maxMessages = assertQueue.messageCount;

      while (maxMessages > 0 && limit > 0) {
        const message = await channel.get(
          queueName,
        );

        if (message !== false) {
          if (this.isDeletable({
            message: toJSON(message),
            filters: {type, messageId, afterOccurredOn, beforeOccurredOn},
          })) {
            channel.ack(message);
            --limit;
          }
          --maxMessages;
        } else {
          maxMessages = 0;
        }
      }

      await channel.close();
    } catch (error) {
      connection.close();
      throw error;
    }

    await connection.close();
  }

  isDeletable({
    message,
    filters: {
      type,
      messageId,
      afterOccurredOn,
      beforeOccurredOn,
    },
  }: {
    message: messageBody,
    filters: {
      type?: string,
      messageId?: string,
      afterOccurredOn?: number,
      beforeOccurredOn?: number,
    }
  }) {
    const messageIdAsserted = !messageId || messageId === message.data.messageId;
    const typeAsserted = !type || type === message.data.type;
    const afterOccurredOnAsserted = !afterOccurredOn || afterOccurredOn < message.data.occurredOn;
    const beforeOccurredOnAsserted = !beforeOccurredOn || beforeOccurredOn > message.data.occurredOn;

    return messageIdAsserted && typeAsserted && afterOccurredOnAsserted && beforeOccurredOnAsserted;
  }
}
