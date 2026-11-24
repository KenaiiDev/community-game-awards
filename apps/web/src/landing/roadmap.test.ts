import { describe, expect, it } from 'vitest';
import type { Edition } from '@/judge-signup/api/types';
import { roadmap } from './roadmap';

const edition = (signupStatus: Edition['signupStatus']): Edition => ({
  slug: 'express-2026',
  name: 'Express 2026',
  signupOpensAt: '2026-11-22T00:00:00.000Z',
  signupClosesAt: '2026-12-15T00:00:00.000Z',
  signupStatus,
});

const at = (iso: string) => new Date(iso);
const statuses = (stages: ReturnType<typeof roadmap>) =>
  Object.fromEntries(stages.map((s) => [s.stage, s.status]));

describe('roadmap (Express 2026)', () => {
  it('publishes every phase in order with its UTC dates; signup dates come from the edition', () => {
    expect(roadmap(edition('open'), at('2026-11-25T12:00:00Z')).map(({ stage, from, to }) => ({ stage, from, to }))).toEqual([
      { stage: 'signup', from: '2026-11-22', to: '2026-12-14' },
      { stage: 'draw', from: '2026-12-16', to: '2026-12-16' },
      { stage: 'confirm', from: '2026-12-16', to: '2026-12-29' },
      { stage: 'play', from: '2026-12-30', to: '2027-01-10' },
      { stage: 'nominate', from: '2027-01-11', to: '2027-01-17' },
      { stage: 'reports', from: '2027-01-18', to: '2027-01-24' },
      { stage: 'vote', from: '2027-01-25', to: '2027-02-07' },
      { stage: 'reveal', from: '2027-02-13', to: '2027-02-13' },
    ]);
  });

  it('gives the public vote exactly two weeks', () => {
    const vote = roadmap(edition('open'), at('2026-11-25T12:00:00Z')).find((s) => s.stage === 'vote')!;
    const days = (Date.parse(`${vote.to}T00:00:00Z`) - Date.parse(`${vote.from}T00:00:00Z`)) / 86_400_000 + 1;
    expect(days).toBe(14);
  });

  it('marks signup current while it is open and every later phase upcoming', () => {
    expect(statuses(roadmap(edition('open'), at('2026-11-25T12:00:00Z')))).toEqual({
      signup: 'current',
      draw: 'upcoming',
      confirm: 'upcoming',
      play: 'upcoming',
      nominate: 'upcoming',
      reports: 'upcoming',
      vote: 'upcoming',
      reveal: 'upcoming',
    });
  });

  it('marks nothing current between the signup close and the draw', () => {
    const stages = roadmap(edition('closed'), at('2026-12-15T10:00:00Z'));
    expect(stages[0].status).toBe('done');
    expect(stages.filter((s) => s.status === 'current')).toEqual([]);
  });

  it('shows the draw on its day even though confirmation opens the same day', () => {
    const s = statuses(roadmap(edition('closed'), at('2026-12-16T18:00:00Z')));
    expect([s.draw, s.confirm, s.play]).toEqual(['current', 'upcoming', 'upcoming']);
  });

  it('moves to confirmation after the draw day', () => {
    const s = statuses(roadmap(edition('closed'), at('2026-12-20T00:00:00Z')));
    expect([s.draw, s.confirm, s.play]).toEqual(['done', 'current', 'upcoming']);
  });

  it('marks the public vote current during its two weeks, with earlier phases done', () => {
    const s = statuses(roadmap(edition('closed'), at('2027-02-07T23:59:00Z')));
    expect(s).toEqual({
      signup: 'done',
      draw: 'done',
      confirm: 'done',
      play: 'done',
      nominate: 'done',
      reports: 'done',
      vote: 'current',
      reveal: 'upcoming',
    });
  });

  it('marks every phase done after the reveal', () => {
    expect(roadmap(edition('closed'), at('2027-02-14T00:00:00Z')).every((s) => s.status === 'done')).toBe(true);
  });

  it('keeps signup upcoming before it opens and undated without an edition', () => {
    expect(roadmap(edition('not_open'), at('2026-11-20T00:00:00Z'))[0].status).toBe('upcoming');
    expect(roadmap(null, at('2026-11-25T12:00:00Z'))[0]).toEqual({ stage: 'signup', from: null, to: null, status: 'upcoming' });
  });
});
