import { HttpError } from '../http/errors.js';

function eventResponse(event, venue) {
  return {
    event_id: event.event_id,
    title: event.title,
    description: event.description,
    category: event.category,
    venue_id: event.venue_id,
    venue_name: venue?.name || null,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    status: event.status,
    registered: event.registered,
    capacity: event.capacity,
    banner_url: event.banner_url,
    version: event.version,
  };
}

function memberResponse(member) {
  return {
    member_id: member.member_id,
    student_id: member.student_id,
    full_name: member.full_name,
    program_section: member.program_section,
    status: member.status,
    role: member.role,
    council_role_id: member.council_role_id,
    disabled: member.disabled,
    version: member.version,
  };
}

export class AdminPortalService {
  constructor(repository, settings) {
    this.repository = repository;
    this.settings = settings;
  }

  assertConnected() {
    if (this.settings.admin.connectionState === 'not_connected') {
      return false;
    }
    return true;
  }

  listEvents() {
    if (!this.assertConnected()) return { data: [], meta: { connection_state: 'not_connected' } };
    const data = this.repository.listEvents()
      .toSorted((left, right) => left.starts_at.localeCompare(right.starts_at))
      .map((event) => eventResponse(event, this.repository.findVenueByRoomCode(event.venue_id)));
    return { data, meta: { connection_state: 'connected', total_count: data.length } };
  }

  assertVenue(venueId) {
    const venue = this.repository.findVenueByRoomCode(venueId);
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist');
    if (venue.status_override || !venue.is_details_available) {
      throw new HttpError(422, 'VENUE_UNAVAILABLE', 'Venue is unavailable for events');
    }
    return venue;
  }

  assertNoEventConflict({ venueId, startsAt, endsAt }, excludedId = null) {
    const start = Date.parse(startsAt);
    const end = Date.parse(endsAt);
    const conflict = this.repository.listEvents().some((event) => event.event_id !== excludedId
      && event.venue_id === venueId && event.status !== 'completed'
      && start < Date.parse(event.ends_at) && end > Date.parse(event.starts_at));
    if (conflict) throw new HttpError(409, 'EVENT_VENUE_CONFLICT', 'Another event already uses this venue during the requested time');
  }

  createEvent(input, session) {
    const venue = this.assertVenue(input.venueId);
    const record = {
      title: input.title,
      description: input.description,
      category: 'Campus Event',
      venue_id: venue.room_code,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
    };
    this.assertNoEventConflict(input);
    return { data: eventResponse(this.repository.createEvent(record, session.full_name), venue) };
  }

  updateEvent(eventId, input) {
    const existing = this.repository.findEvent(eventId);
    if (!existing) throw new HttpError(404, 'EVENT_NOT_FOUND', 'Event does not exist');
    if (existing.status === 'completed') throw new HttpError(409, 'EVENT_COMPLETED', 'Completed events cannot be edited');
    const venue = this.assertVenue(input.venueId);
    this.assertNoEventConflict(input, eventId);
    const result = this.repository.updateEvent(eventId, input.version, {
      title: input.title,
      description: input.description,
      venue_id: venue.room_code,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
    });
    if (result.result === 'version_conflict') throw new HttpError(409, 'VERSION_CONFLICT', 'Event changed; refresh and try again');
    return { data: eventResponse(result.event, venue) };
  }

  completeEvent(eventId, input) {
    if (!this.repository.findEvent(eventId)) throw new HttpError(404, 'EVENT_NOT_FOUND', 'Event does not exist');
    const result = this.repository.completeEvent(eventId, input.version);
    if (result.result === 'version_conflict') throw new HttpError(409, 'VERSION_CONFLICT', 'Event changed; refresh and try again');
    if (result.result === 'already_completed') throw new HttpError(409, 'EVENT_COMPLETED', 'Event is already completed');
    return { data: eventResponse(result.event, this.repository.findVenueByRoomCode(result.event.venue_id)) };
  }

  listMembers() {
    if (!this.assertConnected()) return { data: [], meta: { connection_state: 'not_connected' } };
    const data = this.repository.listMembers().map(memberResponse);
    return { data, meta: { connection_state: 'connected', total_count: data.length } };
  }

  listRoles() {
    if (!this.assertConnected()) return { data: [], meta: { connection_state: 'not_connected' } };
    const data = this.repository.listCouncilRoles().map((role) => ({
      role_id: role.role_id,
      name: role.name,
      scope: role.scope,
    }));
    return { data, meta: { connection_state: 'connected', total_count: data.length } };
  }

  setCouncilRole(memberId, input) {
    const member = this.repository.findMember(memberId);
    if (!member) throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member does not exist');
    if (member.disabled || !['active', 'approved'].includes(member.status) || member.role === 'admin') {
      throw new HttpError(422, 'MEMBER_NOT_ELIGIBLE', 'Member is not eligible for a council role');
    }
    if (input.councilRoleId && !this.repository.findCouncilRole(input.councilRoleId)) {
      throw new HttpError(404, 'COUNCIL_ROLE_NOT_FOUND', 'Council role does not exist');
    }
    const result = this.repository.setCouncilRole(memberId, input.version, input.councilRoleId);
    if (result.result === 'version_conflict') throw new HttpError(409, 'VERSION_CONFLICT', 'Member changed; refresh and try again');
    return { data: memberResponse(result.member) };
  }
}
