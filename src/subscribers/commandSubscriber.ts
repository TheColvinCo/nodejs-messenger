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
    const resolvedHandlerModule = await import(resolve(handlerPath.trim()));
    const resolvedCommandModule = await import(resolve(handlerPath.replace('Handler', '').trim()));
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
