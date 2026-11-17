'use client';

import { ArrowDown, CornerDownRight, List } from 'lucide-react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { MouseEvent } from 'react';
import styles from './TocFromHeadings.module.css';

type TocLevel = 2 | 3;
type Item = { id: string; text: string; level: TocLevel };

type StructuredItem = Item & { children: Item[] };

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function readStickyOffset(): number {
  if (typeof window === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--sticky-offset');
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

function normalizeLevels(levels: TocLevel[]): TocLevel[] {
  const uniq: TocLevel[] = [];
  for (const level of levels) {
    if ((level === 2 || level === 3) && !uniq.includes(level)) uniq.push(level);
  }
  return uniq.length ? uniq.sort((a, b) => a - b) : [2];
}

function buildStructure(list: Item[]): StructuredItem[] {
  const roots: StructuredItem[] = [];
  let current: StructuredItem | null = null;

  for (const entry of list) {
    if (entry.level === 2) {
      const node: StructuredItem = { ...entry, children: [] };
      roots.push(node);
      current = node;
      continue;
    }

    if (entry.level === 3) {
      if (current) {
        current.children.push(entry);
      } else {
        roots.push({ ...entry, children: [] });
      }
    }
  }

  return roots;
}

function createHeadingsStore(root: string, levelSelector: string) {
    let snapshot: Item[] = [];
    const empty: Item[] = [];
    const scan = (): Item[] => {
    const container = document.querySelector(root);
    if (!container) {
      return [];
    }

    const headingNodes = levelSelector
      ? (Array.from(container.querySelectorAll(levelSelector)) as HTMLElement[])
      : [];

    if (!headingNodes.length) {
      return [];
    }

    const ids = new Set<string>();

    type Scanned = Item & {
      el: HTMLElement;
      excludedByContainer: boolean; // inside [data-toc-exclude] or .toc-exclude
      excludedByName: boolean; // literal heading text to skip
    };

    const scanned = headingNodes
      .map((heading): Scanned | null => {
        const text = (heading.textContent || '').trim();
        const rawLevel = Number(heading.tagName.slice(1)) as TocLevel;

        // Ensure a stable id
        let id = heading.id;
        if (!id) {
          const base = slugify(text);
          let candidate = base || 'section';
          let i = 2;
          while (ids.has(candidate) || document.getElementById(candidate)) {
            candidate = `${base}-${i++}`;
          }
          heading.id = candidate;
          id = candidate;
        }
        ids.add(id);

        const excludedByContainer = !!heading.closest('[data-toc-exclude], .toc-exclude');
        const excludedByName = /^you\s+may\s+also\s+like$/i.test(text);

        return { id, text, level: rawLevel, el: heading, excludedByContainer, excludedByName };
      })
      .filter(Boolean) as Scanned[];

    const found: Item[] = [];
    for (const it of scanned) {
      if (it.excludedByContainer || it.excludedByName) continue;
      found.push({ id: it.id, text: it.text, level: it.level });
    }

      return found;
    };
    return {
      getSnapshot: () => snapshot,
      getServerSnapshot: () => empty,
      subscribe: (notify: () => void) => {
        const update = () => {
          const found = scan();
          if (JSON.stringify(found) !== JSON.stringify(snapshot)) {
            snapshot = found;
            notify();
          }
        };
        update();
        const observer = new MutationObserver(update);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
      },
    };
}


const subscribeHash = (notify: () => void) => {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
};
const readHash = () => window.location.hash.slice(1);
const emptyHash = () => '';

export default function TocFromHeadings({
  root = '#article-root',
  className = 'text-sm',
  /** px to offset scroll for sticky headers; defaults to the global --sticky-offset */
  offset,
  levels = [2],
  title = 'ON THIS PAGE',
  mobile = false,
}: {
  root?: string; // CSS selector for the article container
  className?: string;
  offset?: number;
  levels?: TocLevel[];
  title?: string;
  mobile?: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const normalizedLevels = useMemo(() => normalizeLevels(levels), [levels]);
  const levelSelector = useMemo(
    () => normalizedLevels.map((lvl) => `h${lvl}`).join(', '),
    [normalizedLevels],
  );

  const store = useMemo(() => createHeadingsStore(root, levelSelector), [root, levelSelector]);
  const items = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const hash = useSyncExternalStore(subscribeHash, readHash, emptyHash);
  const [previousHash, setPreviousHash] = useState<string | null>(null);
  if (previousHash !== hash) {
    setPreviousHash(hash);
    if (hash) setActiveId(hash);
  }

  // Scroll-driven active heading (desktop / non-mobile only)
  useEffect(() => {
    if (!items.length || mobile) return;

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (!elements.length || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const stickyOffset = offset ?? readStickyOffset();
    const topMargin = -(stickyOffset + 12);
    const visible = new Map<string, number>();
    let fallbackId: string | null = elements[0]?.id ?? null;

    const setActiveIfChanged = (id: string | null) => {
      if (!id) return;
      fallbackId = id;
      setActiveId((prev) => (prev === id ? prev : id));
    };

    const updateFromVisible = () => {
      if (visible.size) {
        const next = Array.from(visible.entries()).sort((a, b) => a[1] - b[1])[0][0];
        setActiveIfChanged(next);
        return;
      }

      if (fallbackId) {
        const nearBottom = (() => {
          const scrollY = window.scrollY + window.innerHeight;
          const docHeight = document.documentElement.scrollHeight;
          return docHeight - scrollY < 2;
        })();
        if (nearBottom) {
          const last = elements[elements.length - 1];
          setActiveIfChanged(last?.id ?? fallbackId);
        } else {
          setActiveIfChanged(fallbackId);
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (!id) return;
          if (entry.isIntersecting) {
            visible.set(id, entry.boundingClientRect.top);
          } else {
            visible.delete(id);
          }
        });
        updateFromVisible();
      },
      {
        root: null,
        rootMargin: `${topMargin}px 0px -72% 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((node) => observer.observe(node));
    updateFromVisible();

    return () => {
      observer.disconnect();
    };
  }, [items, offset, mobile]);


  const visibilityClass = mobile ? 'block md:hidden' : 'hidden lg:block';
  const navClasses = [
    visibilityClass,
    'rounded-xl border border-blue-200 bg-white p-4 mb-4 shadow-xs ',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const list = useMemo(() => items, [items]);
  const structured = useMemo(() => buildStructure(list), [list]);

  if (!structured.length) return null;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const prefersNoMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resolvedOffset = offset ?? readStickyOffset();
    if (resolvedOffset > 0) {
      const top = window.scrollY + el.getBoundingClientRect().top - resolvedOffset;
      window.scrollTo({ top, behavior: prefersNoMotion ? 'auto' : 'smooth' });
    } else {
      el.scrollIntoView({ behavior: prefersNoMotion ? 'auto' : 'smooth', block: 'start' });
    }
    setActiveId(id);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  const renderLink = (item: Item, active: boolean, isChild: boolean) => {
    const linkClasses = [
      'flex w-full items-start gap-1 transition-colors hover:text-(--brand-blue)',
      active ? 'text-(--brand-blue) font-medium' : 'text-slate-700',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <a
        href={`#${item.id}`}
        onClick={(e) => handleClick(e, item.id)}
        aria-current={active ? 'true' : undefined}
        className={linkClasses}
      >
        {isChild && <CornerDownRight className="h-4 w-4 inline text-(--brand-orange)" aria-hidden="true" />}
        <span className="flex-1 leading-snug">{item.text}</span>
      </a>
    );
  };

  return (
    <nav
      aria-label="Table of contents"
      className={navClasses}
    >
      <div className="mb-3 text-[1rem] text-center font-display font-bold tracking-wide text-slate-900">
        <List className="h-4 w-4 inline mr-2 text-(--brand-blue)" aria-hidden="true" />
        {title}
        <ArrowDown className="h-4 w-4 inline ml-2 text-(--brand-blue)" aria-hidden="true" />
      </div>
      <ul className={[styles.tocList, styles.tocListRoot, 'space-y-2 text-base'].join(' ')}>
        {structured.map((section) => {
          const isH3Root = section.level === 3;
          const active = section.id === activeId;

          if (isH3Root) {
            return (
              <li key={section.id} className="pl-3">
                {renderLink(section, active, true)}
              </li>
            );
          }

          return (
            <li key={section.id} className={styles.tocBullet}>
              {renderLink(section, active, false)}
              {section.children.length > 0 && (
                <ul className={[styles.tocList, 'mt-2 space-y-1 pl-0'].join(' ')}>
                  {section.children.map((child) => {
                    const childActive = child.id === activeId;
                    return (
                      <li key={child.id} className="pl-3">
                        {renderLink(child, childActive, true)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
