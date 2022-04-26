// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import deadLetter from '../../src/utils/deadLetter';
import { when } from 'jest-when';

const createInstance = () => {
  const channel = {
    assertExchange: jest.fn(),
    bindQueue: jest.fn(),
    assertQueue: jest.fn(),
  };
  
  return {
    channel,
  };
};

describe('deadLetter', () => {
  describe('when we invoke', () => {
    it('should be call channel methods with expected params', async () => {
      const { channel } = createInstance();

      when(channel.assertQueue)
        .calledWith('foo.dlx.queue')
        .mockResolvedValue({ queue: 'foo.assert.queue' });

      await deadLetter({
        channel,
        targetQueue: {
          name: 'foo.queue',
          options: {
            deadLetterRoutingKey: 'foo.key',
          },
        },
        dlxQueue: {
          name: 'foo.dlx.queue',
        },
        dlxExchange: {
          name: 'foo.exchange'
        },
      });

      expect(channel.assertExchange).toBeCalledTimes(1);
      expect(channel.assertExchange).toHaveBeenCalledWith('foo.exchange','direct');
    
      expect(channel.assertQueue).toBeCalledTimes(1);
      expect(channel.assertQueue).toBeCalledWith('foo.dlx.queue');
      
      expect(channel.bindQueue).toBeCalledTimes(1);
      expect(channel.bindQueue).toHaveBeenCalledWith(
        'foo.assert.queue',
        'foo.exchange',
        'foo.key'
      );
    });
  });
});