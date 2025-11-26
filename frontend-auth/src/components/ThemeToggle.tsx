// jsx runtime handles React import; avoid unused import lint errors
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme, toggle } = useTheme();

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition"
      >
        {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      {/* small selector to choose explicit mode */}
      <select
        value={theme}
        onChange={e => setTheme(e.target.value as any)}
        className="text-sm border rounded px-2 py-1 bg-white dark:bg-slate-800"
        aria-label="Select theme"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
