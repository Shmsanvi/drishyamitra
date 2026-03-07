from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.models import Photo, Person, PhotoPerson, ChatMessage
from groq import Groq
import os, json

chat_bp = Blueprint('chat', __name__)
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

SYSTEM_PROMPT = """You are Drishyamitra's AI assistant for photo management.
Analyze the user's message and respond ONLY with valid JSON matching one of these actions:

1. Show/find/search photos:
{"action": "search", "person": "name or null", "message": "friendly message"}

2. Count photos:
{"action": "count", "person": "name or null", "message": "friendly message"}

3. List all labeled people:
{"action": "list_people", "message": "friendly message"}

4. Delete photos of a person:
{"action": "delete_person_photos", "person": "name", "message": "friendly message"}

5. Rename a person:
{"action": "rename_person", "old_name": "old name", "new_name": "new name", "message": "friendly message"}

6. General question:
{"action": "message", "message": "your helpful response"}

Always respond ONLY with valid JSON. Be friendly and helpful."""

@chat_bp.route('/message', methods=['POST'])
@jwt_required()
def chat_message():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    user_message = data.get('message', '')

    persons = Person.query.filter_by(user_id=user_id).all()
    photo_count = Photo.query.filter_by(user_id=user_id).count()
    person_names = [p.name for p in persons]
    context = f"User has {photo_count} photos and these labeled people: {', '.join(person_names) if person_names else 'none yet'}."

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT + f"\n\nContext: {context}"},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3,
            max_tokens=500
        )

        ai_text = response.choices[0].message.content.strip()
        try:
            ai_json = json.loads(ai_text)
        except:
            ai_json = {"action": "message", "message": ai_text}

        action = ai_json.get('action', 'message')
        result = {'action': action, 'message': ai_json.get('message', 'Done!')}

        if action == 'search':
            photos = get_photos_for_person(user_id, ai_json.get('person'))
            result['photos'] = photos
            result['count'] = len(photos)

        elif action == 'count':
            person_filter = ai_json.get('person')
            if person_filter:
                matched = Person.query.filter(Person.user_id == user_id, Person.name.ilike(f'%{person_filter}%')).first()
                if matched:
                    count = PhotoPerson.query.filter_by(person_id=matched.id).count()
                    result['message'] = f"You have {count} photos of {matched.name}."
                else:
                    result['message'] = f"I couldn't find anyone named {person_filter}."
            else:
                result['message'] = f"You have {photo_count} photos in total."

        elif action == 'list_people':
            if person_names:
                people_info = []
                for p in persons:
                    count = PhotoPerson.query.filter_by(person_id=p.id).count()
                    people_info.append(f"{p.name} ({count} photos)")
                result['message'] = "Here are all your labeled people: " + ", ".join(people_info)
            else:
                result['message'] = "You haven't labeled anyone yet. Go to Gallery, click a photo, and label a face!"

        elif action == 'delete_person_photos':
            person_name = ai_json.get('person')
            if person_name:
                matched = Person.query.filter(
                    Person.user_id == user_id,
                    Person.name.ilike(f'%{person_name}%')
                ).first()
                if matched:
                    pps = PhotoPerson.query.filter_by(person_id=matched.id).all()
                    photo_ids = [pp.photo_id for pp in pps]
                    count = len(photo_ids)
                    PhotoPerson.query.filter(PhotoPerson.photo_id.in_(photo_ids)).delete(synchronize_session=False)
                    photos_to_delete = Photo.query.filter(Photo.id.in_(photo_ids)).all()
                    for photo in photos_to_delete:
                        if os.path.exists(photo.file_path):
                            os.remove(photo.file_path)
                        db.session.delete(photo)
                    db.session.delete(matched)
                    db.session.commit()
                    result['message'] = f"Deleted {count} photos of {person_name} and removed them from your library."
                else:
                    result['message'] = f"Couldn't find anyone named {person_name}."

        elif action == 'rename_person':
            old_name = ai_json.get('old_name')
            new_name = ai_json.get('new_name')
            if old_name and new_name:
                matched = Person.query.filter(Person.user_id == user_id, Person.name.ilike(f'%{old_name}%')).first()
                if matched:
                    matched.name = new_name
                    db.session.commit()
                    result['message'] = f"Renamed {old_name} to {new_name} successfully!"
                else:
                    result['message'] = f"Couldn't find anyone named {old_name}."

        db.session.add(ChatMessage(user_id=user_id, role='user', content=user_message))
        db.session.add(ChatMessage(user_id=user_id, role='assistant', content=result['message']))
        db.session.commit()

        return jsonify(result)

    except Exception as e:
        return jsonify({'action': 'message', 'message': f'Sorry, I encountered an error: {str(e)}'}), 500

@chat_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id = int(get_jwt_identity())
    messages = ChatMessage.query.filter_by(user_id=user_id).order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([{'role': m.role, 'content': m.content} for m in messages])

@chat_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_history():
    user_id = int(get_jwt_identity())
    ChatMessage.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'Cleared'})

def get_photos_for_person(user_id, person_filter=None):
    photos = []
    if person_filter:
        matched_persons = Person.query.filter(Person.user_id == user_id, Person.name.ilike(f'%{person_filter}%')).all()
        for person in matched_persons:
            for pp in PhotoPerson.query.filter_by(person_id=person.id).all():
                p = pp.photo
                photos.append({'id': p.id, 'filename': p.filename, 'original_name': p.original_name, 'url': f'/api/photos/file/{p.filename}', 'tags': p.get_tags()})
    else:
        for p in Photo.query.filter_by(user_id=user_id).limit(20).all():
            photos.append({'id': p.id, 'filename': p.filename, 'original_name': p.original_name, 'url': f'/api/photos/file/{p.filename}', 'tags': p.get_tags()})
    return photos