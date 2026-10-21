import { HttpError } from '../http/errors.js';
import { portalPositions, portalPrograms } from '../data/portalDemoData.js';

const topPositions = new Set(['President', 'Vice President', 'Secretary']);
const clone = (value) => structuredClone(value);
const normalizeStudentId = (value) => String(value || '').trim().toUpperCase();
const organizationScope = (user) => (user?.role === 'admin' ? 'ACES' : user?.course);
const overlaps = (left, right) => left.roomId === right.roomId
  && left.date === right.date
  && left.start < right.end
  && right.start < left.end;

function requiredText(value, field, maxLength = 3000) {
  const result = String(value ?? '').trim();
  if (!result) throw new HttpError(422, 'REQUIRED_FIELD', `${field} is required`);
  if ([...result].length > maxLength) {
    throw new HttpError(422, 'FIELD_TOO_LONG', `${field} must not exceed ${maxLength} characters`);
  }
  return result;
}

function publicUser(account, membership = {}, profile = {}) {
  return {
    id: account.id,
    studentId: account.studentId,
    name: profile.displayName || account.name,
    role: membership.role || account.role,
    position: membership.position ?? account.position,
    course: account.course,
    email: profile.email || account.email,
    yearLevel: account.yearLevel,
    section: account.section,
    status: account.status,
    testAccount: account.testAccount === true,
  };
}

function capabilities(user) {
  if (!user) return {};
  const manager = ['admin', 'council'].includes(user.role);
  return {
    canBook: true,
    canRegister: true,
    canApply: user.role === 'student',
    canCreatePost: manager,
    canReviewApplications: manager,
    canManageRooms: user.role === 'admin',
    canManageMembers: manager && topPositions.has(user.position),
  };
}

export class PortalService {
  constructor(repository) {
    this.repository = repository;
  }

  userForAccount(account, state = this.repository.snapshot()) {
    if (!account) return null;
    return publicUser(account, state.members[account.id], state.profiles[account.id]);
  }

  requireUser(account) {
    if (!account) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue');
    const user = this.userForAccount(account);
    if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable');
    return user;
  }

  requireManager(account) {
    const user = this.requireUser(account);
    if (!['admin', 'council'].includes(user.role)) {
      throw new HttpError(403, 'MANAGER_REQUIRED', 'Council or Administrator access is required');
    }
    return user;
  }

  requireAdmin(account) {
    const user = this.requireUser(account);
    if (user.role !== 'admin') {
      throw new HttpError(403, 'ADMIN_REQUIRED', 'Administrator access is required');
    }
    return user;
  }

  session(account, token = null) {
    const user = this.userForAccount(account);
    return {
      user,
      capabilities: capabilities(user),
      ...(token ? { token } : {}),
      is_demo: true,
      dataset_label: 'Demo week',
    };
  }

