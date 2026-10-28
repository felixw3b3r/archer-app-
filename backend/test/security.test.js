const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, exactName, publicUser } = require('../src/security');

test('password hashes are salted and verify safely', async () => {
  const first = await hashPassword('pass1234');
  assert.notEqual(first, await hashPassword('pass1234'));
  assert.equal(await verifyPassword('pass1234', first), true);
  assert.equal(await verifyPassword('wrong', first), false);
});

test('name lookup is exact and public users omit credentials', () => {
  assert.equal(exactName('Ali.*').test('Alix'), false);
  assert.equal(exactName('Ali.*').test('Ali.*'), true);
  const user = publicUser({ _id: 'id', name: 'Ali', surname: 'Test', dob: '01/01/2000', role: 'student', passwordHash: 'secret' });
  assert.equal('passwordHash' in user, false);
  assert.equal(user.needsActivation, false);
});
