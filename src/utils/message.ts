import { Message } from 'amqplib';
import { message, messageBody } from '../types';
import { v4 as uuidv4 } from 'uuid';

const parse = ({ payload, meta, type, entityId }): messageBody => {
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
      entityId,
      attributes: payload,
      type: `${company}.${context}.${version}.${type}.${entity}.${name}`,
    }
  };
};

const createEvent = ({ payload, meta, entityId }: message): messageBody => {
  return parse({
    payload,
    meta,
    type: 'domain_event',
    entityId,
  });
};

const createCommand = ({ payload, meta, entityId}: message): messageBody => {
  return parse({
    payload,
    meta,
    type: 'command',
    entityId,
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
