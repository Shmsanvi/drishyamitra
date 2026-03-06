from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app import db
from app.models.models import User
import bcrypt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not all([username, email, password]):
        return jsonify({'error': 'All fields required'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(username=username, email=email, password_hash=pw_hash)
    db.session.add(user)
    db.session.commit()
    
    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': {'id': user.id, 'username': username, 'email': email}}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': {'id': user.id, 'username': user.username, 'email': user.email}}), 200
