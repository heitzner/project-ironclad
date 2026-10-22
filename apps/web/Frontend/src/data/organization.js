export const positions = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Auditor', 'Committee Member', 'Member']
export const topPositions = positions.slice(0, 3)
export const organizationScope = user => user?.role === 'admin' ? 'ACES' : user?.course
export const canManageMembers = user => ['admin', 'council'].includes(user?.role) && user.disabled !== true && !['disabled', 'suspended'].includes(user.status) && topPositions.includes(user.position)
export const positionLabel = user => user?.role === 'admin' ? `ACES ${user.position || 'Member'}` : user?.role === 'council' ? `${user.course} Council ${user.position || 'Member'}` : 'Student'
export function effectiveUser(user, state) {
  if (!user) return null
  const membership = state.members?.[user.id]
  return { ...user, ...membership, ...state.profiles[user.id], name: state.profiles[user.id]?.displayName || user.name }
}

export function organizationActions({ mutate, state: getState, clock, id }) {
  const actor = (user, next) => { const current = effectiveUser(user, next); if (!canManageMembers(current)) throw new Error('Only the President, Vice President, and Secretary can manage this organization.'); return current }
  return {
    user: user => effectiveUser(user, getState()),
    assignPosition(user, member, position) {
      return mutate(next => {
        const current = actor(user, next)
        if ((!positions.includes(position) && position !== 'Student') || position === 'President') throw new Error('The President position changes through an accepted handover.')
        if (!member?.id || member.id === current.id) throw new Error('Choose another member.')
        const target = effectiveUser(member, next)
        const scope = organizationScope(current)
        if (current.role === 'council' && target.course !== scope) throw new Error('Choose a member from your own council program.')
        if (target.role === 'admin' && current.role !== 'admin') throw new Error('Council managers cannot change ACES membership.')
        if (target.position === 'President') throw new Error('Use presidential handover for the current President.')
        if (current.position !== 'President' && (topPositions.includes(position) || topPositions.includes(target.position))) throw new Error('Only the President can appoint or change the Vice President and Secretary.')
        if (topPositions.includes(position) && Object.entries(next.members || {}).some(([key, value]) => key !== member.id && value.role === current.role && value.scope === scope && value.position === position)) throw new Error(`This organization already has a ${position}. Reassign that member first.`)
        if (position === 'Student' && (target.role !== current.role || organizationScope(target) !== scope)) throw new Error('Choose a current member of your organization to remove.')
        next.members[member.id] = position === 'Student' ? { role: 'student', position: '', scope: '', course: target.course } : { role: current.role, position, scope, course: target.course }
        next.organizationLog.unshift({ id: id(), actor: current.name, text: `${member.name} appointed ${position} · ${scope}`, at: clock().toISOString() })
        return { confirmed: true }
      })
    },
    nominatePresident(user, memberId) {
      return mutate(next => {
        const current = actor(user, next)
        const target = next.members[memberId]
        const scope = organizationScope(current)
        if (current.position !== 'President' || memberId === current.id || !target || target.role !== current.role || target.scope !== scope) throw new Error('Choose another current member of your organization. Only the President can nominate a successor.')
        if (next.handovers.some(h => h.scope === scope && h.role === current.role && h.status === 'pending')) throw new Error('A nomination is already awaiting acceptance. Cancel it before choosing another successor.')
        const nomination = { id: id(), from: current.id, to: memberId, scope, role: current.role, status: 'pending', at: clock().toISOString() }
        next.handovers.unshift(nomination)
        return nomination
      })
    },
    respondHandover(user, nominationId, action) {
      return mutate(next => {
        const current = effectiveUser(user, next)
        const nomination = next.handovers.find(h => h.id === nominationId && h.status === 'pending')
        if (!nomination) throw new Error('This nomination is no longer pending.')
        if (action === 'cancel' && nomination.from === current?.id) { nomination.status = 'cancelled'; return nomination }
        if (nomination.to !== current?.id || !['accept', 'decline'].includes(action)) throw new Error('Only the nominated successor can accept or decline.')
        const outgoing = next.members[nomination.from]
        const incoming = next.members[nomination.to]
        if (outgoing?.position !== 'President' || outgoing.role !== nomination.role || outgoing.scope !== nomination.scope || incoming?.role !== nomination.role || incoming.scope !== nomination.scope) throw new Error('Organization membership changed. Ask the President for a new nomination.')
        nomination.status = action === 'accept' ? 'accepted' : 'declined'
        nomination.respondedAt = clock().toISOString()
        if (action === 'accept') { outgoing.position = 'Member'; incoming.position = 'President' }
        next.organizationLog.unshift({ id: id(), actor: current.name, text: `Presidential nomination ${nomination.status} · ${nomination.scope}`, at: clock().toISOString() })
        return nomination
      })
    },
  }
}
