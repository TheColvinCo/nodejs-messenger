import {
  amqpConnect,
  producer,
  createCommand,
  createEvent,
} from '../utils';
import { config as configType, messageBody } from '../types';
import { EventInterface } from '../Interfaces';

export default class EventDispatcher {
  private config: configType;
  private readonly onDispatched: ({ message, key, exchangeName }: { message: messageBody; key: string; exchangeName: string; }) => void;

  constructor({ config, onDispatched }: { config: configType, onDispatched?: ({ message, key, exchangeName }: { message: messageBody; key: string; exchangeName: string; }) => void }) {
    this.config = config;
    this.onDispatched = onDispatched;
  }

  async dispatch({ event }: { event: EventInterface }): Promise<void>{
    const eventClassname = event.constructor.name;
    const isCommand = /Command$/.test(eventClassname);
    const isEvent = /Event$/.test(eventClassname);
    const eventConfig = this.config.routing[eventClassname];

    if (!eventConfig) {
      throw Error(`Missed event configuration for event ${eventClassname}`);
    }

    if (eventConfig.async === true || eventConfig.async === undefined) {
      if (isCommand) {
        await this.asyncCommandDispatch({ eventConfig, event });
      }

      if (isEvent) {
        await this.asyncEventDispatch({ eventConfig, event });
      }
    }
  }

  asyncDispatch = async ({
    eventConfig,
    messageBody
  }:{
    eventConfig: {
      transport: string,
    },
    messageBody: messageBody
  }): Promise<void> => {
    const {
      transport,
    } = eventConfig;

    const {
      connectionString,
      exchange,
    } = this.config.transports[transport];

    const connection = await amqpConnect(connectionString);
    const channel = await connection.createChannel();

    try {
      const { type: key } = messageBody.data;
      const message = JSON.stringify(messageBody);

      await producer({
        channel,
        message,
        key,
        exchange,
      });

      if (typeof this.onDispatched === 'function') {
        this.onDispatched({
          message: messageBody,
          key,
          exchangeName: exchange.name
        });
      }

      await channel.close();
      await connection.close();
    } catch (e) {
      await channel.close();
      await connection.close();
    }
  };

  asyncCommandDispatch = async ({
    eventConfig,
    event
  }: {
    eventConfig: {
      transport: string,
    },
    event: EventInterface
  }): Promise<void> => {
    const [company, context, version, , entity, name] = event.getName().split('.');
    const messageBody = createCommand({
      payload: event.getPayload(),
      meta: {
        company,
        context,
        version,
        entity,
        name,
      },
      entityId: event.getEntityId(),
    });

    return this.asyncDispatch({ eventConfig, messageBody });
  };

  asyncEventDispatch = async ({
    eventConfig,
    event
  }: {
    eventConfig: {
      transport: string,
    },
    event: EventInterface
  }): Promise<void> => {
    const [company, context, version, , entity, name] = event.getName().split('.');
    const messageBody = createEvent({
      payload: event.getPayload(),
      meta: {
        company,
        context,
        version,
        entity,
        name,
      },
      entityId: event.getEntityId(),
    });

    return this.asyncDispatch({ eventConfig, messageBody });
  };
}
