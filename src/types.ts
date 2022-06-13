import { Channel, Options, Message, ConsumeMessage } from 'amqplib';
import { EventInterface, EventHandlerInterface } from './Interfaces';

type queue = {
  name: string,
  exchange?: string,
  bindingKey?: string,
  options?: Options.AssertQueue,
  dlx?: {
    func: (params: deadLetter) => Promise<void>,
    params: deadLetter
  },
};

type exchange = {
  name: string,
  type?: string,
  options?: Options.AssertExchange,
};

type retryExchange = {
  channel: Channel,
  retryExchange: exchange,
};

type retryable = {
  channel: Channel,
  message: Message,
  queue: queue,
  retryExchange: exchange,
  maxRetries?: number,
  delay?: number,
  onRejected?: (msg: ConsumeMessage) => void
};

type deadLetter = {
  channel: Channel,
  targetQueue: queue,
  dlxQueue: queue,
  dlxExchange: exchange,
};

type consumer = {
  onMessage: (msg: ConsumeMessage | null ) => void,
  options?: Options.Consume
};

type worker = {
  channel: Channel,
  exchange: exchange,
  queue: queue,
  consumer: consumer,
};

type producer = {
  channel: Channel,
  message: string,
  key: string,
  exchange: exchange,
};

type dlxFunc = {
  func: (params: deadLetter) => Promise<void>,
  params: deadLetter
};

type messageBody = {
  data: {
    messageId: string,
    occurredOn: number,
    entityId: string,
    type: string,
    attributes: unknown,
  }
};

type message = {
  payload: unknown,
  entityId: string,
  meta: {
    company: string,
    context: string,
    version: string,
    entity: string,
    name: string,
  },
};

type config = {
  transports: {
    [key: string]: {
      connectionString: string,
      exchange: {
        name: string,
        type: string,
        options?: Options.AssertExchange
      },
      queues: Array<
        {
          name: string,
          bindingKey?: string,
          options: {
            durable: boolean,
            deadLetterExchange: string,
            deadLetterRoutingKey: string,
          },
          retryPolicy?: {
            maxRetries: number,
            delay: number,
          }
        }
      >,
    }
  },
  subscribers: {
    domainEvents: Array<{
      eventName: string,
      commandsPath: Array<string>,
    }>,
    commands: Array<{
      eventName: string,
      handlerFactory: () => EventHandlerInterface,
      commandPath: string,
    }>,
  },
  routing: {
    eventClassName: {
      transport: string,
      async?: boolean,
    }
  }
}

interface EventDispatcher {
  dispatch: ({ event: EventInterface }) => Promise<void>
}

export {
  retryExchange,
  retryable,
  exchange,
  queue,
  worker,
  deadLetter,
  dlxFunc,
  producer,
  message,
  messageBody,
  config,
  EventDispatcher,
  EventInterface,
  EventHandlerInterface,
};

