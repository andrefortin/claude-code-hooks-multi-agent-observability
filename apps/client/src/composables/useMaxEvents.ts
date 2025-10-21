import { ref, onMounted } from 'vue';

export function useMaxEvents(defaultValue: number = 1000) {
  const maxEvents = ref<number>(defaultValue);

  onMounted(() => {
    const saved = localStorage.getItem('maxEventsToDisplay');
    if (saved !== null) {
      maxEvents.value = parseInt(saved, 10);
    }
  });

  const setMaxEvents = (value: number) => {
    maxEvents.value = Math.max(1, value); // Ensure at least 1
    localStorage.setItem('maxEventsToDisplay', maxEvents.value.toString());
  };

  return {
    maxEvents,
    setMaxEvents,
  };
}