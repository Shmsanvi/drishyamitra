from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from werkzeug.utils import secure_filename
from app import db
from app.models.models import User, Photo, Person, PhotoPerson
from app.services.face_service import extract_faces_and_embeddings, identify_person, crop_face
import os, uuid, json

photos_bp = Blueprint('photos', __name__)
ALLOWED = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED

@photos_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_photo():
    user_id = int(get_jwt_identity())
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    files = request.files.getlist('files')
    results = []
    upload_dir = os.path.join('uploads', str(user_id))
    os.makedirs(upload_dir, exist_ok=True)
    for file in files:
        if file and allowed_file(file.filename):
            filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
            filepath = os.path.join(upload_dir, filename)
            file.save(filepath)
            photo = Photo(filename=filename, original_name=file.filename, file_path=filepath, user_id=user_id)
            db.session.add(photo)
            db.session.flush()
            known_persons = Person.query.filter_by(user_id=user_id).all()
            face_results = extract_faces_and_embeddings(filepath)
            identified = []
            for face_data in face_results:
                embedding = face_data.get('embedding')
                facial_area = face_data.get('facial_area', {})
                if embedding:
                    person, distance = identify_person(embedding, known_persons)
                    if person:
                        pp = PhotoPerson(photo_id=photo.id, person_id=person.id, confidence=1-distance)
                        db.session.add(pp)
                        photo.add_tag(person.name)
                        identified.append({'name': person.name, 'confidence': round((1-distance)*100, 1)})
            photo.faces_detected = len(face_results)
            photo.processed = True
            db.session.commit()
            results.append({'id': photo.id, 'filename': filename, 'faces_detected': len(face_results), 'identified': identified})
    return jsonify({'uploaded': len(results), 'results': results}), 201

@photos_bp.route('/', methods=['GET'])
@jwt_required()
def get_photos():
    user_id = int(get_jwt_identity())
    person_filter = request.args.get('person')
    query = Photo.query.filter_by(user_id=user_id)
    if person_filter:
        query = query.join(PhotoPerson).join(Person).filter(Person.name.ilike(f'%{person_filter}%'))
    photos = query.order_by(Photo.upload_date.desc()).all()
    result = []
    for photo in photos:
        persons_in_photo = [pp.person.name for pp in photo.photo_persons]
        result.append({'id': photo.id, 'filename': photo.filename, 'original_name': photo.original_name, 'upload_date': photo.upload_date.isoformat(), 'tags': photo.get_tags(), 'persons': persons_in_photo, 'faces_detected': photo.faces_detected})
    return jsonify(result)

@photos_bp.route('/file/<filename>', methods=['GET'])
def serve_photo(filename):
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'Token required'}), 401
    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except:
        return jsonify({'error': 'Invalid token'}), 401
    upload_dir = os.path.join('uploads', str(user_id))
    filepath = os.path.abspath(os.path.join(upload_dir, filename))
    return send_file(filepath)

@photos_bp.route('/<int:photo_id>', methods=['DELETE'])
@jwt_required()
def delete_photo(photo_id):
    user_id = int(get_jwt_identity())
    photo = Photo.query.filter_by(id=photo_id, user_id=user_id).first_or_404()
    if os.path.exists(photo.file_path):
        os.remove(photo.file_path)
    db.session.delete(photo)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200
