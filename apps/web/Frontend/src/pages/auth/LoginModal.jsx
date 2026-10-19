import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PasswordField, TextField } from '../../components/common/FormField.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'
import { authService } from '../../services/auth.service.js'

// Sign-in form. Shows the real service result; nothing is faked on submit.
export default function LoginModal() {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await authService.signIn({ studentId, password })
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
        aria-labelledby="login-title"
        className="mx-auto flex w-full max-w-[420px] flex-col gap-4 rounded-card bg-white p-6 shadow-card"
      >
        <div className="flex items-center gap-2">
          <LogIn className="h-5 w-5 text-dark" aria-hidden="true" />
          <h1 id="login-title" className="text-[20px] font-semibold leading-7 tracking-[-0.5px] text-textPrimary">Sign in</h1>
        </div>
        <TextField id="login-student-id" label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} required autoComplete="username" />
        <PasswordField id="login-password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="text-[12px] font-medium text-textPrimary">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-control bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-dark disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
        <Link to="/account-reset" className="self-start text-[12px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Forgot your password?
        </Link>
      </form>
    </PageLayout>
  )
}
