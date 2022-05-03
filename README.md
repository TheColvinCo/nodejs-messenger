# Colvin nodejs async events

A RabbitMQ package with some utils like retryables

### Usage

This library give you some classes, functions, types and interfaces ready to use. The idea behind this project has been inspired from messenger Symfony component so we have to define a config file and a couple of files. Let's see how to start it with.
 
* Create a config file with a required structure
* Setup your transports and bind the events
* Create your events and commands with their respective handlers
* Create your consumers

### Create a config file with a required structure
You have to create a file with this structure or a callable which returns this structure (up to you). Later you must to import this file so you can put it in any place. Let's see an example explained

```js
export default {
  transports: {
    accounting_commands: { // A transport unique name as identifier
      connectionString: process.env.RABBITMQ_CONNECTION_URL, // A dns connection string like --> amqp://rabbitmq:rabbitmq@rabbitmq-blom:5672
      exchange: { // the exchange for this transport where all message will be send it
        name: 'blom.accounting.commands.exchange', 
        type: 'fanout',
      },
      queues: [ 
        {
          name: 'blom.accounting.commands', // A queue name
          bindingKey: null, // A queue binding key. You can use null for fanout exchanges or wildcard string for topic ones
          options: { // All allowed queue options provided for the ampq node lib
            durable: true,
            deadLetterExchange: 'blom.accounting.exchange.dlx',
            deadLetterRoutingKey: 'blom.accounting.commands.dlx',
          },
          retryPolicy: { // The retries policiy for this trasnport. The retries will be try in a exponential way (firstly in 2s, secondly in 4s, lastly in 6s)
            maxRetries: 3,
            delay: 2000,
            retryExchangeName: 'blom.superapp.retry.exchange',
          },
        },
      ],
    },
    // <----- others trasnports goes here
  },
  subscribers: {
    domainEvents: [ // A mandatory key. All your domains events config goes under it
      {
        eventName: 'blom.superapp.1.domain_event.order.updated', // The event which the built-in domain events subscribers will subscribe it
        commandsPath: [ // An array of commands paths witch will be created and dispached. These events (in this case commands) must implement the EventInterface
          'server/events/orders/command/SyncronizeOrderCommand.js',
          'server/events/orders/command/SendOrderNotificationCommand.js',
        ],
      },
      // <--- Other events goes here
    ],
    commands: [
      {
        eventName: 'blom.accounting.1.command.order.syncronize_order', // The event which the built-in command subscribers will subscribe it
        handlerFactory: () => new SyncronizeOrderCommandHandler(), // The handler which will be invoke passing their Command as argument
        commandPath: 'server/events/orders/command/SendOrderNotificationCommand.js' // The command path
      },
      // <--- Other commands goes here
    ],
  },
  routing: { // A map of events wich will can dispatch through a specific transports
    SyncronizeOrderCommand: { // The key is the name of the class ([instance].constructor.name)
      transport: 'accounting_commands',
    },
    // <--- Other events goes here
  },
};

```
---
### Setup your transports and bind the events
There are two functions for setting up. You should use this functions before app init.
```js
import { pubSubInitialization, transportsInitialization } from '@thecolvinco/nodejs-messenger';
import config from 'path-to-your-config-file';

  const {
    eventDispatcher,
    domainEventEmitter,
    commandEmitter,
  } = pubSubInitialization({ config });

  transportsInitialization({ config });

```
---
### Create your events and commands with their respective handlers
This is an example for a Command
```js
export default class CreateProductToAlgoliaCommand extends Command {
  readonly product: { userId: string; id: string; };

  constructor ({ product }) {
    super();
    this.product = product;
  }

  getActionName (): string {
    return 'create_algolia';
  }

  getEntity (): string {
    return 'product';
  }

  static fromPayload ({ message }): CreateProductToAlgoliaCommand {
    const { product } = message.data.attributes;
    return new CreateProductToAlgoliaCommand({ product });
  }

  getPayload () {
    return {
      product: this.product,
    };
  }
}

```
This is an example for a command handler
```js
export default class CreateProductToAlgoliaCommandHandler {
  // Some constructor with some deps here
  
  async handle (command: CreateProductToAlgoliaCommand) {
    const { product } = command;
    
    // Do something here!
  }
}

```
---
### Consumers example
```js
import { CommandConsumer } from '@thecolvinco/nodejs-messenger';
import eventsConfig from '../../config/events.config.js';
import container from '../container';

const { commandEmitter, logger } = container;

const commandConsumer = new CommandConsumer({ config: eventsConfig({ container }) });

commandConsumer.consume({
  emitter: commandEmitter,
  prefetchValue: 1,
  transport: 'superapp_commands',
  queueName: 'blom.superapp.commands',
  onError: (error: Error) => logger.error(error.message, { tags: ['commands-consumer'] }),
}).then(() => {
  console.info('Waiting for messages....');
}).catch(error => {
  console.error(error.message);
  process.exit();
});


```
### About

This package is maintained by [TheColvinCo](https://www.thecolvinco.com)

### LICENSE

Code is licensed under the [MIT License](./LICENSE).

