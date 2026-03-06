from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///drishyamitra.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
    
    CORS(app)
    db.init_app(app)
    jwt.init_app(app)
    
    from app.routes.auth import auth_bp
    from app.routes.photos import photos_bp
    from app.routes.chat import chat_bp
    from app.routes.persons import persons_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(photos_bp, url_prefix='/api/photos')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(persons_bp, url_prefix='/api/persons')
    
    with app.app_context():
        db.create_all()
    
    return app
