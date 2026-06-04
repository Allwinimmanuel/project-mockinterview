import speech_recognition as sr
import threading
import time
from config import SPEECH_VIOLATION_THRESH

class AudioMonitor:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        
        # Adjust for ambient noise initially
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=2)
            
        self.is_listening = False
        self.speech_detected_time = 0
        self.continuous_speech_flag = False
        self.transcripts = []
        
        self.stop_listening_fn = None

    def start(self):
        if self.is_listening: return
        self.is_listening = True
        
        def callback(recognizer, audio):
            try:
                # Use Google Speech Recognition for simplicity (Requires Internet)
                # In production, use offline Whisper models.
                text = recognizer.recognize_google(audio)
                if text:
                    self.transcripts.append((time.time(), text))
                    # Trigger basic speech flag (for continuous speaking > threshold)
                    # We can refine this using VAD (Voice Activity Detection) in real-time.
                    self.continuous_speech_flag = True 
                    time.sleep(SPEECH_VIOLATION_THRESH)
                    self.continuous_speech_flag = False
            except sr.UnknownValueError:
                pass
            except sr.RequestError:
                pass

        # Listen in background thread
        self.stop_listening_fn = self.recognizer.listen_in_background(self.microphone, callback, phrase_time_limit=5)

    def get_status(self):
        return {
            "speech_flag": self.continuous_speech_flag,
            "recent_transcripts": self.transcripts[-5:] # Last 5 transcripts
        }

    def stop(self):
        if self.stop_listening_fn:
            self.stop_listening_fn(wait_for_stop=False)
        self.is_listening = False
