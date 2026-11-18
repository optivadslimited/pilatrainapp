import {
  canPlaySession,
  canWatchClass,
  freeSessionId,
  type AccessPlan,
} from '@shared/billing/access';

const plan = (overrides: Partial<AccessPlan> = {}): AccessPlan => ({
  block: 1,
  sessions: [
    { id: 's2', date: '2026-12-04', classIds: ['c3'], status: 'planned' },
    { id: 's1', date: '2026-12-02', classIds: ['c1', 'c2'], status: 'planned' },
    { id: 's3', date: '2026-12-06', classIds: ['c4'], status: 'planned' },
  ],
  ...overrides,
});
const cls = (id: string, isFree = false) => ({ id, isFree });

describe('the free class', () => {
  it('is the earliest session of her first plan', () => {
    expect(freeSessionId(plan())).toBe('s1');
  });

  it('follows the session if she moves it', () => {
    const moved = plan();
    const sessions = moved.sessions.map((session) =>
      session.id === 's1' ? { ...session, date: '2026-12-05', status: 'moved' } : session,
    );
    expect(freeSessionId({ ...moved, sessions })).toBe('s2');
  });

  it('is used up once she has finished a session', () => {
    const sessions = plan().sessions.map((session) =>
      session.id === 's1' ? { ...session, status: 'done' } : session,
    );
    expect(freeSessionId({ block: 1, sessions })).toBeNull();
  });

  it('is not offered again in a later plan, or without a plan', () => {
    expect(freeSessionId(plan({ block: 2 }))).toBeNull();
    expect(freeSessionId(null)).toBeNull();
    expect(freeSessionId(plan({ sessions: [] }))).toBeNull();
  });

  it('ignores a session the plan has dropped', () => {
    const sessions = plan().sessions.map((session) =>
      session.id === 's1' ? { ...session, status: 'dropped' } : session,
    );
    expect(freeSessionId({ block: 1, sessions })).toBe('s2');
  });
});

describe('who may play a session', () => {
  it('lets a member play any of them', () => {
    expect(canPlaySession(true, plan(), 's3')).toBe(true);
    expect(canPlaySession(true, null, 'anything')).toBe(true);
  });

  it('lets anyone else play only the free one', () => {
    expect(canPlaySession(false, plan(), 's1')).toBe(true);
    expect(canPlaySession(false, plan(), 's2')).toBe(false);
    expect(canPlaySession(false, null, 's1')).toBe(false);
  });
});

describe('who may watch a class', () => {
  it('lets a member watch everything', () => {
    expect(canWatchClass(true, cls('c4'), plan())).toBe(true);
    expect(canWatchClass(true, cls('c9'), null)).toBe(true);
  });

  it('lets anyone watch a class marked free', () => {
    expect(canWatchClass(false, cls('c9', true), null)).toBe(true);
  });

  it('lets a non-member watch both classes of her free session, and nothing else', () => {
    expect(canWatchClass(false, cls('c1'), plan())).toBe(true);
    expect(canWatchClass(false, cls('c2'), plan())).toBe(true);
    expect(canWatchClass(false, cls('c3'), plan())).toBe(false);
    expect(canWatchClass(false, cls('c1'), null)).toBe(false);
  });

  it('locks them again once the free session is done', () => {
    const sessions = plan().sessions.map((session) =>
      session.id === 's1' ? { ...session, status: 'done' } : session,
    );
    expect(canWatchClass(false, cls('c1'), { block: 1, sessions })).toBe(false);
  });
});
