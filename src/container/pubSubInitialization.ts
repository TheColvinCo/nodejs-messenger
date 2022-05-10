import EventDispatcher from '../emitter/EventDispatcher.js';
import DomainEventEmitter from '../emitter/DomainEventEmitter.js';
import CommandEmitter from '../emitter/CommandEmitter.js';
import domainEventSubscriber from '../subscribers/domainEventSubscriber.js';
import commandSubscriber from '../subscribers/commandSubscriber.js';
import { EventEmitter } from 'events';
import { config as configType } from '../types';

let commandEmitter = null;
let domainEventEmitter = null;

export const getCommandEmitter = (): EventEmitter => {
  return commandEmitter;
};

export const getDomainEventsEmitter = (): EventEmitter => {
  return domainEventEmitter;
};

const subscribersInitialization = async ({
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
}): Promise<void> => {
  if (subscribers.domainEvents) {
    await Promise.all(subscribers.domainEvents.map(async ({ eventName, commandsPath }) => {
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
    }));
  }

  if (subscribers.commands) {
    await Promise.all(subscribers.commands.map(async ({ eventName, handlerFactory, commandPath }) => {
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
    }));
  }
};

export const pubSubInitialization = (async ({ config }: { config: configType }): Promise<{
  eventDispatcher: EventDispatcher,
  domainEventEmitter: EventEmitter,
  commandEmitter: EventEmitter,
}> => {
  const eventDispatcher = new EventDispatcher({ config });
  domainEventEmitter = new DomainEventEmitter();
  commandEmitter = new CommandEmitter();
  const { subscribers } = config;

  await subscribersInitialization({
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
