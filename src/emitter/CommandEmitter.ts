import { EventEmitter } from 'events';

export default class CommandEmitter extends EventEmitter {
  on(eventName: string, originalFunction: (message: unknown) => void): this {
    const decoratedFunction = async ({
      message,
      onSuccess,
      onError,
    }: {
      message: unknown,
      onSuccess?: () => void,
      onError?: ({ error }: { error: Error }) => void,
    }): Promise<void> => {
      try {
        await originalFunction(message);
        if (onSuccess) onSuccess();
      } catch (error) {
        if (onError) onError({ error });
      }
    };

    super.addListener(eventName, decoratedFunction);

    return this;
  }
}
