'use client';

type MountOptions = {
  ids?: { query: string; noResults: string; resultCount?: string };
  urlKeys?: { q?: string };
  minQueryLen?: number;
  defer?: boolean;
};
const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
const selector = (value: string) => (/^[#.[]/.test(value) ? value : `#${value}`);

/** Progressive enhancement of the complete server-rendered FAQ archive. */
export function mountFaqSearch({ ids, urlKeys, minQueryLen = 2 }: MountOptions) {
  if (!ids || typeof window === 'undefined') return () => {};
  const input = document.querySelector(selector(ids.query));
  const root = document.getElementById('faq-topics');
  if (!(input instanceof HTMLInputElement) || !root) return () => {};
  const topics = Array.from(root.querySelectorAll<HTMLElement>('.faq-topic'));
  const answers = Array.from(root.querySelectorAll<HTMLDetailsElement>('details.faq-item'));
  const noResults = document.querySelector(selector(ids.noResults));
  const resultCount = document.querySelector(selector(ids.resultCount || 'faq-result-count'));
  const queryText = document.getElementById('faq-query');
  const suggestions = document.getElementById('faq-suggestions');
  const suggestionList = document.getElementById('faq-suggestion-list');
  const clearButton = document.getElementById('faq-clear-search');
  const queryKey = urlKeys?.q || 'q';
  let scrollFrame = 0;
  const searchable = new Map(
    answers.map((answer) => [
      answer,
      [answer.dataset.title, answer.dataset.topic, answer.dataset.excerpt].map((text) =>
        norm(text || ''),
      ),
    ]),
  );
  const notify = () => window.dispatchEvent(new CustomEvent('faq:update'));

  function filter(syncUrl = true) {
    const query = input instanceof HTMLInputElement ? input.value.trim() : '';
    const normalized = norm(query);
    let count = 0;
    for (const answer of answers) {
      answer.hidden =
        normalized.length >= minQueryLen &&
        !searchable.get(answer)!.some((text) => text.includes(normalized));
      if (!answer.hidden) count++;
    }
    for (const topic of topics) {
      const visible = Array.from(topic.querySelectorAll<HTMLDetailsElement>('.faq-item')).filter(
        (answer) => !answer.hidden,
      ).length;
      topic.hidden = visible === 0;
      const badge = topic.querySelector('.faq-count');
      if (badge) badge.textContent = String(visible);
    }
    if (resultCount) resultCount.textContent = String(count);
    if (clearButton) clearButton.hidden = !query;
    noResults?.classList.toggle('hidden', count !== 0);
    if (queryText) queryText.textContent = `“${query}”`;
    suggestionList?.replaceChildren();
    const tokens = normalized.split(/\s+/).filter((token) => token.length >= 3);
    const candidates =
      count === 0
        ? answers
            .filter((answer) => tokens.some((token) => searchable.get(answer)![0].includes(token)))
            .slice(0, 5)
        : [];
    suggestions?.classList.toggle('hidden', candidates.length === 0);
    for (const answer of candidates) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `/faq#${answer.id}`;
      link.className =
        'inline-flex rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-(--brand-blue) hover:bg-blue-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue)';
      link.textContent = answer.dataset.title || '';
      li.append(link);
      suggestionList?.append(li);
    }
    if (syncUrl) {
      const url = new URL(window.location.href);
      if (normalized.length >= minQueryLen) url.searchParams.set(queryKey, query);
      else url.searchParams.delete(queryKey);
      if (url.href !== window.location.href)
        window.history.replaceState(window.history.state, '', url);
    }
    notify();
  }

  function openHash(initial = false) {
    let id: string;
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    if (!id.startsWith('faq-')) return;
    const answer = answers.find((item) => item.id === id);
    if (!answer) return;
    // A direct answer link wins over a search that would conceal its target.
    if (answer.hidden && input instanceof HTMLInputElement) {
      input.value = '';
      filter();
    }
    if (initial)
      answers.forEach((item) => {
        item.open = item === answer;
      });
    answer.open = true;
    notify();
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      answer.querySelector('summary')?.focus({ preventScroll: true });
      answer.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }

  const onInput = () => filter();
  const clear = () => {
    input.value = '';
    filter();
    input.focus();
  };
  const onHash = () => openHash();
  const onHistory = () => {
    input.value = new URL(window.location.href).searchParams.get(queryKey) || '';
    filter(false);
    openHash();
  };
  const onSuggestion = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link) return;
    event.preventDefault();
    window.history.pushState(window.history.state, '', link.href);
    input.value = '';
    filter();
    openHash();
  };
  input.disabled = false;
  input.value = new URL(window.location.href).searchParams.get(queryKey) || '';
  input.addEventListener('input', onInput);
  clearButton?.addEventListener('click', clear);
  suggestionList?.addEventListener('click', onSuggestion);
  window.addEventListener('hashchange', onHash);
  window.addEventListener('popstate', onHistory);
  filter();
  openHash(true);
  return () => {
    cancelAnimationFrame(scrollFrame);
    input.removeEventListener('input', onInput);
    clearButton?.removeEventListener('click', clear);
    suggestionList?.removeEventListener('click', onSuggestion);
    window.removeEventListener('hashchange', onHash);
    window.removeEventListener('popstate', onHistory);
  };
}
