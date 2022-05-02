export interface EventInterface {
  getName(): string;
  getCorrelationId(): string;
  getPayload(): unknown;
}
