import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  test('shows light icon and toggles to dark when clicking toggle', async () => {
    localStorage.setItem('app_theme', 'light');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByLabelText('Toggle theme');
    const select = screen.getByLabelText('Select theme') as HTMLSelectElement;

    expect(select.value).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    await userEvent.click(button);

    expect(select.value).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('system theme follows prefers-color-scheme', () => {
    (window as any).matchMedia = (q: string) => ({
      matches: true,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });

    localStorage.setItem('app_theme', 'system');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const select = screen.getByLabelText('Select theme') as HTMLSelectElement;
    expect(select.value).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('select change updates theme', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const select = screen.getByLabelText('Select theme') as HTMLSelectElement;
    await userEvent.selectOptions(select, 'dark');
    expect(select.value).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
