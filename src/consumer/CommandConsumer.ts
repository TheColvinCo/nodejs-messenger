import { amqpConnect, toJSON, retryable } from '../utils';
import { getCommandEmitter } from '../container/pubSubInitialization.js';
import { config as configType } from '../types';
import { EventEmitter } from 'events';
import { Channel, Message } from 'amqplib';

export default class CommandConsumer {
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
  }): Promise<void> {
    if (!this.transports[transport]) {
      throw Error(`Transport ${transport} is not defined`);
    }

    const { connectionString, queues } = this.transports[transport];
    const queue = queues.find(({ name }) => name === queueName);

    if (!queue) {
      throw Error(`Queue ${queue} is not defined`);
    }

    const { retryPolicy = null } = queue;

    const connection = await amqpConnect(connectionString);

    try {
      const channel = await connection.createChannel();

      if (prefetchValue) {
        channel.prefetch(prefetchValue);
      }

      const commandEmitter = emitter === null
        ? getCommandEmitter()
        : emitter;

      const onMessage = this.workable({
        channel,
        emitter: commandEmitter,
        retryPolicy,
        queueName,
      });

      channel.consume(
        queueName,
        onMessage,
        {
          noAck: false,
        },
      );
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  workable({
    channel,
    emitter,
    retryPolicy,
    queueName,
  }: {
    channel: Channel,
    emitter: EventEmitter,
    retryPolicy: {
      maxRetries: number,
      delay: number,
      retryExchangeName?: string,
      onRejected?: (message: Message) => void
    },
    queueName: string,
  }) {
    return async (msg: Message): Promise<void> => {
      const message = toJSON(msg);
      const { data } = message;
      const { type: eventName } = data;

      try {
        const onError = () => {
          if (!retryPolicy) channel.nack(msg, false, false);

          const {
            maxRetries,
            delay,
            retryExchangeName = 'blom.retries.exchange',
            onRejected = null,
          } = retryPolicy;

          retryable({
            channel,
            message: msg,
            queue: {
              name: queueName,
            },
            retryExchange: {
              name: retryExchangeName,
            },
            maxRetries,
            delay,
            onRejected,
          });
        };

        const onSuccess = () => {
          channel.ack(msg);
        };
        emitter.emit(eventName, { message, onSuccess, onError });
      } catch (error) {
        console.error(`Command consumer error occurred: ${error.message}`);
        channel.nack(msg, false, false);
      }
    };
  }
}
