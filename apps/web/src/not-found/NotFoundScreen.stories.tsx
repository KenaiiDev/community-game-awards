import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { NotFoundScreen } from './NotFoundScreen';

const meta = {
  title: 'Errors/NotFoundScreen',
  component: NotFoundScreen,
  decorators: [(Story) => <div className="-m-6"><Story /></div>],
  args: { locale: 'en' },
} satisfies Meta<typeof NotFoundScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent("This level doesn't exist");
    await expect(canvas.getByText('Error 404')).toBeInTheDocument();
    // English lives at "/", so the way back is the root.
    await expect(canvas.getByRole('link', { name: 'Back to the main menu' })).toHaveAttribute('href', '/');
  },
};

export const EnglishMobile: Story = {};

export const Spanish: Story = {
  args: { locale: 'es' },
  parameters: { locale: 'es' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Este nivel no existe');
    await expect(canvas.getByRole('link', { name: 'Volver al menú principal' })).toHaveAttribute('href', '/es');
  },
};
