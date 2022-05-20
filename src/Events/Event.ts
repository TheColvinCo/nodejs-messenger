import { EventInterface } from '../Interfaces';
import { messageBody } from '../types';

export abstract class Event implements EventInterface {
  protected message: messageBody;

  abstract getEventType(): string;
  abstract getEntity(): string;
  abstract getActionName(): string;
  abstract getContext(): string;
  abstract getCompany(): string;
  abstract getPayload(): unknown;
  abstract getEntityId(): string;

  protected getVersion (): string {
    return '1';
  }

  getName (): string {
    return `${this.getCompany()}.${this.getContext()}.${this.getVersion()}.${this.getEventType()}.${this.getEntity()}.${this.getActionName()}`;
  }

  getCorrelationId(): string {
    return '';
  }
}
