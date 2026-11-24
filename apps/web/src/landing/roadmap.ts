import type { Edition } from '@/judge-signup/api/types';

/** Every phase of an edition, in order. */
export const STAGES = ['signup', 'draw', 'confirm', 'play', 'nominate', 'reports', 'vote', 'reveal'] as const;
export type Stage = (typeof STAGES)[number];
export type StageStatus = 'done' | 'current' | 'upcoming';

export interface RoadmapStage {
  stage: Stage;
  /** First and last day of the phase (inclusive, UTC, YYYY-MM-DD); null when unknown. */
  from: string | null;
  to: string | null;
  status: StageStatus;
}

type Window = { from: string; to: string };

/**
 * The published plan for Express 2026, as inclusive UTC days. Signup is not here:
 * its window comes from the edition the API serves, so it cannot drift from the
 * dates that actually open and close applications.
 */
const EXPRESS_2026: Record<Exclude<Stage, 'signup'>, Window> = {
  draw: { from: '2026-12-16', to: '2026-12-16' },
  // Drawn judges confirm first; seats left open go to substitutes drawn at random.
  confirm: { from: '2026-12-16', to: '2026-12-29' },
  play: { from: '2026-12-30', to: '2027-01-10' },
  nominate: { from: '2027-01-11', to: '2027-01-17' },
  // Nominees are published and anyone can report a misplaced one for the jury to resolve.
  reports: { from: '2027-01-18', to: '2027-01-24' },
  vote: { from: '2027-01-25', to: '2027-02-07' },
  reveal: { from: '2027-02-13', to: '2027-02-13' },
};

const day = (date: Date) => date.toISOString().slice(0, 10);

function signupStage(edition: Edition | null): RoadmapStage {
  if (!edition) return { stage: 'signup', from: null, to: null, status: 'upcoming' };
  const status: StageStatus =
    edition.signupStatus === 'open' ? 'current' : edition.signupStatus === 'closed' ? 'done' : 'upcoming';
  return {
    stage: 'signup',
    from: day(new Date(edition.signupOpensAt)),
    // The close is an exclusive instant (midnight UTC), so the last day is the one before.
    to: day(new Date(new Date(edition.signupClosesAt).getTime() - 1)),
    status,
  };
}

/**
 * The roadmap as of `now`: each phase is done once its last day has passed and
 * upcoming until its first day. At most one phase is current; when two share a
 * day (the draw opens confirmation), the earlier one is.
 */
export function roadmap(edition: Edition | null, now: Date): RoadmapStage[] {
  const today = day(now);
  const stages: RoadmapStage[] = [signupStage(edition)];
  let current = stages[0].status === 'current';
  for (const [stage, { from, to }] of Object.entries(EXPRESS_2026) as [Exclude<Stage, 'signup'>, Window][]) {
    let status: StageStatus = to < today ? 'done' : 'upcoming';
    if (!current && from <= today && today <= to) {
      status = 'current';
      current = true;
    }
    stages.push({ stage, from, to, status });
  }
  return stages;
}
