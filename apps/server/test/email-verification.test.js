import assert from 'node:assert/strict'
import test from 'node:test'
import { createEmailVerificationService } from '../src/services/emailVerificationService.js'

test('configured email delivery sends a safe verification message through the injected transport', async () => {
  let transportOptions
  let message
  const service = createEmailVerificationService({
    user: 'mailer@example.test',
    pass: 'application-password',
    fromName: 'IronClad QA',
    createTransport: options => {
      transportOptions = options
      return { sendMail: async input => { message = input; return { messageId: 'message-1' } } }
    },
  })
  const result = await service.sendVerificationCode({ email: 'student@example.test', purpose: 'signup', code: '654321', expiresInMinutes: 10 })
  assert.equal(service.deliveryEnabled, true)
  assert.equal(transportOptions.service, 'gmail')
  assert.equal(message.to, 'student@example.test')
  assert.equal(message.from.address, 'mailer@example.test')
  assert.match(message.text, /654321/)
  assert.doesNotMatch(message.subject, /654321/)
  assert.deepEqual(result, { delivered: true, messageId: 'message-1' })
})

test('missing credentials disables delivery without constructing a transporter', async () => {
  const service = createEmailVerificationService({
    user: '', pass: '', createTransport: () => assert.fail('transport must not be created'),
  })
  assert.equal(service.deliveryEnabled, false)
  assert.deepEqual(await service.sendVerificationCode({ email: 'student@example.test', purpose: 'signup', code: '123456', expiresInMinutes: 10 }), { delivered: false })
})
