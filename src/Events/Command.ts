import { Event } from './Event';

export abstract class Command extends Event {
  getEventType (): string {
    return 'command';
  }
}
