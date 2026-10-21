import test from 'node:test'
import assert from 'node:assert/strict'
import { frontendAccounts } from './frontend-accounts.js'
import { createFrontendStore, systemStorageKey } from './frontend-system.js'
import { canManageMembers } from './organization.js'

const memoryStorage = () => {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
}
Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: memoryStorage(), configurable: true })
const { signInTestAccount, signOutTestAccount, getFrontendDirectory, getTestUser } = await import('../components/auth/test-auth.js')

test('all 13 documented accounts sign in with the correct role and no public password', async () => {
  assert.deepEqual(['council', 'admin', 'student'].map(role => frontendAccounts.filter(account => account.role === role).length), [5, 5, 3])
  assert.equal(new Set(frontendAccounts.map(account => account.studentId)).size, 13)
  for (const account of frontendAccounts) {
    const user = await signInTestAccount(account.studentId.toLowerCase(), account.password)
    assert.equal(user.id, account.id)
    assert.equal(user.role, account.role)
    assert.equal(user.position, account.position)
    assert.equal(user.password, undefined)
    await assert.rejects(signInTestAccount(account.studentId, 'wrong-password'), /Incorrect/)
  }
  assert(getFrontendDirectory().every(user => !('password' in user)))
  signOutTestAccount()
  assert.equal(getTestUser(), null)
})

test('fresh accounts provide three managers and two lower positions in each organization', () => {
  const store = createFrontendStore({ directory: getFrontendDirectory() })
  for (const role of ['council', 'admin']) {
    const users = getFrontendDirectory().filter(user => user.role === role).map(store.user)
    assert.equal(users.filter(canManageMembers).length, 3)
    assert.equal(users.filter(user => user.position === 'President').length, 1)
    assert.equal(users.filter(user => !canManageMembers(user)).length, 2)
  }
})

test('adding accounts preserves stored workflow data, handovers and earlier executive appointments', () => {
  const storage = memoryStorage()
  const oldStore = createFrontendStore({ storage })
  const admin = frontendAccounts.find(account => account.id === 'test-admin')
  const existingVp = { id: 'existing-vp', name: 'Existing Vice President', role: 'student', course: 'BSIT' }
  oldStore.assignPosition(admin, existingVp, 'Vice President')
  const nomination = oldStore.nominatePresident(admin, existingVp.id)
  oldStore.respondHandover(existingVp, nomination.id, 'accept')
  const saved = JSON.parse(storage.getItem(systemStorageKey))
  saved.posts[0].title = 'Preserved announcement'
  storage.setItem(systemStorageKey, JSON.stringify(saved))
  const migrated = createFrontendStore({ storage, directory: getFrontendDirectory() })
  assert.equal(migrated.getSnapshot().posts[0].title, 'Preserved announcement')
  assert.equal(migrated.user(admin).position, 'Member')
  assert.equal(migrated.user(existingVp).position, 'President')
  assert.equal(migrated.getSnapshot().handovers[0].status, 'accepted')
  assert.equal(migrated.getSnapshot().members['test-admin-secretary'].position, 'Secretary')
})

test('new default officers do not replace an existing holder of the same executive position', () => {
  const storage = memoryStorage()
  const oldStore = createFrontendStore({ storage })
  const admin = frontendAccounts[0]
  oldStore.assignPosition(admin, { id: 'existing-secretary', name: 'Existing Secretary', course: 'BSCS' }, 'Secretary')
  const migrated = createFrontendStore({ storage, directory: getFrontendDirectory() })
  assert.equal(migrated.getSnapshot().members['existing-secretary'].position, 'Secretary')
  assert.equal(migrated.getSnapshot().members['test-admin-secretary'].position, 'Member')
})

test('email changes require a receipt and rejected changes leave the saved profile intact', () => {
  const store = createFrontendStore()
  const user = frontendAccounts.find(account => account.role === 'student')
  store.saveProfile(user, { id: user.id, email: user.email, displayName: 'Saved display name' })
  const before = store.getSnapshot()
  assert.throws(() => store.saveProfile(user, { id: user.id, email: 'new@campus.example.test', displayName: 'Unsaved name' }), /Verify your new School Email/)
  assert.equal(store.getSnapshot(), before)
  store.saveProfile(user, { id: user.id, email: 'new@campus.example.test', emailVerificationReceipt: 'supplied-adapter-receipt' })
  assert.equal(store.getSnapshot().profiles[user.id].email, 'new@campus.example.test')
  assert.equal(store.getSnapshot().profiles[user.id].emailVerified, false)
})

test('display name, avatar and correction saves do not require email verification when the address is unchanged', () => {
  const store = createFrontendStore()
  const user = frontendAccounts.find(account => account.role === 'student')
  store.saveProfile(user, { id: user.id, email: user.email, displayName: 'Updated name', avatarUrl: 'second.png' })
  store.saveProfile(user, { id: user.id, correction: { field: 'Official full name', value: 'Correct official name', reason: 'Please correct my record.' } })
  assert.equal(store.getSnapshot().profiles[user.id].displayName, 'Updated name')
  assert.equal(store.getSnapshot().profiles[user.id].avatarUrl, 'second.png')
  assert.equal(store.getSnapshot().profiles[user.id].email, user.email)
  assert.equal(store.getSnapshot().profiles[user.id].corrections.length, 1)
})
