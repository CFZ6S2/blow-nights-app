import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ── Mock next/navigation ──
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/madrid',
  useSearchParams: () => new URLSearchParams(),
}));

// ── Mock next/link ──
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ── Mock react-i18next ──
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: {
      language: 'es',
      changeLanguage: vi.fn(),
    },
  }),
  Trans: ({ children }: any) => children,
}));

// ── Mock framer-motion ──
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'div' || prop === 'span' || prop === 'button' || prop === 'nav' || prop === 'a' || prop === 'p') {
        return ({ children, ...props }: any) => {
          const { initial, animate, exit, whileTap, layoutId, transition, variants, ...htmlProps } = props;
          const Tag = prop as string;
          return <Tag {...htmlProps}>{children}</Tag>;
        };
      }
      return undefined;
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

// ── Mock firebase ──
vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
  messaging: null,
  default: {},
}));

// ── Suppress console.error noise in tests ──
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Not implemented: navigation')) return;
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
