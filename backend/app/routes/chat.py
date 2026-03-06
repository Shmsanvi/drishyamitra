from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.models import Photo, Person, PhotoPerson, DeliveryLog
from groq import Groq
import os, json

chat_bp = Blueprint('chat', __name__)
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

SYSTEM_PROMPT = """You are Drishyamitra's AI assistant for photo management.
When a user asks to search/find/show photos, respond with JSON:
{"action": "search", "person": "name or null", "tag": "tag or null", "message": "friendly message"}

When asked a general question, respond with JSON:
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
            person_filter = ai_json.get('person')
            photos = []
            
            if person_filter:
                matched_persons = Person.query.filter(
                    Person.user_id == user_id,
                    Person.name.ilike(f'%{person_filter}%')
                ).all()
                for person in matched_persons:
                    pps = PhotoPerson.query.filter_by(person_id=person.id).all()
                    for pp in pps:
                        p = pp.photo
                        photos.append({
                            'id': p.id,
                            'filename': p.filename,
                            'original_name': p.original_name,
                            'url': f'/api/photos/file/{p.filename}',
                            'tags': p.get_tags()
                        })
            else:
                all_photos = Photo.query.filter_by(user_id=user_id).limit(20).all()
                photos = [{'id': p.id, 'filename': p.filename, 'original_name': p.original_name, 'url': f'/api/photos/file/{p.filename}', 'tags': p.get_tags()} for p in all_photos]
            
            result['photos'] = photos
            result['count'] = len(photos)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'action': 'message', 'message': f'Sorry, I encountered an error: {str(e)}'}), 500
