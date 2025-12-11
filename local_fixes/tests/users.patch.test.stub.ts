import { describe, it, expect } from 'vitest';
// import request from 'supertest';
// import { app } from '../../server/app'; // TODO: adjust to real express app import

// Integration skeleton for PATCH /api/users/:id
// NOTE: Replace placeholders for token generation and test IDs.
describe('PATCH /api/users/:id (safe fields)', () => {
  it('rejects when no allowed fields provided', async () => {
    expect(true).toBe(true); // TODO: replace with supertest call
  });

  it('updates allowed fields only', async () => {
    // const token = 'Bearer <test-token>';
    // const userId = '<test-user-id>';
    // const res = await request(app)
    //   .patch(`/api/users/${userId}`)
    //   .set('Authorization', token)
    //   .send({ name: 'Smoke User', phone: '+551199999999', ignored: 'x' });
    // expect(res.status).toBe(200);
    // expect(res.body.name).toBe('Smoke User');
    // expect(res.body.phone).toContain('+5511');
    expect(true).toBe(true);
  });
});
