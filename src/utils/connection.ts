import { connect, Connection } from 'amqplib';

export const amqpConnect = (connectionString: string): Promise<Connection> => {
  return connect(connectionString);
};