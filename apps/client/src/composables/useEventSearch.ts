import { ref, computed } from 'vue';
import type { HookEvent } from '../types';

export function useEventSearch() {
  const searchPattern = ref<string>('');

  // Validate regex pattern
  const validateRegex = (pattern: string): { valid: boolean; error?: string } => {
    if (!pattern || pattern.trim() === '') {
      return { valid: true };
    }

    try {
      new RegExp(pattern);
      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid regex pattern';
      return { valid: false, error: errorMessage };
    }
  };

  const searchError = computed(() => {
    const validation = validateRegex(searchPattern.value);
    return validation.valid ? '' : validation.error || 'Invalid regex pattern';
  });

  const updateSearchPattern = (pattern: string) => {
    searchPattern.value = pattern;
  };

  const clearSearch = () => {
    searchPattern.value = '';
  };

  // Check if event matches pattern (using JSON stringify for full coverage)
  const matchesPattern = (event: HookEvent, pattern: string): boolean => {
    if (!pattern || pattern.trim() === '') {
      return true;
    }

    const validation = validateRegex(pattern);
    if (!validation.valid) {
      return false;
    }

    const regex = new RegExp(pattern, 'i');
    const eventString = JSON.stringify(event).toLowerCase();
    return regex.test(eventString);
  };

  // Filter events by pattern
  const searchEvents = (events: HookEvent[], pattern: string): HookEvent[] => {
    if (!pattern || pattern.trim() === '') {
      return events;
    }

    return events.filter(event => matchesPattern(event, pattern));
  };

  return {
    searchPattern,
    searchEvents,
    matchesPattern,
    validateRegex,
    searchError,
    updateSearchPattern,
    clearSearch,
  };
}
