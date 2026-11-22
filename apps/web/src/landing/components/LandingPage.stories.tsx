import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';
import { LandingPage } from './LandingPage';
import { JudgeSignupCard } from '@/judge-signup/components/JudgeSignupCard';
import type { Edition } from '@/judge-signup/api/types';
import type { SignupView } from '@/judge-signup/state/judge-signup.store';

const edition: Edition = {
  slug: 'express-2026',
  name: 'Express 2026',
  signupOpensAt: '2026-11-20T00:00:00.000Z',
  signupClosesAt: '2026-12-15T00:00:00.000Z',
  signupStatus: 'open',
};

function signup(view: SignupView) {
  return (
    <JudgeSignupCard
      view={view}
      signInUrl="/api/auth/discord"
      onConsentChange={fn()}
      onSubmit={fn()}
      onSignOut={fn()}
      onRetry={fn()}
    />
  );
}

const meta = {
  title: 'Landing/LandingPage',
  component: LandingPage,
  parameters: { padded: false },
  decorators: [(Story) => <div className="-m-6"><Story /></div>],
  args: {
    locale: 'en',
    edition,
    signup: signup({ kind: 'signed_out', edition }),
  },
} satisfies Meta<typeof LandingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignupOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Game awards decided by players');
    await expect(canvas.getByRole('link', { name: 'Apply as a judge' })).toHaveAttribute('href', '#judge-signup');
    await expect(canvas.getByRole('link', { name: 'Español' })).toHaveAttribute('href', '/es');
    await expect(canvas.getByText('Signup closes December 15, 2026 at 12:00 AM UTC')).toBeInTheDocument();
  },
};

export const SignupOpenMobile: Story = {};

export const SignupOpenSpanish: Story = {
  args: { locale: 'es' },
  parameters: { locale: 'es' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'Postularme como juez' })).toBeInTheDocument();
    // "/en" (not "/") so the middleware updates the remembered locale cookie;
    // "/" would redirect a Spanish visitor straight back to "/es".
    await expect(canvas.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en');
  },
};

export const SignupClosed: Story = {
  args: {
    edition: { ...edition, signupStatus: 'closed' },
    signup: signup({ kind: 'closed', edition: { ...edition, signupStatus: 'closed' } }),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('link', { name: 'Apply as a judge' })).toBeNull();
  },
};

export const WithoutEdition: Story = {
  args: { edition: null, signup: signup({ kind: 'no_edition' }) },
};
