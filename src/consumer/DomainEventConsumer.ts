import { amqpConnect, toJSON } from '../utils';
import { getDomainEventsEmitter } from '../container/pubSubInitialization.js';
import { config as configType } from '../types';
import { EventEmitter } from 'events';
import { Channel, Message } from 'amqplib';

export default class DomainEventConsumer {
  private transports: configType['transports']

  constructor({ config }: { config: configType}) {
    this.transports = config.transports;
  }

  async consume({
    transport,
    queueName,
    prefetchValue,
    emitter = null,
  }: {
    transport: string,
    queueName: string,
    prefetchValue: number,
    emitter?: EventEmitter
  }): Promise<void>{
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

      const domainEventsEmitter = emitter === null
        ? getDomainEventsEmitter()
        : emitter;

      const consumerData = {
        onMessage: this.workable({ channel, emitter: domainEventsEmitter }),
        options: {
          noAck: false,
        },
      };

      channel.consume(
        queueName,
        consumerData.onMessage,
        consumerData.options,
      );
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  workable({ channel, emitter }: { channel: Channel, emitter: EventEmitter }) {
    return async (msg: Message): Promise<void> => {
      const message = toJSON(msg);
      const { data } = message;
      const { type: eventName } = data;

      try {
        emitter.emit(eventName, { message });
        channel.ack(msg);
      } catch (error) {
        channel.nack(msg, false, false);
      }
    };
  }
}
