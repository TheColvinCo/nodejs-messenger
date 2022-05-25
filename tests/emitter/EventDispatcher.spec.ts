import { EventDispatcher } from '../../src/main';
import { MockDomainEvent } from '../Events/MockDomainEvent';
import { amqpConnect, producer } from '../../src/utils';

const createEventData = () => {
  return {
    data: {
      messageId: 'f03dbb39-53ff-4b71-954c-57460629cb20',
      occurredOn: 1653382425675,
      attributes: { foo: 'bar'},
      type: 'foo_company.test.1.domain_event.mock.foo_action',
    }
  };
};

jest.mock('../../src/utils', () => {
  return {
    createEvent: () => {
      return createEventData();
    },
    amqpConnect: jest.fn(() => {
      return {
        createChannel: jest.fn(() => {
          return {
            close: jest.fn(),
          };
        }),
        close: jest.fn(),
      };
    }),
    producer: jest.fn(),
  };
});


const createInstance = (config, onDispatched = null) => {
  const domainEvent = new MockDomainEvent();
  const dispatcher = new EventDispatcher({ config, onDispatched });

  return {
    dispatcher,
    domainEvent
  };
};

const configFactory = (props) => {
  return {
    ...props,
  };
};

describe('#dispatch', () => {
  describe('when an domain event is dispatched', () => {
    it('expected error must be thrown', async () => {
      const { dispatcher, domainEvent } = createInstance(configFactory({ routing: {}}));

      await expect(async () => {
        await dispatcher.dispatch({ event: domainEvent });
      }).rejects.toThrowError('Missed event configuration for event MockDomainEvent');
    });

    it('async dispatch should be called as expected', async () => {
      const config = configFactory({ routing: {
        MockDomainEvent: {
          transport: 'foo_transport',
        }
      }});

      const { dispatcher, domainEvent } = createInstance(config);

      dispatcher.asyncDispatch = jest.fn();

      await dispatcher.dispatch({ event: domainEvent });

      expect(dispatcher.asyncDispatch).toHaveBeenCalledWith({
        messageBody: createEventData(),
        eventConfig:  { transport: 'foo_transport' },
      });
    });

    it('producer should be called as expected', async () => {
      const config = configFactory({
        transports: {
          foo_transport: {
            connectionString: 'amqp://foo',
            exchange: {
              name: 'foo_exchange',
            },
          },
        },
        routing: {
          MockDomainEvent: {
            transport: 'foo_transport',
          }
        }
      });

      const { dispatcher, domainEvent } = createInstance(config);
      await dispatcher.dispatch({ event: domainEvent });

      expect(amqpConnect).toBeCalledWith('amqp://foo');
      expect(producer).toHaveBeenCalledWith({
        channel: expect.anything(),
        message: JSON.stringify(createEventData()),
        key: 'foo_company.test.1.domain_event.mock.foo_action',
        exchange: {
          name: 'foo_exchange',
        },
      });
    });

    it('onDispatched should be called as expected', async () => {
      const config = configFactory({
        transports: {
          foo_transport: {
            connectionString: 'amqp://foo',
            exchange: {
              name: 'foo_exchange',
            },
          },
        },
        routing: {
          MockDomainEvent: {
            transport: 'foo_transport',
          }
        }
      });

      const onDispatched = jest.fn();
      const { dispatcher, domainEvent } = createInstance(config, onDispatched);
      await dispatcher.dispatch({ event: domainEvent });

      expect(amqpConnect).toBeCalledWith(expect.anything());
      expect(producer).toHaveBeenCalledWith(expect.anything());
      expect(onDispatched).toHaveBeenCalledWith({
        message: createEventData(),
        key: 'foo_company.test.1.domain_event.mock.foo_action',
        exchangeName: 'foo_exchange',
      });
    });
  });
});
