import { ApiError, apiClient, unavailableOperation } from './api.js'
import { validArchive, validEvents, validProfile } from '../components/student/student.model.js'

const confirmed = value => value?.confirmed === true && typeof value.id === 'string' && Boolean(value.id.trim())
const download = value => value?.blob instanceof Blob && value.blob.size > 0
  && typeof value.fileName === 'string' && Boolean(value.fileName.trim())
const contracts = {
  getEvents: validEvents,
  getArchive: validArchive,
  getProfile: validProfile,
  updateProfile: confirmed,
  register: confirmed,
  exportArchive: download,
  getArchiveAsset: download,
}

// Frontend adapters only. Wire paths and institutional policy belong to the later Backend phase.
export function createStudentService({ client = apiClient, operations = {} } = {}) {
  const adapters = { ...operations }
  const service = { supports: operation => typeof adapters[operation] === 'function' }
  for (const [operation, valid] of Object.entries(contracts)) {
    service[operation] = async (input = {}, { signal } = {}) => {
      if (!service.supports(operation)) throw unavailableOperation()
      const result = await adapters[operation](input, { client, signal })
      if (!valid(result) || (operation === 'updateProfile' && result.id !== input.id)
        || (operation === 'register' && result.eventId !== input.eventId)) {
        throw new ApiError('The service response is incomplete. Check the latest information before retrying.', { code: 'INVALID_RESPONSE' })
      }
      return result
    }
  }
  return Object.freeze(service)
}

export const studentService = createStudentService()
