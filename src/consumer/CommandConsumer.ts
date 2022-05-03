import { amqpConnect, toJSON, retryable } from '../utils';
import { getCommandEmitter } from '../container/pubSubInitialization.js';
import { config as configType } from '../types';
import { EventEmitter } from 'events';
import { Channel, Message } from 'amqplib';

export default class CommandConsumer {
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
    emitter?: EventEmitter
    onError: (error: Error) => void,
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
        onError,
      });

      channel.consume(
        queueName,
        onMessage,
        {
          noAck: false,
        },
      );
    } catch (error) {
      if (onError) onError(error);
      connection.close();
      throw error;
    }
  }

  workable({
    channel,
    emitter,
    retryPolicy,
    queueName,
    onError
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
    onError: (error: Error) => void,
  }) {
    return async (msg: Message): Promise<void> => {
      const message = toJSON(msg);
      const { data } = message;
      const { type: eventName } = data;

      try {
        const onErrorCallback = ({ error }) => {
          if (!retryPolicy) channel.nack(msg, false, false);

          if (onError) onError(error);

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
        emitter.emit(eventName, { message, onSuccess, onError: onErrorCallback });
      } catch (error) {
        if (onError) onError(error);
        channel.nack(msg, false, false);
      }
    };
  }
}
