import numpy as np

class GazeTracker:
    def __init__(self):
        # Mediapipe Iris Landmarks
        self.LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        self.RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        
        self.LEFT_IRIS = [474, 475, 476, 477]
        self.RIGHT_IRIS = [469, 470, 471, 472]
        
        self.gaze_history = []
        self.history_length = 10 # smooth over a slightly longer period for eyes

    def _get_center(self, landmarks, frame_w, frame_h):
        if not landmarks: return None
        x = sum([lm[0] for lm in landmarks]) / len(landmarks)
        y = sum([lm[1] for lm in landmarks]) / len(landmarks)
        return (x, y)

    def process_gaze(self, face_landmarks, frame_w, frame_h):
        if not face_landmarks:
            return True # If no face, default to true, face tracker will handle missing face.
            
        landmarks = [(lm.x * frame_w, lm.y * frame_h) for lm in face_landmarks]
        
        # Calculate bounding boxes of eyes
        left_eye_points = [landmarks[i] for i in self.LEFT_EYE]
        right_eye_points = [landmarks[i] for i in self.RIGHT_EYE]
        
        left_iris_center = self._get_center([landmarks[i] for i in self.LEFT_IRIS], frame_w, frame_h)
        right_iris_center = self._get_center([landmarks[i] for i in self.RIGHT_IRIS], frame_w, frame_h)
        
        # Calculate relative position of iris in the eye bounding box (0.0 to 1.0)
        # For simplicity, we define a safe threshold based on center deviations
        
        # Extreme simplifications for gaze tracking (in a production setting we map this to screen coords)
        # We will assume normal looking around the screen is "safe".
        # We only flag if iris is completely buried in corner (ratio < 0.1 or > 0.9)
        
        # Extracting X and Y boundaries
        l_x_min = min([p[0] for p in left_eye_points])
        l_x_max = max([p[0] for p in left_eye_points])
        l_y_min = min([p[1] for p in left_eye_points])
        l_y_max = max([p[1] for p in left_eye_points])
        
        if l_x_max - l_x_min == 0 or l_y_max - l_y_min == 0:
            return True
            
        l_ratio_x = (left_iris_center[0] - l_x_min) / (l_x_max - l_x_min)
        l_ratio_y = (left_iris_center[1] - l_y_min) / (l_y_max - l_y_min)
        
        self.gaze_history.append((l_ratio_x, l_ratio_y))
        if len(self.gaze_history) > self.history_length:
            self.gaze_history.pop(0)
            
        avg_ratio_x = sum([g[0] for g in self.gaze_history]) / len(self.gaze_history)
        avg_ratio_y = sum([g[1] for g in self.gaze_history]) / len(self.gaze_history)
        
        # Stricter bounds for eye detection:
        # X-axis: 0.08 - 0.92 (relaxed to allow looking left/right at question & numbers without false alarms)
        # Y-axis: 0.15 - 0.85 (catches looking down at lap/phone or up away, allowing natural reading/blinking)
        is_safe = (0.08 < avg_ratio_x < 0.92) and (0.15 < avg_ratio_y < 0.85)
        
        return is_safe
