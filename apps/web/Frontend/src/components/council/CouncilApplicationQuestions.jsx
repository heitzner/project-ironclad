import { useId } from 'react'
import fetchIcon from './assets/a61ba.svg'

export default function CouncilApplicationQuestions({ questions, state, onEdit, fieldRefs, disabled = false }) {
  const id = useId()
  return <fieldset disabled={disabled || state.busy} className="flex min-w-0 flex-col gap-3 rounded-panel border border-textMuted/30 bg-selectBg/70 p-[15px] wrap-anywhere">
    <legend className="sr-only">Application questions</legend>
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <p className="text-[10px] font-bold uppercase leading-[14px] tracking-[0.5px]">Questions</p>
      <span className="inline-flex items-center gap-1 rounded-full bg-cardBg px-2 py-0.5 text-[10px] font-semibold leading-[14px] tracking-[0.5px] text-deep"><img src={fetchIcon} alt="" />Form loaded</span>
    </div>
    <div className="flex min-w-0 flex-col gap-2">
      {questions.map((question, index) => {
        const fieldId = `${id}-${index}`, error = Object.hasOwn(state.errors, question.id) ? state.errors[question.id] : null
        const Control = question.type === 'textarea' ? 'textarea' : 'input'
        const hint = [question.required ? 'Required.' : 'Optional.', question.minLength ? `Minimum ${question.minLength} characters.` : '', question.maxLength ? `Maximum ${question.maxLength} characters.` : ''].filter(Boolean).join(' ')
        return <div key={question.id} className="flex min-w-0 flex-col gap-1">
          <label htmlFor={fieldId} className="break-words text-[10px] font-medium leading-[14px] tracking-[0.5px]">{question.prompt}</label>
          <Control
            ref={(node) => { if (node) fieldRefs.current.set(question.id, node); else fieldRefs.current.delete(question.id) }}
            id={fieldId} name={question.id} data-application-answer required={question.required} value={state.answers[question.id] ?? ''}
            onChange={(event) => onEdit(question.id, event.target.value)}
            aria-invalid={Boolean(error)} aria-describedby={`${fieldId}-help${error ? ` ${fieldId}-error` : ''}`}
            placeholder="Enter your answer here."
            className={`w-full min-w-0 rounded-control border border-textMuted bg-white px-[13px] py-[7px] text-[12px] leading-[18px] text-textPrimary placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark disabled:cursor-not-allowed disabled:opacity-60 ${question.type === 'textarea' ? 'min-h-20 resize-y' : 'min-h-[34px] max-sm:min-h-11'}`}
          />
          <p id={`${fieldId}-help`} className={question.minLength || question.maxLength || !question.required ? 'text-[11px] leading-4 text-textSecondary' : 'sr-only'}>{hint}</p>
          {error && <p id={`${fieldId}-error`} className="text-[12px] leading-[18px] text-textPrimary">{error}</p>}
        </div>
      })}
    </div>
  </fieldset>
}
