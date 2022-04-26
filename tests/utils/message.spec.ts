// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { message } from '../../src/types';
import { createEvent, createCommand } from '../../src/utils/message';

describe('createEvent', () => {
  describe('when create an event we should get an expected message', () => {
    it('should return expected message', async () => {
      const payload = {
        id: 1234,
        foo: 'bar',
      };
      
      const eventData: message = {
        payload,
        meta: {
          company: 'foo',
          context: 'bar',
          version: 1,
          entity: 'myEntity',
          name: 'some-event',
        },
      };

      const { data } = createEvent(eventData);
      
      expect(data.attributes).toEqual(payload);
      expect(data.type).toEqual('foo.bar.1.domain_event.myEntity.some-event');
    });
  });
});

describe('createCommand', () => {
  describe('when create a command we should get an expected message', () => {
    it('should return expected message', async () => {
      const payload = {
        id: 1234,
        foo: 'bar',
      };
      
      const eventData: message = {
        payload,
        meta: {
          company: 'foo',
          context: 'bar',
          version: 1,
          entity: 'myEntity',
          name: 'some-command',
        },
      };

      const { data } = createCommand(eventData);
      
      expect(data.attributes).toEqual(payload);
      expect(data.type).toEqual('foo.bar.1.command.myEntity.some-command');
    });
  });
});