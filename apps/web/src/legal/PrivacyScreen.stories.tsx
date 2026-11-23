import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { PrivacyScreen } from './PrivacyScreen';

const meta = {
  title: 'Legal/PrivacyScreen',
  component: PrivacyScreen,
  decorators: [(Story) => <div className="-m-6"><Story /></div>],
  args: { locale: 'en' },
} satisfies Meta<typeof PrivacyScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy policy');
    // Every question a visitor may have gets its own section.
    for (const name of [
      'Who we are',
      'What we collect',
      'What becomes public',
      'Why we use it',
      'Who processes it',
      'How long we keep it',
      'Your choices',
      'Changes to this policy',
    ]) {
      await expect(canvas.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    for (const link of canvas.getAllByRole('link', { name: 'lucasvillanueva.dev@gmail.com' })) {
      await expect(link).toHaveAttribute('href', 'mailto:lucasvillanueva.dev@gmail.com');
    }
    await expect(canvas.getByRole('link', { name: 'Back to the main menu' })).toHaveAttribute('href', '/');
  },
};

export const EnglishMobile: Story = {};

export const Spanish: Story = {
  args: { locale: 'es' },
  parameters: { locale: 'es' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Política de privacidad');
    await expect(canvas.getByRole('heading', { level: 2, name: 'Qué guardamos' })).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: 'Volver al menú principal' })).toHaveAttribute('href', '/es');
  },
};
