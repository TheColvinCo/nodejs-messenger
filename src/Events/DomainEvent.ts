import { Event } from './Event';

export abstract class DomainEvent extends Event {
  getEventType (): string {
    return 'domain_event';
  }
}
