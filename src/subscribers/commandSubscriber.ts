import { resolve } from 'path';
import { CommandEmitter } from '../emitter';
import { EventHandlerInterface } from '../Interfaces';
import { messageBody } from '../types';

export default {
  async subscribe({
    emitter,
    eventName,
    handlerFactory,
    commandPath,
  }: {
    emitter: CommandEmitter,
    eventName: string,
    handlerFactory: () => EventHandlerInterface,
    commandPath: string,
  }): Promise<void> {
    const absoluteCommandPath = `${process.cwd()}/${commandPath.trim()}`;
    const resolvedCommandModule = await import(resolve(absoluteCommandPath));
    const Command = resolvedCommandModule['default'];

    emitter.on(eventName, async (message: messageBody) => {
      const command = Command.fromPayload({ message });
      await handlerFactory().handle(command);
    });
  },
};
