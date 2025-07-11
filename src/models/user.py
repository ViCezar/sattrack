from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from zoneinfo import ZoneInfo

BR_TZ = ZoneInfo("America/Sao_Paulo")

def now_brasilia():
    return datetime.now(BR_TZ)

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    tipo_acesso = db.Column(db.String(20), nullable=False, default='configurador')  # 'configurador' ou 'administrador'
    ativo = db.Column(db.Boolean, default=True)
    data_criacao = db.Column(db.DateTime, default=now_brasilia)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'tipo_acesso': self.tipo_acesso,
            'ativo': self.ativo,
            'data_criacao': self.data_criacao.astimezone(BR_TZ).strftime('%d/%m/%Y %H:%M')
        }

