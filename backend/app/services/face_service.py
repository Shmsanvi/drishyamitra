import numpy as np
import json
import os
from deepface import DeepFace
from PIL import Image

MODEL_NAME = "Facenet512"
DETECTOR = "opencv"
THRESHOLD = 0.6

def extract_faces_and_embeddings(image_path):
    try:
        result = DeepFace.represent(
            img_path=image_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=False
        )
        return result
    except Exception as e:
        print(f"Face extraction error: {e}")
        return []

def compare_embeddings(embedding1, embedding2):
    e1 = np.array(embedding1)
    e2 = np.array(embedding2)
    cosine_sim = np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))
    return 1 - cosine_sim

def identify_person(embedding, known_persons):
    best_match = None
    best_distance = float('inf')
    
    for person in known_persons:
        known_embedding = person.get_embedding()
        if not known_embedding:
            continue
        distance = compare_embeddings(embedding, known_embedding)
        if distance < best_distance:
            best_distance = distance
            best_match = person
    
    if best_distance <= THRESHOLD:
        return best_match, best_distance
    return None, None

def crop_face(image_path, facial_area, output_path):
    try:
        img = Image.open(image_path)
        x, y, w, h = facial_area['x'], facial_area['y'], facial_area['w'], facial_area['h']
        padding = 20
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(img.width, x + w + padding)
        y2 = min(img.height, y + h + padding)
        face_img = img.crop((x1, y1, x2, y2))
        face_img = face_img.resize((150, 150))
        face_img.save(output_path)
        return output_path
    except Exception as e:
        print(f"Face crop error: {e}")
        return None
