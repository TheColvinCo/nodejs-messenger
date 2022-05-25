import EventDispatcher from '../emitter/EventDispatcher';
import DomainEventEmitter from '../emitter/DomainEventEmitter';
import CommandEmitter from '../emitter/CommandEmitter';
import domainEventSubscriber from '../subscribers/domainEventSubscriber';
import commandSubscriber from '../subscribers/commandSubscriber';
import { EventEmitter } from 'events';
import { config as configType, messageBody } from "../types";

let commandEmitter = null;
let domainEventEmitter = null;

export const getCommandEmitter = (): EventEmitter => {
  return commandEmitter;
};

export const getDomainEventsEmitter = (): EventEmitter => {
  return domainEventEmitter;
};

const subscribersInitialization = ({
  subscribers,
  eventDispatcher,
  // eslint-disable-next-line no-shadow
  domainEventEmitter,
  // eslint-disable-next-line no-shadow
  commandEmitter,
}: {
  subscribers: configType['subscribers'],
  eventDispatcher: EventDispatcher,
  domainEventEmitter: EventEmitter,
  commandEmitter: EventEmitter,
}): void => {
  if (subscribers.domainEvents) {
    subscribers.domainEvents.map(async ({ eventName, commandsPath }) => {
      try {
        await domainEventSubscriber.subscribe({
          eventDispatcher,
          emitter: domainEventEmitter,
          eventName,
          commandsPath,
        });
      } catch (error) {
        throw new Error(`Subscriber with event '${eventName}' not found. Error ${error.message}`);
      }
    });
  }

  if (subscribers.commands) {
    subscribers.commands.map(async ({ eventName, handlerFactory, commandPath }) => {
      try {
        await commandSubscriber.subscribe({
          emitter: commandEmitter,
          eventName,
          handlerFactory,
          commandPath,
        });
      } catch (error) {
        throw new Error(`Subscriber with event '${eventName}' not found. Error ${error.message}`);
      }
    });
  }
};

export const pubSubInitialization = (({ config, onDispatched }: {
  config: configType,
  onDispatched?: ({ message, key, exchangeName }: { message: messageBody; key: string; exchangeName: string; }) => void
}): {
  eventDispatcher: EventDispatcher,
  domainEventEmitter: EventEmitter,
  commandEmitter: EventEmitter,
} => {
  console.log('onDispatched', onDispatched);
  const eventDispatcher = new EventDispatcher({ config, onDispatched });
  domainEventEmitter = new DomainEventEmitter();
  commandEmitter = new CommandEmitter();
  const { subscribers } = config;

  subscribersInitialization({
    subscribers,
    eventDispatcher,
    domainEventEmitter,
    commandEmitter,
  });

  return {
    eventDispatcher,
    domainEventEmitter,
    commandEmitter,
  };
});
