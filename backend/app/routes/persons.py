from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.models import Person, Photo, PhotoPerson
from app.services.face_service import extract_faces_and_embeddings, crop_face, identify_person
import os, uuid

persons_bp = Blueprint('persons', __name__)

@persons_bp.route('/', methods=['GET'])
@jwt_required()
def get_persons():
    user_id = int(get_jwt_identity())
    persons = Person.query.filter_by(user_id=user_id).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'thumbnail': p.thumbnail_path,
        'photo_count': PhotoPerson.query.filter_by(person_id=p.id).count()
    } for p in persons])

@persons_bp.route('/label', methods=['POST'])
@jwt_required()
def label_face():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name')
    photo_id = data.get('photo_id')
    face_index = data.get('face_index', 0)

    if not name or not photo_id:
        return jsonify({'error': 'Name and photo_id required'}), 400

    photo = Photo.query.filter_by(id=photo_id, user_id=user_id).first_or_404()
    faces = extract_faces_and_embeddings(photo.file_path)

    if not faces:
        return jsonify({'error': 'No faces found in photo'}), 400

    # Use the specified face index
    face_idx = min(face_index, len(faces) - 1)
    embedding = faces[face_idx].get('embedding')
    facial_area = faces[face_idx].get('facial_area', {})

    person = Person.query.filter_by(user_id=user_id, name=name).first()
    if not person:
        person = Person(name=name, user_id=user_id)
        db.session.add(person)

    person.set_embedding(embedding)

    thumb_dir = os.path.join('uploads', str(user_id), 'thumbnails')
    os.makedirs(thumb_dir, exist_ok=True)
    thumb_path = os.path.join(thumb_dir, f'{uuid.uuid4()}.jpg')
    crop_face(photo.file_path, facial_area, thumb_path)
    person.thumbnail_path = thumb_path

    existing = PhotoPerson.query.filter_by(photo_id=photo.id, person_id=person.id).first()
    if not existing:
        pp = PhotoPerson(photo_id=photo.id, person_id=person.id, confidence=1.0)
        db.session.add(pp)
        photo.add_tag(name)

    db.session.flush()

    # Auto-scan all existing photos
    all_photos = Photo.query.filter_by(user_id=user_id).all()
    auto_tagged = 0

    for existing_photo in all_photos:
        if existing_photo.id == photo.id:
            continue
        already_linked = PhotoPerson.query.filter_by(photo_id=existing_photo.id, person_id=person.id).first()
        if already_linked:
            continue
        try:
            photo_faces = extract_faces_and_embeddings(existing_photo.file_path)
            for face_data in photo_faces:
                face_embedding = face_data.get('embedding')
                if face_embedding:
                    matched_person, distance = identify_person(face_embedding, [person])
                    if matched_person:
                        pp = PhotoPerson(photo_id=existing_photo.id, person_id=person.id, confidence=1-distance)
                        db.session.add(pp)
                        existing_photo.add_tag(name)
                        auto_tagged += 1
                        break
        except Exception as e:
            print(f"Error scanning photo {existing_photo.id}: {e}")
            continue

    db.session.commit()

    return jsonify({
        'message': f'Labeled as {name}! Auto-tagged in {auto_tagged} additional photos.',
        'person_id': person.id,
        'auto_tagged': auto_tagged
    }), 201

@persons_bp.route('/<int:person_id>', methods=['DELETE'])
@jwt_required()
def delete_person(person_id):
    user_id = int(get_jwt_identity())
    person = Person.query.filter_by(id=person_id, user_id=user_id).first_or_404()
    db.session.delete(person)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200