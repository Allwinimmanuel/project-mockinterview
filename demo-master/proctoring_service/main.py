import cv2
import time
import numpy as np
import http.server
import threading
import json
import base64
from face_tracker import FaceTracker
from gaze_tracker import GazeTracker
from object_detector import ObjectDetector
from audio_monitor import AudioMonitor
from config import *

# Initialize proctoring engine components globally
face_tracker = FaceTracker()
gaze_tracker = GazeTracker()
object_detector = ObjectDetector()
audio_monitor = AudioMonitor()

# Start background audio monitoring
audio_monitor.start()
print("🎙️ Audio monitor listening in background...")

class StatusHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/analyze':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                base64_image = data.get('image', '')
                
                # Decode image
                if ',' in base64_image:
                    base64_image = base64_image.split(',')[1]
                image_bytes = base64.b64decode(base64_image)
                np_array = np.frombuffer(image_bytes, dtype=np.uint8)
                frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
                
                if frame is None:
                    raise ValueError("Failed to decode frame")

                # Mirror frame to match webcam expectations
                frame = cv2.flip(frame, 1)

                # 1. Face & Head Pose Tracking
                face_state, face_results = face_tracker.process_frame(frame)
                
                # 2. Gaze Tracking
                is_gaze_safe = True
                if face_state["landmarks"]:
                    is_gaze_safe = gaze_tracker.process_gaze(face_state["landmarks"], FRAME_WIDTH, FRAME_HEIGHT)
                
                # 3. Object Detection (YOLOv8)
                suspicious_objects = object_detector.process_frame(frame)
                
                # 4. Audio Status
                audio_status = audio_monitor.get_status()

                # Build response status
                response_status = {
                    "num_faces": face_state["num_faces"],
                    "is_focused": face_state["is_focused"],
                    "gaze_safe": is_gaze_safe,
                    "suspicious_objects": list(suspicious_objects),
                    "speech_flag": audio_status["speech_flag"]
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_status).encode('utf-8'))
                
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    # Suppress standard logging to keep console clean
    def log_message(self, format, *args):
        pass

def start_http_server():
    try:
        server = http.server.HTTPServer(('localhost', 5001), StatusHandler)
        print("🚀 Headless AI Proctoring Server running on http://localhost:5001/analyze")
        server.serve_forever()
    except Exception as e:
        print(f"HTTP Server failed to start: {e}")

if __name__ == "__main__":
    start_http_server()
