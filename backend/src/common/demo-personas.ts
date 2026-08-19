export const DEMO_PERSONAS = {
  alice: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Alice Mehta',
  },
  bob: {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Bob Fernandes',
  },
} as const;

export const DEMO_PERSONA_IDS = Object.values(DEMO_PERSONAS).map(
  (persona) => persona.id,
);
