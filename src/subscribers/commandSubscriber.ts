import { resolve } from 'path';
import { CommandEmitter } from '../emitter';

export default {
  async subscribe({
    emitter,
    eventName,
    handlerPath,
  }: {
    emitter: CommandEmitter,
    eventName: string,
    handlerPath: string,
  }): Promise<void> {
    const { default: defaultCommandHandler } = await import(resolve(handlerPath.trim()));
    const { default: defaultCommand } = await import(resolve(handlerPath.replace('Handler', '').trim()));
    const Handler = defaultCommandHandler.default || defaultCommandHandler;
    const Command = defaultCommand.default || defaultCommand;

    emitter.on(eventName, (message) => {
      const handler = new Handler({
        command: new Command({ message }),
      });
      handler.handle();
    });
  },
};
