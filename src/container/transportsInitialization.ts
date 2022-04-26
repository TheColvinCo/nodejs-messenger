import { amqpConnect } from '../utils';
import { config as configType } from '../types';

export default async ({ config }: { config: configType }): Promise<void> => {
  const { transports } = config;

  Object.entries(transports).forEach(async ([, transport]) => {
    const {
      connectionString,
      exchange,
      queues = [],
    } = transport;

    const connection = await amqpConnect(connectionString);
    const channel = await connection.createChannel();

    const { 
      name: exchangeName,
      type: exchangeType,
      options: exchangeOptions = {}
    } = exchange;
    
    await channel.assertExchange(
      exchangeName,
      exchangeType,
      exchangeOptions,
    );

    await Promise.all(queues.map(async ({
      name: queueName,
      bindingKey = null,
      options: queueOptions = {},
    }) => {
      const pattern = bindingKey || '';
      const { queue: assertedQueue } = await channel.assertQueue(queueName, queueOptions);
      await channel.bindQueue(assertedQueue, exchangeName, pattern);
    }));

    connection.close();
  });
};
