import { resolve } from 'path';
import { DomainEventEmitter, EventDispatcher } from '../emitter';

export default {
  async subscribe({
    emitter,
    eventDispatcher,
    eventName,
    commandsPath,
  }: {
    emitter: DomainEventEmitter,
    eventDispatcher: EventDispatcher,
    eventName: string,
    commandsPath: Array<string>,
  }): Promise<void> {
    commandsPath.forEach(async (commandPath) => {
      const { default: defaultCommand } = await import(resolve(commandPath.trim()));
      const Command = defaultCommand.default || defaultCommand;

      emitter.on(eventName, (message) => {
        eventDispatcher.dispatch({ event: new Command({ message }) });
      });
    });
  },
};
