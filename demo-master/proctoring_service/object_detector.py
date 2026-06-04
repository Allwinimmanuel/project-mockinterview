import cv2
import logging
from ultralytics import YOLO
from collections import defaultdict
import time
from config import RESTRICTED_OBJECTS, OBJECT_PERSISTENCE_THRESH

# Suppress YOLO logs
logging.getLogger("ultralytics").setLevel(logging.ERROR)

class ObjectDetector:
    def __init__(self):
        # Load YOLOv8 Small model (Higher accuracy for cell phones than Nano)
        self.model = YOLO('yolov8s.pt')
        self.object_timers = defaultdict(float)
        
    def process_frame(self, frame):
        # Run YOLO object detection with lower confidence to catch hidden phones
        results = self.model(frame, verbose=False, conf=0.15)[0]
        
        current_detected_objects = set()
        suspicious_objects_flagged = []
        
        for box in results.boxes:
            class_id = int(box.cls[0])
            class_name = self.model.names[class_id]
            
            if class_name in RESTRICTED_OBJECTS:
                current_detected_objects.add(class_name)
                
        now = time.time()
        
        # Update persistence timers
        for obj in RESTRICTED_OBJECTS:
            if obj in current_detected_objects:
                if self.object_timers[obj] == 0:
                    self.object_timers[obj] = now
                elif now - self.object_timers[obj] >= OBJECT_PERSISTENCE_THRESH:
                    suspicious_objects_flagged.append(obj)
            else:
                self.object_timers[obj] = 0
                
        return suspicious_objects_flagged
