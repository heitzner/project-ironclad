import { randomUUID } from 'node:crypto';

const clone = (value) => structuredClone(value);

export class InMemoryPortalRepository {
  constructor(seed) {
    this.state = clone(seed);
    this.sessions = new Map();
    this.verificationChallenges = new Map();
    this.verificationReceipts = new Map();
  }

  snapshot() {
    return clone(this.state);
  }

  mutate(action) {
    const next = clone(this.state);
    const result = action(next);
    next.revision += 1;
    this.state = next;
    return clone(result);
  }

  nextId(prefix) {
    return `${prefix}-${randomUUID()}`;
  }

  findAccountByStudentId(studentId) {
    return clone(this.state.accounts.find((account) => account.studentId === studentId) || null);
  }

  findAccountById(accountId) {
    return clone(this.state.accounts.find((account) => account.id === accountId) || null);
  }

  createAccount(account) {
    return this.mutate((next) => {
      next.accounts.push(account);
      next.members[account.id] = {
        role: 'student', position: '', scope: '', course: account.course,
      };
      return account;
    });
  }

  createSession(accountId) {
    const token = `demo-${randomUUID()}`;
    this.sessions.set(token, accountId);
    return token;
  }

  resolveSession(token) {
    const accountId = token ? this.sessions.get(token) : null;
    return accountId ? this.findAccountById(accountId) : null;
  }

  deleteSession(token) {
    if (token) this.sessions.delete(token);
  }

  createVerificationChallenge({ accountId, email, purpose }) {
    const id = this.nextId('VER');
    this.verificationChallenges.set(id, {
      accountId, email, purpose, code: '123456', createdAt: Date.now(), used: false,
    });
    return id;
  }

  verifyChallenge({ challengeId, accountId, email, purpose, code }) {
    const challenge = this.verificationChallenges.get(challengeId);
    const expired = challenge && Date.now() - challenge.createdAt > 10 * 60 * 1000;
    if (!challenge || challenge.used || expired || challenge.accountId !== accountId
      || challenge.email !== email || challenge.purpose !== purpose || challenge.code !== code) return null;
    challenge.used = true;
    const receipt = this.nextId('VRC');
    this.verificationReceipts.set(receipt, {
      accountId, email, purpose, createdAt: Date.now(), used: false,
    });
    return receipt;
  }

  consumeVerificationReceipt({ receipt, accountId, email, purpose }) {
    const record = this.verificationReceipts.get(receipt);
    const expired = record && Date.now() - record.createdAt > 10 * 60 * 1000;
    if (!record || record.used || expired || record.accountId !== accountId
      || record.email !== email || record.purpose !== purpose) return false;
    record.used = true;
    return true;
  }

  updatePassword(accountId, password) {
    return this.mutate((next) => {
      const account = next.accounts.find((candidate) => candidate.id === accountId);
      if (!account) return null;
      account.password = password;
      return account;
    });
  }
}
