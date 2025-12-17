import { useEffect, useRef, useCallback, useState } from 'react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useClaudeCliStore } from '../stores/claudeCliStore';

export function SpeechToText() {
  const lastActiveElementRef = useRef<Element | null>(null);
  const [hasActiveInput, setHasActiveInput] = useState(false);
  const [isReformatting, setIsReformatting] = useState(false);

  const queryRaw = useClaudeCliStore((state) => state.queryRaw);

  // Auto-expand textarea to fit content
  const autoExpand = useCallback((element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  }, []);

  // Only insert final transcripts - interim text shows in the preview bubble
  const insertFinalText = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) return; // Skip interim results

    const element = lastActiveElementRef.current;
    if (!element) return;

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart ?? element.value.length;
      const end = element.selectionEnd ?? element.value.length;

      const before = element.value.substring(0, start);
      const after = element.value.substring(end);
      const textToInsert = text + ' ';
      const newValue = before + textToInsert + after;

      // Use native value setter to properly trigger React's onChange
      // Direct assignment to element.value doesn't trigger React's synthetic events
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, newValue);
      } else {
        element.value = newValue;
      }

      // Update cursor position
      const newPosition = before.length + textToInsert.length;
      element.setSelectionRange(newPosition, newPosition);

      // Trigger React's onChange with proper event
      element.dispatchEvent(new Event('input', { bubbles: true }));

      // Auto-expand textarea after React has processed the change
      if (element instanceof HTMLTextAreaElement) {
        requestAnimationFrame(() => {
          autoExpand(element);
        });
      }
    } else if (element.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text + ' ');
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, [autoExpand]);

  const {
    isRecording,
    isConnecting,
    interimTranscript,
    error,
    toggleRecording,
  } = useSpeechToText({
    onTranscript: insertFinalText,
  });

  // Reformat text using Claude
  const reformatText = useCallback(async () => {
    const element = lastActiveElementRef.current;
    if (!element) return;

    let currentText = '';
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      currentText = element.value;
    } else if (element.getAttribute('contenteditable') === 'true') {
      currentText = element.textContent || '';
    }

    if (!currentText.trim()) return;

    setIsReformatting(true);

    const prompt = `Reformat this dictated text to be clear and concise. Preserve ALL original meaning. Fix speech-to-text errors, add punctuation, improve readability. Do NOT add or remove any information.

IMPORTANT: Return ONLY the reformatted text. No explanations, no preamble, no "Here's the reformatted text:", no quotes around it. Just the clean text itself.

${currentText}`;

    try {
      const result = await queryRaw(prompt);
      if (result) {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.value = result;
          if (element instanceof HTMLTextAreaElement) {
            autoExpand(element);
          }
          element.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (element.getAttribute('contenteditable') === 'true') {
          element.textContent = result;
        }
      }
    } catch (err) {
      console.error('Reformat failed:', err);
    } finally {
      setIsReformatting(false);
    }
  }, [queryRaw, autoExpand]);

  // Track the last focused input element
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as Element;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.getAttribute('contenteditable') === 'true'
      ) {
        lastActiveElementRef.current = target;
        setHasActiveInput(true);
      }
    };

    const handleBlur = (_e: FocusEvent) => {
      // Small delay to allow button clicks before hiding
      setTimeout(() => {
        const active = document.activeElement;
        if (
          !(active instanceof HTMLInputElement) &&
          !(active instanceof HTMLTextAreaElement) &&
          active?.getAttribute('contenteditable') !== 'true' &&
          !active?.closest('.speech-to-text-controls')
        ) {
          setHasActiveInput(false);
        }
      }, 100);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  // Global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+V - toggle recording
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
        e.preventDefault();
        toggleRecording();
      }
      // Cmd+Shift+R - reformat text
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        reformatText();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording, reformatText]);

  // Don't show if no input is focused (unless recording)
  if (!hasActiveInput && !isRecording) {
    return null;
  }

  return (
    <div className="speech-to-text-controls fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Error message */}
      {error && (
        <div className="bg-red-900/90 text-red-200 px-3 py-2 rounded-lg text-sm max-w-xs">
          {error}
        </div>
      )}

      {/* Interim transcript preview */}
      {isRecording && interimTranscript && (
        <div className="bg-gray-800/90 text-gray-300 px-3 py-2 rounded-lg text-sm max-w-xs italic">
          {interimTranscript}
        </div>
      )}

      {/* Button row */}
      <div className="flex gap-2">
        {/* Reformat button */}
        <button
          onClick={reformatText}
          disabled={isReformatting || isRecording}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-lg
            ${isReformatting
              ? 'bg-purple-600 cursor-wait'
              : 'bg-purple-700 hover:bg-purple-600'
            }
            disabled:opacity-50
          `}
          title="Reformat with AI (Cmd+Shift+R)"
        >
          {isReformatting ? (
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>

        {/* Recording button */}
        <button
          onClick={toggleRecording}
          disabled={isConnecting}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-lg
            ${isRecording
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : isConnecting
                ? 'bg-yellow-600 cursor-wait'
                : 'bg-gray-700 hover:bg-gray-600'
            }
          `}
          title={isRecording ? 'Stop recording (Cmd+Shift+V)' : 'Start recording (Cmd+Shift+V)'}
        >
          {isConnecting ? (
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : isRecording ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
