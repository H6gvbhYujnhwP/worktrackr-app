// web/client/src/app/src/components/DictationButton.jsx
//
// Reusable voice dictation button using the browser's Web Speech API.
// No server call. No cost. Works in Chrome on desktop and Android.
//
// Props:
//   onResult(text: string) — called with the final committed transcript
//                            when the user stops recording. The caller
//                            decides how to merge it into its own state.
//   disabled (bool)        — disables the button (e.g. while form is saving)
//   className (string)     — extra classes on the outer wrapper
//
// Behaviour:
//   • Tap once  → starts recording, mic icon turns red + pulses
//   • Live preview box appears below showing interim words in real time
//   • Tap again → stops recording, final text passed to onResult()
//   • Preview box disappears after a short delay once stopped
//   • If Web Speech API is unsupported, a visible disabled button is rendered
//     with a tooltip explaining that Chrome or Edge is required

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X } from 'lucide-react';

// Is the API available in this browser?
const SpeechRecognition =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function DictationButton({ onResult, disabled = false, className = '' }) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText]  = useState('');   // live words (not yet committed)
  const [finalBuffer, setFinalBuffer]  = useState('');   // committed segments this session
  const [error, setError]              = useState('');

  const recognitionRef = useRef(null);
  const stopTimerRef   = useRef(null);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      clearTimeout(stopTimerRef.current);
    };
  }, []);

  // ── Start recording ─────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.lang            = 'en-GB';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
      setInterimText('');
      setFinalBuffer('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (newFinal) {
        setFinalBuffer(prev => prev + newFinal);
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      // 'no-speech' is not really an error — just silence. Ignore it.
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted') return;
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access was denied. Please allow microphone permission and try again.'
          : `Mic error: ${event.error}`
      );
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      // onend fires after stop() or abort(). We fire onResult from stopListening()
      // so we don't double-fire here.
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  // ── Stop recording ──────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
    setInterimText('');

    // Give onresult one final cycle to flush any remaining isFinal results,
    // then fire onResult with everything we collected.
    stopTimerRef.current = setTimeout(() => {
      setFinalBuffer(prev => {
        const text = prev.trim();
        if (text && onResult) onResult(text);
        return '';
      });
    }, 300);
  }, [onResult]);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearPreview = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.abort();
    setIsListening(false);
    setInterimText('');
    setFinalBuffer('');
    setError('');
  }, []);

  // ── Unsupported browser — render disabled button with tooltip ───────────
  if (!SpeechRecognition) {
    return (
      <div className={className}>
        <button
          type="button"
          disabled
          title="Voice dictation requires Google Chrome or Microsoft Edge"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium border bg-white border-[#e5e7eb] text-[#9ca3af] opacity-50 cursor-not-allowed"
        >
          <Mic size={14} className="text-[#9ca3af]" /> Dictate
        </button>
      </div>
    );
  }

  // ── What to show in the preview box ────────────────────────────────────
  const previewText = (finalBuffer + (interimText ? interimText : '')).trim();
  const showPreview = isListening || previewText;

  return (
    <div className={`space-y-2 ${className}`}>

      {/* ── Mic button row ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          title={isListening ? 'Stop dictation' : 'Start dictation'}
          className={[
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all',
            'border focus:outline-none focus:ring-2 focus:ring-offset-1',
            isListening
              ? 'bg-red-50 border-red-300 text-red-700 focus:ring-red-300 animate-pulse'
              : 'bg-white border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] focus:ring-[#d4a017]/40',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          {isListening
            ? <><MicOff size={14} className="text-red-500" /> Stop dictation</>
            : <><Mic  size={14} className="text-[#6b7280]" /> Dictate</>
          }
        </button>

        {/* Listening pulse indicator */}
        {isListening && (
          <span className="flex items-center gap-1.5 text-[12px] text-red-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Listening…
          </span>
        )}
      </div>

      {/* ── Error message ──────────────────────────────────────────────── */}
      {error && (
        <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Live preview box ────────────────────────────────────────────── */}
      {showPreview && (
        <div className="relative rounded-lg border border-[#d4a017]/40 bg-[#fffdf5] px-3 py-2.5 min-h-[48px]">

          {/* Clear button — top right */}
          <button
            type="button"
            onClick={clearPreview}
            title="Clear preview"
            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-colors"
          >
            <X size={12} />
          </button>

          {/* Label */}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#d4a017] mb-1">
            {isListening ? 'Listening' : 'Preview — tap "Stop dictation" to confirm'}
          </p>

          {/* Transcript text */}
          <p className="text-[13px] text-[#111113] leading-relaxed pr-6">
            {/* Committed text — solid */}
            {finalBuffer && (
              <span>{finalBuffer}</span>
            )}
            {/* Interim text — greyed, italic */}
            {interimText && (
              <span className="text-[#9ca3af] italic">{interimText}</span>
            )}
            {/* Empty state */}
            {!previewText && (
              <span className="text-[#9ca3af]">Start speaking…</span>
            )}
          </p>

          {/* Hint when stopped */}
          {!isListening && previewText && (
            <p className="mt-2 text-[11px] text-[#6b7280]">
              ✓ This text will be appended to your note when you save.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
