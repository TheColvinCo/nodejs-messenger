import { Message } from 'amqplib';
import { message, messageBody } from '../types';
import { v4 as uuidv4 } from 'uuid';

const parse = ({ payload, meta, type }): messageBody => {
  const {
    company,
    context,
    version,
    entity,
    name,
  } = meta;

  return {
    data: {
      messageId: uuidv4(),
      occurredOn: Date.now(),
      attributes: payload,
      type: `${company}.${context}.${version}.${type}.${entity}.${name}`,
    }
  };
};

const createEvent = ({ payload, meta }: message): messageBody => {
  return parse({
    payload,
    meta,
    type: 'domain_event',
  });
};

const createCommand = ({ payload, meta }: message): messageBody => {
  return parse({
    payload,
    meta,
    type: 'command',
  });
};

const toJSON = (message: Message): any => {
  return JSON.parse(message.content.toString());
};

export {
  createEvent,
  createCommand,
  toJSON,
};
