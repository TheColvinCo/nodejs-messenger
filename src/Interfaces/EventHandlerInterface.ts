import { EventInterface } from './EventInterface';

export interface EventHandlerInterface {
  handle(event: EventInterface): Promise<void>;
}
