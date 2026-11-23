import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { JudgeSignupCard } from './JudgeSignupCard';
import type { Edition } from '../api/types';

const edition: Edition = {
  slug: 'express-2026',
  name: 'Express 2026',
  signupOpensAt: '2026-11-20T00:00:00.000Z',
  signupClosesAt: '2026-12-15T00:00:00.000Z',
  signupStatus: 'open',
};
const user = {
  username: 'kenaii',
  displayName: 'Kenaii',
  avatarUrl: null,
};
const ready = { kind: 'ready', edition, user, consent: false, submitting: false } as const;

const meta = {
  title: 'Judge signup/JudgeSignupCard',
  component: JudgeSignupCard,
  args: {
    signInUrl: '/api/auth/discord',
    onConsentChange: fn(),
    onSubmit: fn(),
    onSignOut: fn(),
    onRetry: fn(),
  },
  decorators: [(Story) => <div className="mx-auto max-w-lg"><Story /></div>],
} satisfies Meta<typeof JudgeSignupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: { view: { kind: 'loading' } } };

export const LoadError: Story = {
  args: { view: { kind: 'load_error' } },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Try again' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const NoEdition: Story = { args: { view: { kind: 'no_edition' } } };

export const NotOpen: Story = {
  args: { view: { kind: 'not_open', edition: { ...edition, signupStatus: 'not_open' } } },
};

export const Closed: Story = {
  args: { view: { kind: 'closed', edition: { ...edition, signupStatus: 'closed' } } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('link', { name: 'Sign in with Discord' })).toBeNull();
  },
};

export const SignedOut: Story = {
  args: { view: { kind: 'signed_out', edition } },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Sign in with Discord' });
    await expect(link).toHaveAttribute('href', '/api/auth/discord');
  },
};

export const SignedOutAfterExpiredState: Story = {
  args: { view: { kind: 'signed_out', edition, authError: 'state' } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('Your sign-in session expired');
  },
};

export const Ready: Story = {
  args: { view: ready },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Apply as a judge' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('checkbox'));
    await expect(args.onConsentChange).toHaveBeenCalledWith(true);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }));
    await expect(args.onSignOut).toHaveBeenCalledOnce();
  },
};

export const ReadyWithConsent: Story = {
  args: { view: { ...ready, consent: true } },
  play: async ({ canvasElement, args }) => {
    const submit = within(canvasElement).getByRole('button', { name: 'Apply as a judge' });
    await expect(submit).toBeEnabled();
    await userEvent.click(submit);
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
};

export const Submitting: Story = {
  args: { view: { ...ready, consent: true, submitting: true } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Sending application…' })).toBeDisabled();
  },
};

export const SubmitError: Story = {
  args: { view: { ...ready, consent: true, error: 'signup_closed' } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
      'Signup closed before your application was sent.',
    );
  },
};

export const Applied: Story = {
  args: {
    view: {
      kind: 'applied',
      edition,
      user,
      application: { editionSlug: edition.slug, consentedAt: '2026-11-25T12:00:00.000Z', consentVersion: 'v1' },
    },
  },
  play: async ({ canvasElement, args }) => {
    // An applied judge can still sign out.
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Sign out' }));
    await expect(args.onSignOut).toHaveBeenCalledOnce();
    // Applying is celebrated with a burst of confetti. It is decorative only, and
    // with reduced motion it never shows up (tests always run with reduced motion).
    const celebration = within(canvasElement).getByTestId('celebration');
    await expect(celebration).toHaveAttribute('aria-hidden', 'true');
    await expect(celebration.children.length).toBeGreaterThan(0);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await expect(celebration).not.toBeVisible();
    }
  },
};

export const ReadySpanish: Story = {
  args: { view: ready },
  parameters: { locale: 'es' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Postularme como juez' })).toBeDisabled();
  },
};

export const AppliedSpanish: Story = { args: Applied.args, parameters: { locale: 'es' } };
