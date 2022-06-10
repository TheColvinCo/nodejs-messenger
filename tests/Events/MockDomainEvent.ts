import { DomainEvent } from '../../src/main';

export class MockDomainEvent extends DomainEvent {
  getActionName(): string {
    return 'foo_action';
  }

  getCompany(): string {
    return 'foo_company';
  }

  getContext(): string {
    return 'test';
  }

  getEntity(): string {
    return 'mock';
  }

  getEntityId(): string {
    return 'mock_1';
  }

  getPayload(): unknown {
    return {
      foo: 'bar'
    };
  }
}
