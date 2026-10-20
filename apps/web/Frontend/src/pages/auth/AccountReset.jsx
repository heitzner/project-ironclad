import { useRef, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TextField } from '../../components/common/FormField.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'
import { usePortal } from '../../components/common/portal.context.js'
import useStudentAction from '../../components/student/useStudentAction.js'

export default function AccountReset() {
  const [email, setEmail] = useState('')
  const portal = usePortal()
  const reset = portal?.authActions?.resetPassword
  const action = useStudentAction('account-reset')
  const currentEmail = useRef(null)
  return <PageLayout>
    <form onSubmit={async event => {
      event.preventDefault()
      if (!reset || action.busy || action.blocked) return
      currentEmail.current = email.trim()
      await action.run(async input => {
        const result = await reset(input)
        if (result?.confirmed !== true || typeof result.message !== 'string' || !result.message.trim()) throw new Error('The reset request has not been confirmed. Check its status before retrying.')
        return result
      }, { email: currentEmail.current })
    }} aria-labelledby="reset-title" className="mx-auto flex w-full max-w-[420px] flex-col gap-4 rounded-card bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-dark" aria-hidden="true" />
        <h1 id="reset-title" className="text-[20px] font-semibold leading-7 text-textPrimary">Reset account</h1>
      </div>
      <fieldset disabled={action.busy || action.blocked}>
        <TextField id="reset-email" label="School email" type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" />
      </fieldset>
      {!reset && <p className="text-sm text-textSecondary">Account reset is not connected yet.</p>}
      {action.error && <p role="alert" className="text-sm text-textPrimary">{action.error}</p>}
      {action.result && <p role="status" className="text-sm text-deep">{action.result.message}</p>}
      <button type="submit" disabled={!reset || action.busy || action.blocked} className="min-h-11 rounded-control bg-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{action.busy ? 'Sending…' : 'Send reset link'}</button>
      <Link to="/login" className="text-sm font-semibold text-dark underline">Back to sign in</Link>
    </form>
  </PageLayout>
}
