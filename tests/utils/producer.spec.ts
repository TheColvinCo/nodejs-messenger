// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import producer from '../../src/utils/producer';
import { when } from 'jest-when';

const createInstance = () => {
  const channel = {
    assertExchange: jest.fn(),
    publish: jest.fn(),
    close: jest.fn(),
  };
  
  return {
    channel,
  };
};

describe('producer', () => {
  describe('when we invoke', () => {
    it('should be call channel methods with expected params', async () => {
      const { channel } = createInstance();
      const exchange = {
        name: 'foo.exchange',
        type: 'topic',
        options: {
          durable: true,
        },
      };

      const key = 'foo.key';
      const message = 'some message';
      

      when(channel.assertExchange)
        .calledWith(
          exchange.name,
          exchange.type,
          exchange.options
        )
        .mockResolvedValue({ exchange: 'foo.assert.exchange' });
      
      await producer({
        channel,
        message,
        key,
        exchange
      });

      expect(channel.assertExchange).toBeCalledTimes(1);
      
      expect(channel.publish).toBeCalledTimes(1);
      expect(channel.publish).toHaveBeenCalledWith(
        'foo.assert.exchange',
        key,
        Buffer.from(message)
      );

      expect(channel.close).toBeCalledTimes(1);
    });
  });
});