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
    for (const commandPath of commandsPath) {
      const absoluteCommandPath = `${process.cwd()}/${commandPath.trim()}`;
      const resolvedModule = await import(resolve(absoluteCommandPath));
      const resolvedModuleKey = Object.keys(resolvedModule)[0];
      const Command = resolvedModule[resolvedModuleKey];

      if (Command) {
        emitter.on(eventName, async (message) => {
          await eventDispatcher.dispatch({ event: Command.fromPayload({ message }) });
        });
      }
    }
  },
};
