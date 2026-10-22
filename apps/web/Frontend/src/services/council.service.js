import { ApiError, apiClient, unavailableOperation } from './api.js'

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const hasIdentity = (value) => isRecord(value) && typeof value.id === 'string' && value.id.trim().length > 0
const hasOutcome = (value) => hasIdentity(value) && typeof value.status === 'string' && value.status.trim().length > 0

// These are normalized frontend shapes, not a proposed HTTP API or wire format.
const contracts = {
  getFeed: (value) => isRecord(value) && Array.isArray(value.campaigns) && Array.isArray(value.categories)
    && (value.council === null || (hasIdentity(value.council) && typeof value.council.name === 'string'
      && Number.isInteger(value.council.activeEventCount) && value.council.activeEventCount >= 0)),
  getApplicationForm: (value) => isRecord(value)
    && (value.form === null || (hasIdentity(value.form) && value.form.version != null && Array.isArray(value.form.questions)))
    && (value.application === null || hasOutcome(value.application)),
  getApplications: (value) => isRecord(value) && Array.isArray(value.applications)
    && Number.isInteger(value.pendingTotal) && value.pendingTotal >= 0 && isRecord(value.pagination)
    && isRecord(value.filters),
  createPost: hasOutcome,
  submitApplication: hasOutcome,
  reviewApplication: (value) => isRecord(value) && hasOutcome(value.application),
  exportApplications: (value) => value instanceof Blob,
}

export function createCouncilService({ client = apiClient, operations = {} } = {}) {
  const adapters = { ...operations }
  const service = { supports: (operation) => typeof adapters[operation] === 'function' }

  for (const [operation, valid] of Object.entries(contracts)) {
    service[operation] = async (input = {}, { signal } = {}) => {
      if (!service.supports(operation)) throw unavailableOperation()
      const result = await adapters[operation](input, { client, signal })
      if (!valid(result)) {
        throw new ApiError('The service response is incomplete. Please retry.', { code: 'INVALID_RESPONSE' })
      }
      return result
    }
  }
  return Object.freeze(service)
}

// Deliberately disconnected until real integration adapters are supplied.
export const councilService = createCouncilService()
