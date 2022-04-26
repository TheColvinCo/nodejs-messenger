// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import retryable from '../../src/utils/retryable';

const createInstance = () => {
  const channel = {
    assertExchange: jest.fn(),
    bindQueue: jest.fn(),
    publish: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const messageFactory = (data) => {
    return {
      content: Buffer.from('foo message'),
      fields: {
        routingKey: 'foo.test.key',
      },
      properties: {
        headers: [],
      },
      ...data,
    };
  };

  const queueFactory = (data) => {
    return {
      name: 'foo-queue',
      ...data,
    };
  };

  const retryExchangeFactory = (data) => {
    return {
      name: 'foo-retry-exchange',
      ...data,
    };
  };
  
  return {
    channel,
    messageFactory,
    queueFactory,
    retryExchangeFactory,
  };
};

const retryableParams = (overrideData) => {
  const {
    messageDataOverride = {},
    queueDataOverride = {},
    retryExchangeDataOverride = {},
    ...override,
  } = overrideData || {};
  
  const { channel, messageFactory, queueFactory, retryExchangeFactory } = createInstance();
  const message = messageFactory(messageDataOverride);
  const queue = queueFactory(queueDataOverride);
  const retryExchange = retryExchangeFactory(retryExchangeDataOverride);

  return {
    channel,
    message,
    queue,
    retryExchange,
    maxRetries: 2,
    delay: 2000,
    ...override
  };
};

describe('retryable', () => {
  describe('channel should be called with expected params with default params', () => {
    it('assertExchange should received expected params', async () => {
      const params = retryableParams();
      const { channel } = params;
      await retryable(params);

      expect(channel.assertExchange).toHaveBeenCalledTimes(1);
      expect(channel.assertExchange).toHaveBeenCalledWith(
        'foo-retry-exchange',
        'x-delayed-message',
        {
          durable: false,
          arguments: {
            'x-delayed-type': 'direct',
          },
        }
      );
    });

    it('publish should received expected params', async () => {
      const params = retryableParams();
      const { channel, message } = params;
      await retryable(params);

      expect(channel.publish).toHaveBeenCalledTimes(1);
      expect(channel.publish).toHaveBeenCalledWith(
        'foo-retry-exchange',
        'foo.test.key',
        message.content,
        {
          headers: {
            'x-retries': 1,
            'x-delay': 2000,
          }
        }
      );
    });

    it('bindQueue should received expected params', async () => {
      const params = retryableParams();
      const { channel } = params;
      
      await retryable(params);
      
      expect(channel.bindQueue).toHaveBeenCalledTimes(1);
      expect(channel.bindQueue).toHaveBeenCalledWith(
        'foo-queue',
        'foo-retry-exchange',
        'foo.test.key'
      );
    });
  });

  describe('retries should modified expected headers', () => {
    it('on first retry should call channel functions with correct data', async () => {
      const messageDataOverride = {
        properties: {
          headers: {},
        }
      };
      const params = retryableParams({ messageDataOverride });
      const { channel, message } = params;
      
      await retryable(params);

      expect(channel.publish).toHaveBeenCalledWith(
        'foo-retry-exchange',
        'foo.test.key',
        message.content,
        {
          headers: {
            'x-retries': 1,
            'x-delay': 2000,
          }
        }
      );

      expect(channel.ack).toHaveBeenCalledWith(message);
      expect(channel.nack).toHaveBeenCalledTimes(0);
    });

    it('on second retry should call channel functions with correct data', async () => {
      const messageDataOverride = {
        properties: {
          headers: {
            'x-retries': 1
          },
        }
      };
      const params = retryableParams({ messageDataOverride });
      const { channel, message } = params;
      
      await retryable(params);

      expect(channel.publish).toHaveBeenCalledWith(
        'foo-retry-exchange',
        'foo.test.key',
        message.content,
        {
          headers: {
            'x-retries': 2,
            'x-delay': 4000,
          }
        }
      );

      expect(channel.ack).toHaveBeenCalledWith(message);
      expect(channel.nack).toHaveBeenCalledTimes(0);
    });

    it('with no retries available should call channel functions with correct data', async () => {
      const messageDataOverride = {
        properties: {
          headers: {
            'x-retries': 2
          },
        },
      };
      const params = retryableParams({ messageDataOverride, onRejected: jest.fn()});
      const { channel, message, onRejected } = params;
      
      await retryable(params);

      expect(channel.nack).toHaveBeenCalledWith(message, false, false);
      expect(onRejected).toHaveBeenCalledWith(message);
      expect(channel.ack).toHaveBeenCalledTimes(0);
    });
  });

  describe('channel should be called with expected params with custom params', () => {
    it('should call channel functions with correct data', async () => {
      const messageDataOverride = {
        properties: {
          headers: {
            'x-retries': 1
          },
        }
      };
      const queueDataOverride = {
        name: 'bar-queue',
        bindingKey: 'bar.key',
      };
      
      const retryExchangeDataOverride = {
        name: 'bar-exchange',
        options: {
          durable: false,
          arguments: {
            'x-delayed-type': 'topic',
          },
          foo: 'bar'
        }
      };

      const params = retryableParams({
        messageDataOverride,
        queueDataOverride,
        retryExchangeDataOverride,
        delay: 3000,
      });
      const { channel, message } = params;
      
      await retryable(params);

      expect(channel.assertExchange).toHaveBeenCalledWith(
        'bar-exchange',
        'x-delayed-message',
        {
          durable: false,
          arguments: {
            'x-delayed-type': 'topic',
          },
          foo: 'bar',
        }
      );

      expect(channel.publish).toHaveBeenCalledWith(
        'bar-exchange',
        'bar.key',
        message.content,
        {
          headers: {
            'x-retries': 2,
            'x-delay': 6000,
          }
        }
      );

      expect(channel.bindQueue).toHaveBeenCalledWith(
        'bar-queue',
        'bar-exchange',
        'bar.key'
      );
    });
  });
});