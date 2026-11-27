// Servicio de gestión de modo oscuro y claro de PrepIA

export type Theme = 'light' | 'dark';

export function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('prepia_theme') as Theme;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
}

export function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('prepia_theme', theme);
  const root = document.documentElement;
  const body = document.body;

  if (theme === 'dark') {
    root.classList.add('dark');
    if (body) body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
  }

  window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
}

export function toggleTheme(): Theme {
  const isDark = document.documentElement.classList.contains('dark');
  const nextTheme: Theme = isDark ? 'light' : 'dark';
  applyTheme(nextTheme);
  return nextTheme;
}
