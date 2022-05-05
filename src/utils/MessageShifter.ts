import { amqpConnect } from './connection';
import { toJSON } from './message';
import { config as configType, messageBody } from '../types';
import producer from './producer';

export default class MessageShifter {
  private config: configType;

  constructor({ config }: { config: configType}) {
    this.config = config;
  }

  async consume({
    targetExchange,
    transport,
    originQueueName,
    prefetchValue,
    filters: {
      limit = Infinity,
      type,
      messageId,
      afterOccurredOn,
      beforeOccurredOn,
    },
  }: {
    targetExchange: string,
    transport: string,
    originQueueName: string,
    prefetchValue: number,
    filters: {
      limit?: number,
      type?: string,
      messageId?: string,
      afterOccurredOn?: number,
      beforeOccurredOn?: number
    }
  }): Promise<void> {
    if (!this.config.transports[transport]) {
      throw Error(`Transport ${transport} is not defined`);
    }

    const exchange = this.getExchangeConfig(targetExchange);
    const { connectionString, queues } = this.config.transports[transport];
    const queue = queues.find(({ name }) => name === originQueueName);

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
        originQueueName,
      );
      
      let maxMessages = assertQueue.messageCount;

      while (maxMessages > 0 && limit > 0) {
        const message = await channel.get(
          originQueueName,
        );
        
        if (message !== false) {
          const parsedMessage = toJSON(message);

          if (this.isShifteable({
            message: parsedMessage,
            filters: {type, messageId, afterOccurredOn, beforeOccurredOn},
          })) {
            await producer({
              channel,
              message: message.content.toString(),
              key: parsedMessage.data.type,
              exchange,
            });

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

  getExchangeConfig(exchangeName: string) {
    const { transports } = this.config;
    
    const exchangeConfig = Object.entries(transports).reduce((acc, [_, transport]) => {
      const {
        exchange,
      } = transport;
      
      return {
        ...acc,
        [exchange.name]: exchange
      };
    }, {});

    const assertedConfig = exchangeConfig[exchangeName];

    if (!assertedConfig) throw Error(`Exchange ${exchangeName} doesn't exists`);

    return assertedConfig;
  }

  isShifteable({
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
  }): boolean {
    const messageIdAsserted = !messageId || messageId === message.data.messageId;
    const typeAsserted = !type || type === message.data.type;
    const afterOccurredOnAsserted = !afterOccurredOn || afterOccurredOn < message.data.occurredOn;
    const beforeOccurredOnAsserted = !beforeOccurredOn || beforeOccurredOn > message.data.occurredOn;

    return messageIdAsserted && typeAsserted && afterOccurredOnAsserted && beforeOccurredOnAsserted;
  }
}
