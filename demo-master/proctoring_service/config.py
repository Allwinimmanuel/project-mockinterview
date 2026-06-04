# config.py

# Video settings
FRAME_WIDTH = 640
FRAME_HEIGHT = 480
FPS = 30

# Face & Gaze Tolerances (Highly relaxed for legal activity)
# Yaw, Pitch, Roll are typically between -180 to 180 degrees.
SAFE_YAW_LIMIT = 12   # Set extremely low (12 degrees) to instantly catch left/right head turns
SAFE_PITCH_UP = 10    # Set very low (10 degrees) to catch looking up
SAFE_PITCH_DOWN = 35  # Set to 35 degrees to allow candidates to look down at their keyboard comfortably

# State Machine Timers (in seconds)
# 0-5s: Ignore (STATE 1 - Normal Behavior)
# 5-10s: Warning (STATE 2 - Suspicious)
# >10s: Violation (STATE 3/4 - Confirmed Cheating)
DISTRACTION_WARNING_THRESH = 1.5
DISTRACTION_VIOLATION_THRESH = 5.0

# Face Presence Timers (in seconds)
NO_FACE_WARNING_THRESH = 5.0
NO_FACE_VIOLATION_THRESH = 10.0

# Object Detection Classes (COCO dataset indices for YOLO)
# 0: person, 67: cell phone, 73: book
RESTRICTED_OBJECTS = ['cell phone', 'book', 'tablet']
OBJECT_PERSISTENCE_THRESH = 0.5 # Decreased to 0.5s for instant phone catch

# Audio Monitoring Settings
ALLOW_VOICE_TYPING = True  # Set to True to allow candidates to speak answers without throwing false alarms
SPEECH_WARNING_THRESH = 3.0
SPEECH_VIOLATION_THRESH = 6.0