  signIn(body) {
    const studentId = normalizeStudentId(body?.student_id ?? body?.studentId);
    const password = String(body?.password || '');
    if (!studentId || !password) {
      throw new HttpError(422, 'MISSING_CREDENTIALS', 'Student ID and password are required');
    }
    const account = this.repository.findAccountByStudentId(studentId);
    if (!account || account.password !== password) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect username or password');
    }
    const token = this.repository.createSession(account.id);
    return this.session(account, token);
  }

  register(body) {
    const studentId = normalizeStudentId(body?.student_id ?? body?.studentId);
    const name = requiredText(body?.name, 'name', 120);
    const email = String(body?.email || '').trim().toLowerCase();
    const course = String(body?.course || '').trim().toUpperCase();
    const yearLevel = String(body?.year_level ?? body?.yearLevel ?? '');
    const section = String(body?.section || '').trim().toUpperCase();
    const password = String(body?.password || '');
    const confirmation = String(body?.confirm_password ?? body?.confirmPassword ?? '');

    if (!/^\d{8}-[A-Z]$/.test(studentId)) {
      throw new HttpError(422, 'INVALID_STUDENT_ID', 'Use a student ID such as 20241200-C');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(422, 'INVALID_EMAIL', 'Enter a valid campus email address');
    }
    if (!portalPrograms.includes(course)) {
      throw new HttpError(422, 'INVALID_COURSE', 'Choose BSCS, BSIT, BSIS, or BSEMC');
    }
    if (!['1', '2', '3', '4'].includes(yearLevel) || !['A', 'B', 'C', 'D'].includes(section)) {
      throw new HttpError(422, 'INVALID_SECTION', 'Choose a year level from 1–4 and section from A–D');
    }
    if (password.length < 8) throw new HttpError(422, 'WEAK_PASSWORD', 'Use at least 8 characters');
    if (password !== confirmation) throw new HttpError(422, 'PASSWORD_MISMATCH', 'Passwords do not match');
    const state = this.repository.snapshot();
    if (state.accounts.some((account) => account.studentId === studentId)) {
      throw new HttpError(409, 'STUDENT_ID_EXISTS', 'An account with this student ID already exists');
    }
    if (state.accounts.some((account) => account.email.toLowerCase() === email)) {
      throw new HttpError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    }
    const account = {
      id: this.repository.nextId('USR'),
      studentId,
      password,
      name,
      role: 'student',
      position: '',
      course,
      yearLevel,
      section,
      email,
      status: 'active',
      testAccount: false,
      is_demo: true,
      dataset_label: 'Demo week',
    };
    this.repository.createAccount(account);
    return {
      confirmed: true,
      message: 'Your account is ready. Sign in with your student ID and password.',
    };
  }

  resetPassword(body) {
    const email = String(body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(422, 'INVALID_EMAIL', 'Enter a valid school email address');
    }
    return {
      confirmed: true,
      message: 'If that address belongs to an account, password reset instructions have been prepared.',
      is_demo: true,
      dataset_label: 'Demo week',
    };
  }

  requestVerification(account, body) {
    const user = this.requireUser(account);
    const email = String(body?.email || '').trim().toLowerCase();
    const purpose = body?.purpose;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(422, 'INVALID_EMAIL', 'Enter a valid school email address');
    }
    if (!['email-change', 'password-change'].includes(purpose)) {
      throw new HttpError(422, 'INVALID_VERIFICATION_PURPOSE', 'Choose a supported verification purpose');
    }
    const id = this.repository.createVerificationChallenge({ accountId: user.id, email, purpose });
    return { id, sent: true, demo_code: '123456', expires_in_seconds: 600 };
  }

  verifyEmail(account, body) {
    const user = this.requireUser(account);
    const email = String(body?.email || '').trim().toLowerCase();
    const purpose = body?.purpose;
    const receipt = this.repository.verifyChallenge({
      challengeId: body?.challengeId,
      accountId: user.id,
      email,
      purpose,
      code: String(body?.code || ''),
    });
    if (!receipt) throw new HttpError(422, 'INVALID_VERIFICATION_CODE', 'This code is invalid or expired');
    return { verified: true, receipt };
  }

  changePassword(account, body) {
    const user = this.requireUser(account);
    const currentPassword = String(body?.currentPassword || '');
    const newPassword = String(body?.newPassword || '');
    if (account.password !== currentPassword) {
      throw new HttpError(422, 'INCORRECT_PASSWORD', 'The current password is incorrect');
    }
    if (newPassword.length < 8 || newPassword === currentPassword) {
      throw new HttpError(422, 'WEAK_PASSWORD', 'Use a different password with at least 8 characters');
    }
    const verified = this.repository.consumeVerificationReceipt({
      receipt: body?.verificationReceipt,
      accountId: user.id,
      email: user.email.toLowerCase(),
      purpose: 'password-change',
    });
    if (!verified) throw new HttpError(422, 'VERIFICATION_REQUIRED', 'Verify your school email before changing the password');
    this.repository.updatePassword(user.id, newPassword);
    return { confirmed: true };
  }

  stateFor(account) {
    const state = this.repository.snapshot();
    const user = this.userForAccount(account, state);
    const manager = ['admin', 'council'].includes(user?.role);
    const sameCouncil = (candidate) => user?.role === 'council' && candidate.course === user.course;
    const canSeePerson = (candidate) => user?.role === 'admin'
      || sameCouncil(candidate)
      || candidate.id === user?.id;
    const visibleAccounts = user ? state.accounts.filter(canSeePerson) : [];
    const visibleAccountIds = new Set(visibleAccounts.map((candidate) => candidate.id));

    return {
      version: state.version,
      revision: state.revision,
      datasetLabel: 'Demo week',
      rooms: state.rooms,
      scheduleWindows: state.scheduleWindows,
      scheduleEntries: state.scheduleEntries,
      dateOptions: state.dateOptions,
      posts: state.posts.filter((post) => post.status === 'published'),
      bookings: user?.role === 'admin'
        ? state.bookings
        : state.bookings.filter((booking) => booking.requesterId === user?.id),
      applications: manager
        ? state.applications.filter((application) => user.role === 'admin' || application.program === user.course)
        : state.applications.filter((application) => application.userId === user?.id),
      registrations: manager
        ? state.registrations
        : state.registrations.filter((registration) => registration.userId === user?.id),
      profiles: user ? Object.fromEntries(Object.entries(state.profiles)
        .filter(([accountId]) => accountId === user.id)) : {},
      members: user ? Object.fromEntries(Object.entries(state.members)
        .filter(([accountId]) => visibleAccountIds.has(accountId))) : {},
      handovers: user ? state.handovers.filter((handover) => manager
        || handover.from === user.id || handover.to === user.id) : [],
      organizationLog: manager ? state.organizationLog.filter((entry) => user.role === 'admin'
        || entry.scope === user.course) : [],
      closures: state.closures,
      archive: user ? state.archive : [],
      directory: visibleAccounts.map((candidate) => this.userForAccount(candidate, state)),
      session: this.session(account),
    };
  }

  createBooking(account, body) {
    const user = this.requireUser(account);
    const roomId = String(body?.roomId ?? body?.room_id ?? '').replace(/^Room\s+/i, '');
    const date = String(body?.date || '');
    const start = Number(body?.start);
    const end = Number(body?.end);
    const purpose = requiredText(body?.purpose, 'purpose', 200);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(422, 'INVALID_DATE', 'date must use YYYY-MM-DD');
    }
    const state = this.repository.snapshot();
    if (!state.dateOptions.includes(date)) {
      throw new HttpError(422, 'DATE_OUT_OF_RANGE', 'Choose a date from the Demo week options');
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 1440 || start >= end) {
      throw new HttpError(422, 'INVALID_TIME_RANGE', 'start and end must be valid minute offsets');
    }
    if (!state.scheduleWindows.some((window) => start >= window.start && end <= window.end)) {
      throw new HttpError(422, 'TIME_OUT_OF_RANGE', 'Choose a time within 07:00-12:00 or 13:00-18:00');
    }
    return this.repository.mutate((next) => {
      const room = next.rooms.find((candidate) => candidate.id === roomId);
      if (!room) throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room not found');
      if (room.blocked || room.is_details_available === false) {
        throw new HttpError(422, 'ROOM_UNAVAILABLE', 'This room is unavailable');
      }
      const candidate = { roomId, date, start, end };
      if (next.bookings.some((booking) => ['pending', 'approved'].includes(booking.status)
        && overlaps(booking, candidate))) {
        throw new HttpError(409, 'CONFLICT', 'The selected room has already been requested for this time');
      }
      if (next.scheduleEntries.some((entry) => entry.roomId === roomId && entry.date === date
        && entry.state !== 'free_window' && start < entry.end && entry.start < end)) {
        throw new HttpError(409, 'CONFLICT', 'The selected room is occupied during this time');
      }
      if (next.closures.some((closure) => closure.roomId === roomId
        && closure.startDate <= date && date <= closure.endDate
        && start < closure.end && closure.start < end)) {
        throw new HttpError(409, 'CONFLICT', 'The room is closed during the selected time');
      }
      const booking = {
        id: this.repository.nextId('REQ'),
        roomId,
        requesterId: user.id,
        requesterName: user.name,
        studentId: user.studentId,
        date,
        start,
        end,
        purpose,
        status: user.role === 'admin' ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
        is_demo: true,
        dataset_label: 'Demo week',
      };
      next.bookings.unshift(booking);
      return booking;
    });
  }

  decideBooking(account, bookingId, body) {
    const user = this.requireAdmin(account);
    const status = body?.status;
    const reason = String(body?.reason || '').trim();
    if (!['approved', 'declined'].includes(status)) {
      throw new HttpError(422, 'INVALID_DECISION', 'status must be approved or declined');
    }
    if (status === 'declined') requiredText(reason, 'reason', 500);
    return this.repository.mutate((next) => {
      const booking = next.bookings.find((candidate) => candidate.id === bookingId);
      if (!booking) throw new HttpError(404, 'BOOKING_NOT_FOUND', 'Booking request not found');
      if (booking.status !== 'pending') {
        throw new HttpError(409, 'BOOKING_ALREADY_DECIDED', 'This request has already changed');
      }
      if (status === 'approved' && next.bookings.some((candidate) => candidate.id !== booking.id
        && candidate.status === 'approved' && overlaps(candidate, booking))) {
        throw new HttpError(409, 'CONFLICT', 'An approved reservation overlaps this request');
      }
      if (status === 'approved' && next.scheduleEntries.some((entry) => entry.roomId === booking.roomId
        && entry.date === booking.date && entry.state !== 'free_window'
        && booking.start < entry.end && entry.start < booking.end)) {
        throw new HttpError(409, 'CONFLICT', 'The selected room is occupied during this time');
      }
      Object.assign(booking, {
        status,
        reason,
        reviewedBy: user.name,
        reviewedAt: new Date().toISOString(),
      });
      return booking;
    });
  }

  createClosure(account, body) {
    this.requireAdmin(account);
    const roomId = String(body?.roomId ?? body?.room_id ?? '');
    const mode = body?.mode;
    const reason = requiredText(body?.reason, 'reason', 500);
    const date = String(body?.date || '');
    const start = mode === 'interval' ? Number(body?.start) : 0;
    const end = mode === 'interval' ? Number(body?.end) : 1440;
    if (!['interval', 'day', 'week', 'indefinite'].includes(mode)) {
      throw new HttpError(422, 'INVALID_CLOSURE_MODE', 'Choose interval, day, week, or indefinite');
    }
    return this.repository.mutate((next) => {
      const room = next.rooms.find((candidate) => candidate.id === roomId);
      if (!room) throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room not found');
      if (mode === 'indefinite') {
        room.blocked = { label: 'Closed for booking', reason };
        return room;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
        || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 1440 || start >= end) {
        throw new HttpError(422, 'INVALID_CLOSURE_RANGE', 'Provide a valid date and time range');
      }
      const endDate = mode === 'week'
        ? new Date(new Date(`${date}T00:00:00Z`).getTime() + 6 * 86400000).toISOString().slice(0, 10)
        : date;
      const closure = {
        id: this.repository.nextId('CLS'), roomId, startDate: date, endDate, start, end, reason, mode,
      };
      if (next.closures.some((candidate) => candidate.roomId === roomId
        && candidate.startDate <= endDate && date <= candidate.endDate
        && start < candidate.end && candidate.start < end)) {
        throw new HttpError(409, 'CONFLICT', 'This closure overlaps an existing closure');
      }
      next.closures.push(closure);
      return closure;
    });
  }

  reopenRoom(account, roomId) {
    this.requireAdmin(account);
    return this.repository.mutate((next) => {
      const room = next.rooms.find((candidate) => candidate.id === roomId);
      if (!room) throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room not found');
      room.blocked = null;
      next.closures = next.closures.filter((closure) => closure.roomId !== roomId);
      return room;
    });
  }

  publish(account, body) {
    const user = this.requireManager(account);
    const kind = body?.kind;
    if (!['announcement', 'event', 'council'].includes(kind)) {
      throw new HttpError(422, 'INVALID_POST_KIND', 'Choose announcement, event, or council');
    }
    const title = requiredText(body?.title, 'title', 120);
    const description = requiredText(body?.description, 'description');
    const venue = requiredText(body?.venue, 'venue', 120);
    const startsAt = String(body?.startsAt || '');
    const endsAt = String(body?.endsAt || '');
    if (!Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt))
      || Date.parse(startsAt) <= Date.now() || Date.parse(endsAt) <= Date.parse(startsAt)) {
      throw new HttpError(422, 'INVALID_EVENT_RANGE', 'Choose valid start and end times');
    }
    const capacity = kind === 'announcement' ? 0 : Number(body?.capacity);
    if (kind !== 'announcement' && (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000)) {
      throw new HttpError(422, 'INVALID_CAPACITY', 'Capacity must be between 1 and 10,000');
    }
    const registrationKind = body?.registrationKind;
    if (kind === 'event' && !['individual', 'team'].includes(registrationKind)) {
      throw new HttpError(422, 'INVALID_REGISTRATION_KIND', 'Choose individual or team registration');
    }
    const program = kind === 'council' ? String(body?.program || '').toUpperCase() : undefined;
    if (kind === 'council' && !portalPrograms.includes(program)) {
      throw new HttpError(422, 'INVALID_PROGRAM', 'Choose a supported council program');
    }
    const questions = kind === 'council'
      ? (body?.questions || []).map((question) => requiredText(question, 'question', 200))
      : [];
    if (kind === 'council' && (!questions.length || questions.length > 10)) {
      throw new HttpError(422, 'INVALID_QUESTIONS', 'Add between 1 and 10 questions');
    }
    return this.repository.mutate((next) => {
      const post = {
        ...clone(body),
        id: this.repository.nextId('POST'),
        kind,
        title,
        description,
        venue,
        startsAt,
        endsAt,
        capacity,
        program,
        questions,
        organizer: user.name,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        status: 'published',
        is_demo: true,
        dataset_label: 'Demo week',
      };
      next.posts.unshift(post);
      return post;
    });
  }

  submit(account, postId, body) {
    const user = this.requireUser(account);
    return this.repository.mutate((next) => {
      const post = next.posts.find((candidate) => candidate.id === postId && candidate.status === 'published');
      if (!post || !['event', 'council'].includes(post.kind)) {
        throw new HttpError(404, 'FORM_NOT_FOUND', 'This form is no longer available');
      }
      if (Date.parse(post.startsAt) <= Date.now()) {
        throw new HttpError(409, 'SUBMISSIONS_CLOSED', 'Registration for this item has closed');
      }
      const collection = post.kind === 'event' ? next.registrations : next.applications;
      if (collection.some((record) => record.postId === post.id && record.userId === user.id)) {
        throw new HttpError(409, 'ALREADY_SUBMITTED', 'You have already submitted this form');
      }
      if (post.kind === 'council' && (user.role !== 'student' || user.course !== post.program)) {
        throw new HttpError(403, 'PROGRAM_RESTRICTED', `This recruitment is open to ${post.program} students`);
      }
      if (collection.filter((record) => record.postId === post.id && record.status !== 'declined').length >= post.capacity) {
        throw new HttpError(409, 'CAPACITY_REACHED', 'All available slots have been filled');
      }
      const contact = requiredText(body?.contact, 'contact email', 200);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
        throw new HttpError(422, 'INVALID_EMAIL', 'Enter a valid contact email');
      }
      const details = { contact };
      if (post.kind === 'council') {
        details.answers = post.questions.map((question, index) => ({
          question,
          answer: requiredText(body?.answers?.[index], 'answer', 1500),
        }));
      } else if (post.registrationKind === 'team') {
        details.teamName = requiredText(body?.teamName, 'team name', 80);
        details.members = (body?.members || []).map((member) => ({
          name: requiredText(member?.name, 'player name', 120),
          studentId: normalizeStudentId(member?.studentId),
        }));
        if (details.members.length !== post.teamSize
          || details.members.some((member) => !/^\d{8}-[A-Z]$/.test(member.studentId))
          || new Set(details.members.map((member) => member.studentId)).size !== details.members.length
          || !details.members.some((member) => member.studentId === user.studentId)) {
          throw new HttpError(422, 'INVALID_TEAM', `Enter ${post.teamSize} unique players including yourself`);
        }
        if (next.registrations.some((registration) => registration.postId === post.id
          && (registration.details.teamName?.toLowerCase() === details.teamName.toLowerCase()
            || registration.details.members?.some((member) => details.members
              .some((player) => player.studentId === member.studentId))))) {
          throw new HttpError(409, 'TEAM_CONFLICT', 'A team name or player is already registered for this event');
        }
      } else if (post.categories?.length) {
        if (!post.categories.includes(body?.category)) {
          throw new HttpError(422, 'INVALID_CATEGORY', 'Choose a registration category');
        }
        details.category = body.category;
      }
      const result = {
        id: this.repository.nextId(post.kind === 'event' ? 'REG' : 'APP'),
        postId,
        title: post.title,
        kind: post.kind,
        userId: user.id,
        name: user.name,
        studentId: user.studentId,
        program: user.course,
        details,
        status: post.kind === 'event' ? 'registered' : 'pending',
        createdAt: new Date().toISOString(),
        is_demo: true,
        dataset_label: 'Demo week',
      };
      collection.unshift(result);
      return result;
    });
  }

  reviewApplication(account, applicationId, body) {
    const user = this.requireManager(account);
    const status = body?.status;
    const reason = String(body?.reason || '').trim();
    if (!['accepted', 'declined'].includes(status)) {
      throw new HttpError(422, 'INVALID_DECISION', 'status must be accepted or declined');
    }
    if (status === 'declined') requiredText(reason, 'reason', 500);
    return this.repository.mutate((next) => {
      const application = next.applications.find((candidate) => candidate.id === applicationId);
      if (!application) throw new HttpError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
      if (application.status !== 'pending') {
        throw new HttpError(409, 'APPLICATION_ALREADY_DECIDED', 'This application has already changed');
      }
      if (user.role === 'council' && application.program !== user.course) {
        throw new HttpError(403, 'PROGRAM_RESTRICTED', 'You may review only your council program');
      }
      Object.assign(application, {
        status,
        reason,
        reviewedBy: user.name,
        reviewedAt: new Date().toISOString(),
      });
      return application;
    });
  }

  saveProfile(account, accountId, body) {
    const user = this.requireUser(account);
    if (user.id !== accountId) throw new HttpError(403, 'PROFILE_FORBIDDEN', 'You may update only your profile');
    return this.repository.mutate((next) => {
      const previous = next.profiles[user.id] || {};
      if (body?.correction) {
        const correction = {
          id: this.repository.nextId('COR'),
          field: requiredText(body.correction.field, 'field', 80),
          value: requiredText(body.correction.value, 'value', 120),
          reason: requiredText(body.correction.reason, 'reason', 500),
          status: 'pending',
          at: new Date().toISOString(),
        };
        next.profiles[user.id] = {
          ...previous,
          version: (previous.version || 0) + 1,
          corrections: [...(previous.corrections || []), correction],
        };
      } else {
        const email = requiredText(body?.email, 'email', 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new HttpError(422, 'INVALID_EMAIL', 'Enter a valid school email address');
        }
        const displayName = requiredText(body?.displayName || user.name, 'display name', 120);
        const avatarUrl = String(body?.avatarUrl || '');
        if (email !== user.email.toLowerCase()) {
          const verified = this.repository.consumeVerificationReceipt({
            receipt: body?.emailVerificationReceipt,
            accountId: user.id,
            email,
            purpose: 'email-change',
          });
          if (!verified) throw new HttpError(422, 'VERIFICATION_REQUIRED', 'Verify the new school email before saving');
        }
        next.profiles[user.id] = {
          ...previous,
          version: (previous.version || 0) + 1,
          email,
          emailVerified: email === user.email.toLowerCase() ? previous.emailVerified === true : true,
          avatarUrl,
          displayName,
          updatedAt: new Date().toISOString(),
        };
      }
      return { confirmed: true, id: user.id };
    });
  }

  assertMemberManager(account) {
    const user = this.requireManager(account);
    if (!topPositions.has(user.position)) {
      throw new HttpError(403, 'MEMBER_MANAGER_REQUIRED', 'Only organization officers can manage members');
    }
    return user;
  }

  assignPosition(account, memberId, body) {
    const user = this.assertMemberManager(account);
    const position = body?.position;
    if ((!portalPositions.includes(position) && position !== 'Student') || position === 'President') {
      throw new HttpError(422, 'INVALID_POSITION', 'Choose a supported non-President position');
    }
    return this.repository.mutate((next) => {
      if (memberId === user.id) throw new HttpError(422, 'INVALID_MEMBER', 'Choose another member');
      const accountRecord = next.accounts.find((candidate) => candidate.id === memberId);
      const target = accountRecord ? publicUser(accountRecord, next.members[memberId], next.profiles[memberId]) : null;
      if (!target) throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found');
      const scope = organizationScope(user);
      if (user.role === 'council' && target.course !== scope) {
        throw new HttpError(403, 'PROGRAM_RESTRICTED', 'Choose a member from your council program');
      }
      if (user.position !== 'President' && (topPositions.has(position) || topPositions.has(target.position))) {
        throw new HttpError(403, 'PRESIDENT_REQUIRED', 'Only the President can change executive positions');
      }
      if (topPositions.has(position) && Object.entries(next.members).some(([id, member]) => id !== memberId
        && member.role === user.role && member.scope === scope && member.position === position)) {
        throw new HttpError(409, 'POSITION_OCCUPIED', `This organization already has a ${position}`);
      }
      next.members[memberId] = position === 'Student'
        ? { role: 'student', position: '', scope: '', course: target.course }
        : { role: user.role, position, scope, course: target.course };
      next.organizationLog.unshift({
        id: this.repository.nextId('LOG'),
        actor: user.name,
        text: `${target.name} appointed ${position} · ${scope}`,
        scope,
        at: new Date().toISOString(),
      });
      return { confirmed: true };
    });
  }

  nominatePresident(account, body) {
    const user = this.assertMemberManager(account);
    const memberId = body?.memberId;
    if (user.position !== 'President') {
      throw new HttpError(403, 'PRESIDENT_REQUIRED', 'Only the President can nominate a successor');
    }
    return this.repository.mutate((next) => {
      const target = next.members[memberId];
      const scope = organizationScope(user);
      if (!target || memberId === user.id || target.role !== user.role || target.scope !== scope) {
        throw new HttpError(422, 'INVALID_SUCCESSOR', 'Choose another current organization member');
      }
      if (next.handovers.some((handover) => handover.scope === scope
        && handover.role === user.role && handover.status === 'pending')) {
        throw new HttpError(409, 'HANDOVER_PENDING', 'A nomination is already awaiting acceptance');
      }
      const nomination = {
        id: this.repository.nextId('HND'),
        from: user.id,
        to: memberId,
        scope,
        role: user.role,
        status: 'pending',
        at: new Date().toISOString(),
      };
      next.handovers.unshift(nomination);
      return nomination;
    });
  }

  respondHandover(account, nominationId, body) {
    const user = this.requireUser(account);
    const action = body?.action;
    return this.repository.mutate((next) => {
      const nomination = next.handovers.find((candidate) => candidate.id === nominationId
        && candidate.status === 'pending');
      if (!nomination) throw new HttpError(404, 'HANDOVER_NOT_FOUND', 'This nomination is no longer pending');
      if (action === 'cancel' && nomination.from === user.id) {
        nomination.status = 'cancelled';
        return nomination;
      }
      if (nomination.to !== user.id || !['accept', 'decline'].includes(action)) {
        throw new HttpError(403, 'HANDOVER_FORBIDDEN', 'Only the nominated successor can respond');
      }
      const outgoing = next.members[nomination.from];
      const incoming = next.members[nomination.to];
      if (outgoing?.position !== 'President' || incoming?.role !== nomination.role
        || incoming.scope !== nomination.scope) {
        throw new HttpError(409, 'MEMBERSHIP_CHANGED', 'Organization membership changed');
      }
      nomination.status = action === 'accept' ? 'accepted' : 'declined';
      nomination.respondedAt = new Date().toISOString();
      if (action === 'accept') {
        outgoing.position = 'Member';
        incoming.position = 'President';
      }
      return nomination;
    });
  }
}
