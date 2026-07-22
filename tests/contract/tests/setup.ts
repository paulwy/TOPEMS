import { PactV3 } from '@pact-foundation/pact';

export const createMockProvider = (serviceName: string) => {
  return new PactV3({
    consumer: 'topems-web',
    provider: serviceName,
    pactfileWriteMode: 'merge',
    dir: './pacts',
  });
};

export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

export const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export const authHeaders = (token: string) => ({
  ...defaultHeaders,
  Authorization: `Bearer ${token}`,
});
