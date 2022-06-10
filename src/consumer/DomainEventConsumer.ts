import { amqpConnect, toJSON } from '../utils';
import { getDomainEventsEmitter } from '../container/pubSubInitialization';
import { config as configType, messageBody } from '../types';
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
    eventualConsistency = {
      isConsistent: async (message: messageBody) => true,
      saveMessage: async (message: messageBody) => undefined,
    },
  }: {
    transport: string,
    queueName: string,
    prefetchValue: number,
    emitter?: EventEmitter,
    onError: ({error, message}: {error: Error, message?: messageBody}) => Promise<void>,
    eventualConsistency?: {
      isConsistent: (message: messageBody) => Promise<boolean>,
      saveMessage?: (message: messageBody) => Promise<void>
    },
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
        onMessage: this.workable({ channel, emitter: domainEventsEmitter, onError, eventualConsistency }),
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
      if (onError) await onError({ error });
      connection.close();
      throw error;
    }
  }

  workable({
    channel,
    emitter,
    onError,
    eventualConsistency
  }: {
    channel: Channel,
    emitter: EventEmitter,
    onError: ({error, message}: {error: Error, message: messageBody}) => Promise<void>,
    eventualConsistency: {
      isConsistent: (message: messageBody) => Promise<boolean>,
      saveMessage?: (message: messageBody) => Promise<void>
    }
    }) {
    return async (msg: Message): Promise<void> => {
      const message = toJSON(msg);
      const { data } = message;
      const { type: eventName } = data;

      try {
        const isConsistent = await eventualConsistency.isConsistent(message);
        if(!isConsistent) {
          channel.ack(msg);
          return;
        }

        emitter.emit(eventName, { message });
        eventualConsistency.saveMessage && await eventualConsistency.saveMessage(message);
        channel.ack(msg);
      } catch (error) {
        if (onError) await onError({ error, message });
        console.error(`Domain event consumer error occurred: ${error.message}`);
        channel.nack(msg, false, false);
      }
    };
  }
}
