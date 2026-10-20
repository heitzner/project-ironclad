import { getTestUser, signInTestAccount, signOutTestAccount } from './test-auth.js'
import { createCouncilService } from '../../services/council.service.js'
import { getPreviewFeed, previewFeed } from '../../data/preview-feed.js'
import { createStudentService } from '../../services/student.service.js'
import { previewStudentEvents } from '../student/student.model.js'

// These permissions expose frontend views only. Live sessions retain their own capabilities.
export function previewSession(user) {
  return {
    user,
    capabilities: user?.role === 'council'
      ? { canCreatePost: true, canReviewApplications: true }
      : user?.role === 'student' ? { canApply: true } : {},
  }
}

export const previewAuthActions = Object.freeze({
  preview: true,
  signIn: async ({ studentId, password, remember }) => previewSession(await signInTestAccount(studentId, password, remember)),
  signOut: async () => { signOutTestAccount(); return { signedOut: true } },
})

// Only the feed read is supplied; no preview mutation reports a fabricated save.
export const previewCouncilService = createCouncilService({ operations: { getFeed: async criteria => getPreviewFeed(criteria) } })
export const previewStudentService = createStudentService({ operations: { getEvents: async () => previewStudentEvents(previewFeed) } })

export const frontendPreview = Object.freeze({
  loadSession: async () => previewSession(getTestUser()),
  authActions: previewAuthActions,
  viewer: { data: previewFeed },
  council: { service: previewCouncilService },
  student: { service: previewStudentService, preview: true },
})
