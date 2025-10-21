import { ref, onUnmounted } from 'vue';

let recognition: any = null;

if ('webkitSpeechRecognition' in window) {
  recognition = new (window as any).webkitSpeechRecognition();
} else if ('SpeechRecognition' in window) {
  recognition = new (window as any).SpeechRecognition();
}

if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
}

export function useVoice() {
  const isListening = ref(false);
  const error = ref<string | null>(null);

  const startListening = (onResult: (text: string) => void) => {
    if (!recognition) {
      error.value = 'Speech recognition not supported';
      return;
    }

    recognition.onstart = () => {
      isListening.value = true;
    };
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };
    recognition.onerror = (event: any) => {
      error.value = event.error || 'Unknown error';
      isListening.value = false;
    };
    recognition.onend = () => {
      isListening.value = false;
    };

    try {
      recognition.start();
    } catch (err) {
      error.value = 'Failed to start listening: ' + String(err);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
  };

  const speak = async (text: string, provider: 'elevenlabs' | 'openai' | 'pyttsx3') => {
    try {
      const response = await fetch('http://localhost:4000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, provider }),
      });
      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch((e) => console.error('Audio play error:', e));
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (err) {
      console.error('TTS error:', err);
      error.value = 'TTS failed: ' + String(err);
    }
  };

  onUnmounted(stopListening);

  return { isListening, error, startListening, stopListening, speak };
}
