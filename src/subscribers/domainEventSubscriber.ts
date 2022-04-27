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
      const absoluteCommandPath = `${process.cwd()}/${commandPath.trim()}`;
      const resolvedModule = await import(resolve(absoluteCommandPath));
      const Command = resolvedModule['default'];
      emitter.on(eventName, (message) => {
        eventDispatcher.dispatch({ event: new Command({ message }) });
      });
    });
  },
};
