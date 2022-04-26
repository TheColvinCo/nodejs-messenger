import { deadLetter } from '../types';

export default async ({
  channel,
  targetQueue,
  dlxQueue,
  dlxExchange,
}: deadLetter): Promise<void> => {
  const exchangeType = dlxExchange.type || 'direct';
  await channel.assertExchange(dlxExchange.name, exchangeType);
  
  const { queue: queueAsserted } = await channel.assertQueue(dlxQueue.name);
  const bindingKey = 
    targetQueue.options?.deadLetterRoutingKey
    ?? dlxQueue.bindingKey
    ?? '';
  
  await channel.bindQueue(
    queueAsserted,
    dlxExchange.name,
    bindingKey,
  );
};
