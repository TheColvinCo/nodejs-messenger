import { producer } from '../types';

export default async ({
  channel,
  message,
  key,
  exchange,
}: producer): Promise<void> => {
  
  const { exchange: exchangeAsserted } = await channel.assertExchange(
    exchange.name,
    exchange.type,
    exchange.options
  );
  
  channel.publish(
    exchangeAsserted,
    key,
    Buffer.from(message)
  );
  
  await channel.close();
};
