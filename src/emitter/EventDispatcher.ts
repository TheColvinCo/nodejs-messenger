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

  constructor({ config }: { config: configType }) {
    this.config = config;
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
  }): Promise<boolean> => {
    const {
      transport,
    } = eventConfig;

    const {
      connectionString,
      exchange,
    } = this.config.transports[transport];

    const connection = await amqpConnect(connectionString);

    try {
      const channel = await connection.createChannel();
      const { type: key } = messageBody.data;
      const message = JSON.stringify(messageBody);

      await producer({
        channel,
        message,
        key,
        exchange,
      });

      await connection.close();
      return true;
    } catch (error) {
      await connection.close();
      return false;
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
  }): Promise<boolean> => {
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
  }): Promise<boolean> => {
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
    });

    return this.asyncDispatch({ eventConfig, messageBody });
  };
}
