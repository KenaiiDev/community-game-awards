import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
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
      onWithdraw={fn()}
      onRetry={fn()}
    />
  );
}

const meta = {
  title: 'Landing/LandingPage',
  component: LandingPage,
  decorators: [(Story) => <div className="-m-6"><Story /></div>],
  args: {
    locale: 'en',
    edition,
    signup: signup({ kind: 'signed_out', edition }),
  },
} satisfies Meta<typeof LandingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The main menu and its screens, as announced to assistive tech. */
function menu(canvasElement: HTMLElement, label = 'Main menu') {
  const canvas = within(canvasElement);
  const tablist = canvas.getByRole('tablist', { name: label });
  return {
    tabs: within(tablist).getAllByRole('tab'),
    tab: (name: string) => within(tablist).getByRole('tab', { name }),
    screen: () => canvas.getByRole('tabpanel'),
  };
}

function reducedMotionCheck(element: Element) {
  // Content enters with motion, except for visitors who asked for reduced motion.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const name = getComputedStyle(element).animationName;
  return reduced ? expect(name).toBe('none') : expect(name).not.toBe('none');
}

export const SignupOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 1 });
    await expect(heading).toHaveTextContent('Game awards decided by players');
    await reducedMotionCheck(heading);
    // The background drifts slowly behind the app, also only without reduced motion.
    const ambient = canvas.getByTestId('ambient');
    await expect(ambient).toHaveAttribute('aria-hidden', 'true');
    for (const layer of ambient.children) await reducedMotionCheck(layer);

    // An app shell, not a long page: a HUD bar with the edition and the time left...
    const hud = within(canvas.getByRole('banner'));
    await expect(hud.getByText('Express 2026 · Judge signup open')).toBeInTheDocument();
    await expect(hud.getByText('19d 12h left')).toBeInTheDocument();

    // ...and a main menu whose first screen is the quest.
    const { tabs, tab, screen } = menu(canvasElement);
    await expect(['Quest', 'Quest log', 'Rules', 'Language'].map((name) => tabs.indexOf(tab(name)))).toEqual([0, 1, 2, 3]);
    await expect(tab('Quest')).toHaveAttribute('aria-selected', 'true');
    await expect(within(screen()).getByRole('heading', { name: 'Become a judge' })).toBeInTheDocument();
    await expect(screen()).toHaveAttribute('aria-labelledby', tab('Quest').id);
  },
};

export const SignupOpenMobile: Story = {};

export const QuestLog: Story = {
  play: async ({ canvasElement }) => {
    const { tab, screen } = menu(canvasElement);
    await userEvent.click(tab('Quest log'));
    await expect(tab('Quest log')).toHaveAttribute('aria-selected', 'true');
    await expect(tab('Quest')).toHaveAttribute('aria-selected', 'false');
    // The edition is a quest log: signup is the current stage, the rest are locked.
    const stages = within(within(screen()).getByRole('list', { name: 'Quest log' })).getAllByRole('listitem');
    await expect(stages).toHaveLength(6);
    await expect(stages[0]).toHaveAttribute('aria-current', 'step');
    await expect(within(stages[0]).getByText('You are here')).toBeInTheDocument();
    for (const stage of stages.slice(1)) await expect(within(stage).getByText('Locked')).toBeInTheDocument();
  },
};

export const RulesWithKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const { tab, screen } = menu(canvasElement);
    // Like a game menu: arrows move the selection, focus follows, and it wraps.
    tab('Quest').focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(tab('Rules')).toHaveAttribute('aria-selected', 'true');
    await expect(tab('Rules')).toHaveFocus();
    await expect(within(screen()).getByRole('heading', { name: 'Rules of the game' })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    await expect(tab('Language')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(tab('Quest')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{End}{ArrowUp}');
    await expect(tab('Rules')).toHaveAttribute('aria-selected', 'true');
    // Only the selected entry is in the tab order.
    await expect(tab('Rules')).toHaveAttribute('tabindex', '0');
    await expect(tab('Quest')).toHaveAttribute('tabindex', '-1');
  },
};

export const Language: Story = {
  play: async ({ canvasElement }) => {
    const { tab, screen } = menu(canvasElement);
    await userEvent.click(tab('Language'));
    const options = within(screen());
    await expect(options.getByRole('link', { name: 'Español' })).toHaveAttribute('href', '/es');
    await expect(options.getByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'true');
  },
};

export const SignupOpenSpanish: Story = {
  args: { locale: 'es' },
  parameters: { locale: 'es' },
  play: async ({ canvasElement }) => {
    const { tabs, tab, screen } = menu(canvasElement, 'Menú principal');
    await expect(
      ['Misión', 'Registro de misiones', 'Reglas', 'Idioma'].map((name) => tabs.indexOf(tab(name))),
    ).toEqual([0, 1, 2, 3]);
    await expect(within(canvasElement).getByText('Quedan 19 d 12 h')).toBeInTheDocument();
    await userEvent.click(tab('Idioma'));
    // "/en" (not "/") so the middleware updates the remembered locale cookie;
    // "/" would redirect a Spanish visitor straight back to "/es".
    await expect(within(screen()).getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en');
  },
};

export const SignupClosed: Story = {
  args: {
    edition: { ...edition, signupStatus: 'closed' },
    signup: signup({ kind: 'closed', edition: { ...edition, signupStatus: 'closed' } }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Nothing to count down to once signup is closed.
    await expect(canvas.queryByText(/left$/)).toBeNull();
    const { tab, screen } = menu(canvasElement);
    await userEvent.click(tab('Quest log'));
    // No stage is marked current once signup is closed.
    const stages = within(within(screen()).getByRole('list', { name: 'Quest log' })).getAllByRole('listitem');
    for (const stage of stages) await expect(stage).not.toHaveAttribute('aria-current');
  },
};

export const WithoutEdition: Story = {
  args: { edition: null, signup: signup({ kind: 'no_edition' }) },
};

export const SignedIn: Story = {
  args: {
    account: { user: { displayName: 'Kenaii', avatarUrl: null }, onSignOut: fn() },
    signup: signup({
      kind: 'ready',
      edition,
      user: { username: 'kenaii', displayName: 'Kenaii', avatarUrl: null },
      consent: false,
      submitting: false,
    }),
  },
  play: async ({ canvasElement, args }) => {
    const header = within(within(canvasElement).getByRole('banner'));
    await expect(header.getByText('Kenaii')).toBeInTheDocument();
    await userEvent.click(header.getByRole('button', { name: 'Sign out' }));
    await expect(args.account?.onSignOut).toHaveBeenCalledOnce();
  },
};

export const SignedInMobile: Story = { args: SignedIn.args };

export const SignedOutHasNoAccount: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Sign out' })).toBeNull();
  },
};
