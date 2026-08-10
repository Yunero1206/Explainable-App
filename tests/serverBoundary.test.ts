import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { CanonicalCaseRecord } from '../src/canonical/types.js';
import { createEmptyCanonicalRecord } from '../src/canonical/factory.js';

describe('Server Boundary', () => {
  const mockRunIntake = vi.fn();
  const app = createApp({ runIntakeTransition: mockRunIntake });

  it('rejects forged replay mode in production', async () => {
    // temporarily set node_env
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const res = await request(app)
      .post('/api/intake')
      .set('x-et-dev-inference-mode', 'replay')
      .send({ prior_record: createEmptyCanonicalRecord('case-1', 'C-1', 'T', 'O') });
      
    expect(res.status).toBe(400);
    expect(res.body.stage).toBe('FORGED_REPLAY_REJECTED');
    
    process.env.NODE_ENV = orig;
  });

  it('validates prior_record presence', async () => {
    const res = await request(app)
      .post('/api/intake')
      .send({ message: 'Hello' });
      
    expect(res.status).toBe(400);
    expect(res.body.stage).toBe('MISSING_PRIOR_RECORD');
  });

  it('validates prior_record structure', async () => {
    const res = await request(app)
      .post('/api/intake')
      .send({ prior_record: { id: 'invalid' } }); // Not a valid record
      
    expect(res.status).toBe(400); // Because zod parse throws
  });

  it('calls dependency and validates output', async () => {
    const validRec = createEmptyCanonicalRecord('case-1', 'C-1', 'T', 'O');
    mockRunIntake.mockResolvedValue(validRec);

    const res = await request(app)
      .post('/api/intake')
      .send({ prior_record: validRec, message: 'Hello' });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.case.id).toBe('case-1');
  });
});
