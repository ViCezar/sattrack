import os
import sys
# DON'T CHANGE: Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db, User
from src.models.rastreador import Colaborador
from src.routes.rastreador import (
    rastreador_bp,
    MODELOS_RASTREADOR,
    OPERADORAS
)
from src.routes.auth import auth_bp

def create_app():
    app = Flask(
        __name__,
        static_folder='static',
        static_url_path='',
        instance_relative_config=True,
    )

    # Certificar-se de que a pasta instance existe
    os.makedirs(app.instance_path, exist_ok=True)

    # Configurações
    db_path = os.path.join(app.instance_path, 'rastreadores.db')
    app.config['SECRET_KEY'] = 'sua-chave-secreta-muito-segura-aqui'
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Inicializar extensões
    db.init_app(app)
    CORS(app, supports_credentials=True)
    
    # Registrar blueprints
    app.register_blueprint(rastreador_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    # Rota para servir o frontend
    @app.route('/')
    def serve_frontend():
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.route('/<path:path>')
    def serve_static_files(path):
        return send_from_directory(app.static_folder, path)
    
    # Criar tabelas e dados iniciais
    with app.app_context():
        db.create_all()
        
        # Criar usuário Administrador padrão se não existir
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin', tipo_acesso='Administrador')
            admin.set_password('admin123')
            db.session.add(admin)
            
            db.session.commit()
            print("Usuários padrão criados:")
            print("Admin: admin / admin123")


        # Criar combinações de estoque padrão
        from src.models.rastreador import Estoque
        for modelo in MODELOS_RASTREADOR:
            for operadora in OPERADORAS:
                existente = Estoque.query.filter_by(
                    modelo_rastreador=modelo,
                    operadora=operadora
                ).first()
                if not existente:
                    db.session.add(
                        Estoque(
                            modelo_rastreador=modelo,
                            operadora=operadora,
                            quantidade_estoque=0
                        )
                    )

        db.session.commit()
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)

