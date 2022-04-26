// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import worker from '../../src/utils/worker';
import { when } from 'jest-when';
import { deadLetter, dlxFunc } from '../../src/types';

const createInstance = () => {
  const channel = {
    assertExchange: jest.fn(),
    bindQueue: jest.fn(),
    assertQueue: jest.fn(),
    consume: jest.fn(),
  };

  const workable = jest.fn();
  const deadLetter = jest.fn();
  
  return {
    channel,
    workable,
    deadLetter,
  };
};

describe('worker', () => {
  describe('when we invoke with dlx', () => {
    it('should be call channel methods with expected params', async () => {
      const { channel, workable, deadLetter } = createInstance();
      
      const dlx: dlxFunc = {
        params: {
          channel,
          dlxQueue: {
            name: 'foo.dlx.queue',
          },
          dlxExchange: {
            name: 'foo.dlx.exchange',
            type: 'direct',
          },
        },
        func: deadLetter
      };

      const queue = {
        name: 'foo.queue',
        bindingKey: 'foo.key',
        options: {
          deadLetterExchange: 'foo.dlx.exchange',
          deadLetterRoutingKey: 'foo.dlx.route',
        },
        dlx,
      };

      when(channel.assertQueue)
        .calledWith(queue.name, queue.options)
        .mockResolvedValue({ queue: 'foo.assert.queue' });

      when(deadLetter)
        .calledWith(dlx.params)
        .mockResolvedValue();
      
      await worker({
        channel,
        exchange: {
          name: 'foo.exchange',
          type: 'topic',
          options: { durable: true }
        },
        queue,
        consumer: {
          onMessage: workable,
        }
      });

      expect(channel.assertExchange).toBeCalledTimes(1);
      expect(channel.assertExchange).toHaveBeenCalledWith('foo.exchange','topic', { durable: true });

      expect(deadLetter).toBeCalledTimes(1);
      expect(deadLetter).toHaveBeenCalledWith({ ...dlx.params, targetQueue: queue });

      expect(channel.assertQueue).toBeCalledTimes(1);
      expect(channel.assertQueue).toBeCalledWith(queue.name, queue.options);
      
      expect(channel.bindQueue).toBeCalledTimes(1);
      expect(channel.bindQueue).toHaveBeenCalledWith(
        'foo.assert.queue',
        'foo.exchange',
        'foo.key'
      );

      expect(channel.consume).toBeCalledTimes(1);
      expect(channel.consume).toHaveBeenCalledWith(
        'foo.assert.queue',
        workable,
        undefined
      );
    });
  });

  describe('when we invoke without dlx', () => {
    it('should be call channel methods with expected params', async () => {
      const { channel, workable, deadLetter } = createInstance();
      
      const queue = {
        name: 'foo.queue',
        bindingKey: 'foo.key',
        options: {
          deadLetterExchange: 'foo.dlx.exchange',
          deadLetterRoutingKey: 'foo.dlx.route',
        },
      };

      when(channel.assertQueue)
        .calledWith(queue.name, queue.options)
        .mockResolvedValue({ queue: 'foo.assert.queue' });
      
      await worker({
        channel,
        exchange: {
          name: 'foo.exchange',
          type: 'topic',
          options: { durable: true }
        },
        queue,
        consumer: {
          onMessage: workable,
        },
      });

      expect(channel.assertExchange).toBeCalledTimes(1);
      expect(channel.assertExchange).toHaveBeenCalledWith('foo.exchange','topic', { durable: true });

      expect(deadLetter).toBeCalledTimes(0);

      expect(channel.assertQueue).toBeCalledTimes(1);
      expect(channel.assertQueue).toBeCalledWith(queue.name, queue.options);
      
      expect(channel.bindQueue).toBeCalledTimes(1);
      expect(channel.bindQueue).toHaveBeenCalledWith(
        'foo.assert.queue',
        'foo.exchange',
        'foo.key'
      );

      expect(channel.consume).toBeCalledTimes(1);
      expect(channel.consume).toHaveBeenCalledWith(
        'foo.assert.queue',
        workable,
        undefined
      );
    });
  });
});