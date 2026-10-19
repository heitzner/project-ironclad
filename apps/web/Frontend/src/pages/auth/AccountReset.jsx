import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TextField } from '../../components/common/FormField.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'
import { authService } from '../../services/auth.service.js'

// Password reset request. Success is only shown after the service confirms.
export default function AccountReset() {
  const [studentId, setStudentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await authService.requestReset({ studentId })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <form
        onSubmit={handleSubmit}
        aria-labelledby="reset-title"
        className="mx-auto flex w-full max-w-[420px] flex-col gap-4 rounded-card bg-white p-6 shadow-card"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-dark" aria-hidden="true" />
          <h1 id="reset-title" className="text-[20px] font-semibold leading-7 tracking-[-0.5px] text-textPrimary">Reset account</h1>
        </div>
        <TextField id="reset-student-id" label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} required autoComplete="username" />
        {error && <p role="alert" className="text-[12px] font-medium text-textPrimary">{error}</p>}
        {sent && <p role="status" className="text-[12px] font-semibold text-deep">Reset instructions have been sent.</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-control bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-dark disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {submitting ? 'Sending...' : 'Send reset link'}
        </button>
        <Link to="/login" className="self-start text-[12px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Back to sign in
        </Link>
      </form>
    </PageLayout>
  )
}
