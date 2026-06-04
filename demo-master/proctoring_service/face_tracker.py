import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import time
from config import SAFE_YAW_LIMIT, SAFE_PITCH_UP, SAFE_PITCH_DOWN

class FaceTracker:
    def __init__(self):
        base_options = python.BaseOptions(model_asset_path='face_landmarker.task')
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=5
        )
        self.detector = vision.FaceLandmarker.create_from_options(options)
        # Smoothing buffers for head pose
        self.yaw_history = []
        self.pitch_history = []
        self.history_length = 5
        
    def estimate_head_pose(self, face_landmarks, frame_w, frame_h):
        # Extract specific landmarks for pose estimation
        # 1: Nose tip, 33: Left eye left corner, 263: Right eye right corner
        # 61: Mouth left corner, 291: Mouth right corner, 199: Chin
        face_3d = []
        face_2d = []
        
        for idx, lm in enumerate(face_landmarks):
            if idx in [1, 33, 263, 61, 291, 199]:
                x, y = int(lm.x * frame_w), int(lm.y * frame_h)
                face_2d.append([x, y])
                face_3d.append([x, y, lm.z])
                
        face_2d = np.array(face_2d, dtype=np.float64)
        face_3d = np.array(face_3d, dtype=np.float64)
        
        focal_length = 1 * frame_w
        cam_matrix = np.array([
            [focal_length, 0, frame_h / 2],
            [0, focal_length, frame_w / 2],
            [0, 0, 1]
        ])
        dist_matrix = np.zeros((4, 1), dtype=np.float64)
        
        success, rot_vec, trans_vec = cv2.solvePnP(face_3d, face_2d, cam_matrix, dist_matrix)
        rmat, jac = cv2.Rodrigues(rot_vec)
        angles, mtxR, mtxQ, Qx, Qy, Qz = cv2.RQDecomp3x3(rmat)
        
        # Angles in degrees
        pitch = angles[0] * 360
        yaw = angles[1] * 360
        roll = angles[2] * 360
        
        return pitch, yaw, roll

    def process_frame(self, frame):
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        # Convert to mp.Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        results = self.detector.detect(mp_image)
        
        state = {
            "num_faces": 0,
            "is_focused": True,
            "head_pose": (0, 0, 0), # Pitch, Yaw, Roll
            "landmarks": None
        }
        
        if results.face_landmarks:
            state["num_faces"] = len(results.face_landmarks)
            
            # Analyze only the primary (largest/first) face
            primary_face = results.face_landmarks[0]
            state["landmarks"] = primary_face
            
            pitch, yaw, roll = self.estimate_head_pose(primary_face, w, h)
            
            # Smoothing
            self.pitch_history.append(pitch)
            self.yaw_history.append(yaw)
            if len(self.pitch_history) > self.history_length:
                self.pitch_history.pop(0)
                self.yaw_history.pop(0)
                
            smooth_pitch = sum(self.pitch_history) / len(self.pitch_history)
            smooth_yaw = sum(self.yaw_history) / len(self.yaw_history)
            
            state["head_pose"] = (smooth_pitch, smooth_yaw, roll)
            
            # Check Safe Zones
            # Pitch down is positive, up is negative (depending on coords)
            # Let's use absolute thresholds for simplicity
            is_yaw_safe = abs(smooth_yaw) < SAFE_YAW_LIMIT
            is_pitch_safe = -SAFE_PITCH_UP < smooth_pitch < SAFE_PITCH_DOWN
            
            if not is_yaw_safe or not is_pitch_safe:
                state["is_focused"] = False
                
        return state, results
