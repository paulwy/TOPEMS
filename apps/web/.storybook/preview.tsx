import type { Preview } from '@storybook/react-vite';
import { CssVarsProvider } from '@mui/material/styles';
import { theme } from '../src/theme/storybook-theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <CssVarsProvider theme={theme}>
        <Story />
      </CssVarsProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
