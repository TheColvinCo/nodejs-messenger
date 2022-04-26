import { Replies } from 'amqplib';
import { worker } from '../types';

export default async ({
  channel,
  exchange,
  queue,
  consumer,
}: worker): Promise<Replies.Consume> => {
  const { 
    name: exchangeName, 
    type: exchangeType = 'topic', 
    options: exchangeOptions,
  } = exchange;

  const { 
    name: queueName,
    bindingKey,
    options: queueOptions,
    dlx = null,
  } = queue;

  const {
    onMessage,
    options: consumerOptions
  } = consumer;
  
  await channel.assertExchange(
    exchangeName,
    exchangeType,
    exchangeOptions
  );
  
  if (dlx !== null) {
    const {
      dlxQueue,
      dlxExchange
    } = dlx.params;
    
    await dlx.func({
      channel,
      targetQueue: queue,
      dlxQueue,
      dlxExchange,
    });
  }

  const { queue: assertedQueue } = await channel.assertQueue(queueName, queueOptions);
  
  await channel.bindQueue(assertedQueue, exchangeName, bindingKey);
  
  return channel.consume(assertedQueue, onMessage, consumerOptions);
};