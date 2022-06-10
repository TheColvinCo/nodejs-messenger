import { EventEmitter } from 'events';

export default class DomainEventEmitter extends EventEmitter {
  on(eventName: string, originalFunction: (message: unknown) => void): this {
    const decoratedFunction = async ({
      message,
      onSuccess,
      onError,
    }: {
      message: unknown,
      onSuccess?: () => void,
      onError?: ({ error }: { error: Error }) => Promise<void>,
    }): Promise<void> => {
      try {
        await originalFunction(message);
        if (onSuccess) onSuccess();
      } catch (error) {
        if (onError) await onError({ error });
      }
    };

    super.addListener(eventName, decoratedFunction);

    return this;
  }
}
