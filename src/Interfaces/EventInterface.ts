export interface EventInterface {
  getName(): string;
  getCorrelationId(): string;
  getPayload<T = unknown>(): T;
}
