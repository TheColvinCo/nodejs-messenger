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

  getPayload(): unknown {
    return {
      foo: 'bar'
    };
  }
}
