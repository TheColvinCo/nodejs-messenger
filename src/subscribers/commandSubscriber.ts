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
    const absoluteHandlerPath = `${process.cwd()}/${handlerPath.trim()}`;
    const resolvedHandlerModule = await import(resolve(absoluteHandlerPath));
    const resolvedCommandModule = await import(resolve(absoluteHandlerPath.replace('Handler', '')));
    const Handler = resolvedHandlerModule['default'];
    const Command = resolvedCommandModule['default'];

    emitter.on(eventName, (message) => {
      const handler = new Handler({
        command: new Command({ message }),
      });
      handler.handle();
    });
  },
};
