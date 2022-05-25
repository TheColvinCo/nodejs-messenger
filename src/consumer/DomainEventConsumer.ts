import { amqpConnect, toJSON } from '../utils';
import { getDomainEventsEmitter } from '../container/pubSubInitialization';
import { config as configType } from '../types';
import { EventEmitter } from 'events';
import { Channel, Message } from 'amqplib';

export default class DomainEventConsumer {
  private readonly transports: configType['transports']

  constructor({ config }: { config: configType}) {
    this.transports = config.transports;
  }

  async consume({
    transport,
    queueName,
    prefetchValue,
    emitter = null,
    onError,
  }: {
    transport: string,
    queueName: string,
    prefetchValue: number,
    emitter?: EventEmitter,
    onError: (error: Error) => void,
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
        onMessage: this.workable({ channel, emitter: domainEventsEmitter, onError }),
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
      if (onError) onError(error);
      connection.close();
      throw error;
    }
  }

  workable({ channel, emitter, onError }: { channel: Channel, emitter: EventEmitter, onError: (error: Error) => void }) {
    return async (msg: Message): Promise<void> => {
      const message = toJSON(msg);
      const { data } = message;
      const { type: eventName } = data;

      try {
        emitter.emit(eventName, { message });
        channel.ack(msg);
      } catch (error) {
        if (onError) onError(error);
        console.error(`Domain event consumer error occurred: ${error.message}`);
        channel.nack(msg, false, false);
      }
    };
  }
}
