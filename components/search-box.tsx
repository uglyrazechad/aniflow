'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, Loader2, Search, Star, WifiOff } from 'lucide-react';

import { Poster } from '@/components/poster';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AnimeSummary, DataSource } from '@/types/anime';

interface SearchBoxProps {
  className?: string;
  inputClassName?: string;
  initialQuery?: string;
  autoFocus?: boolean;
}

interface SearchState {
  items: AnimeSummary[];
  source: DataSource;
}

export function SearchBox({ className, inputClassName, initialQuery = '', autoFocus }: SearchBoxProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SearchState | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const goToSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [router],
  );

  const goToAnime = useCallback(
    (anime: AnimeSummary) => {
      setOpen(false);
      router.push(`/anime/${anime.id}`);
    },
    [router],
  );

  // Поиск с дебаунсом и отменой предыдущего запроса.
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setState(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=6`,
          { signal: controller.signal },
        );

        if (!response.ok) throw new Error('Поиск временно недоступен');

        const data = (await response.json()) as SearchState;
        setState({ items: data.items ?? [], source: data.source ?? 'animego' });
        setError(null);
        setOpen(true);
      } catch (requestError) {
        if ((requestError as Error).name === 'AbortError') return;
        setError('Не удалось выполнить поиск. Попробуйте ещё раз.');
        setState(null);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Клик вне компонента закрывает панель.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // ⌘K / Ctrl+K — быстрый фокус на поиск.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        if (query.trim().length >= 2) setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [query]);

  const results = state?.items ?? [];
  const showPanel = open && query.trim().length >= 2;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      if (!results.length) return;
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!results.length) return;
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) goToAnime(results[activeIndex]);
      else goToSearch(query);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          goToSearch(query);
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            autoFocus={autoFocus}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              setActiveIndex(-1);
              // Панель открываем сразу, чтобы был виден скелетон загрузки.
              if (value.trim().length >= 2) setOpen(true);
            }}
            onFocus={() => {
              if (query.trim().length >= 2) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Поиск аниме…"
            aria-label="Поиск аниме"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls="search-suggestions"
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'h-10 rounded-xl border-border/60 bg-card/50 pl-9 pr-16 transition-colors focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-1',
              inputClassName,
            )}
          />
          <div className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 md:flex">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <kbd className="rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>
      </form>

      <AnimatePresence>
        {showPanel ? (
          <motion.div
            id="search-suggestions"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border/70 bg-popover/95 shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[26rem]"
          >
            {loading && !results.length ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-xl p-2">
                    <div className="skeleton h-14 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3.5 w-2/3 rounded" />
                      <div className="skeleton h-3 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
                <WifiOff className="h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-5 text-sm text-muted-foreground">
                По запросу «{query.trim()}» ничего не найдено.
              </div>
            ) : (
              <>
                <div className="p-1.5">
                  {results.map((anime, index) => (
                    <button
                      key={anime.id}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => goToAnime(anime)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors',
                        index === activeIndex ? 'bg-accent' : 'hover:bg-accent/60',
                      )}
                    >
                      <Poster
                        src={anime.posterUrl}
                        alt=""
                        title={anime.title}
                        className="h-14 w-10 shrink-0 rounded-lg"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-medium">{anime.title}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {anime.year ?? '—'}
                          {anime.rating ? (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {anime.rating.toFixed(1)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <CornerDownLeft
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-opacity',
                          index === activeIndex ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => goToSearch(query)}
                  className="flex w-full items-center justify-between border-t border-border/60 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  <span>
                    Все результаты по запросу «{query.trim()}»
                    {state?.source === 'demo' ? (
                      <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                        демо
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
