from flask import Blueprint, request, jsonify, session
from src.models.user import db, User
from src.models.rastreador import Colaborador

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username e password são obrigatórios'}), 400
        
        user = User.query.filter_by(username=username, ativo=True).first()
        
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['tipo_acesso'] = user.tipo_acesso
            
            return jsonify({
                'message': 'Login realizado com sucesso',
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Credenciais inválidas'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout realizado com sucesso'}), 200

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    return jsonify({'user': user.to_dict()}), 200

@auth_bp.route('/users', methods=['GET'])
def get_users():
    if 'user_id' not in session or session.get('tipo_acesso') != 'administrador':
        return jsonify({'error': 'Acesso negado'}), 403
    
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@auth_bp.route('/users', methods=['POST'])
def create_user():
    if 'user_id' not in session or session.get('tipo_acesso') != 'administrador':
        return jsonify({'error': 'Acesso negado'}), 403
    
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        tipo_acesso = data.get('tipo_acesso', 'configurador')
        
        if not username or not password:
            return jsonify({'error': 'Username e password são obrigatórios'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username já existe'}), 400
        
        user = User(username=username, tipo_acesso=tipo_acesso)
        user.set_password(password)
        
        db.session.add(user)
        
        # Se for configurador, criar também um colaborador
        if tipo_acesso == 'configurador':
            colaborador = Colaborador(nome=username)
            db.session.add(colaborador)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    if 'user_id' not in session or session.get('tipo_acesso') != 'administrador':
        return jsonify({'error': 'Acesso negado'}), 403
    
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json()

        if 'username' in data:
            user.username = data['username']
        if user.tipo_acesso == 'administrador' and session.get('username') != 'Vinícius Cezar' and user.username != session.get('username'):
            # Administradores comuns não podem inativar, alterar tipo de acesso ou senha de outros administradores
            if (
                ('ativo' in data and data['ativo'] is False)
                or ('tipo_acesso' in data and data['tipo_acesso'] != 'administrador')
                or ('password' in data and data['password'])
            ):
                return jsonify({'error': 'Você não possui permissão para alterar outros administradores!'}), 403
        if 'tipo_acesso' in data:
            user.tipo_acesso = data['tipo_acesso']
        if 'ativo' in data:
            user.ativo = data['ativo']
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário atualizado com sucesso',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    if 'user_id' not in session or session.get('tipo_acesso') != 'administrador':
        return jsonify({'error': 'Acesso negado'}), 403
    
    try:
        user = User.query.get_or_404(user_id)

        # Administradores comuns não podem excluir outros administradores
        if user.tipo_acesso == 'administrador' and session.get('username') != 'Vinícius Cezar' and user.username != session.get('username'):
            return jsonify({'error': 'Você não possui permissão para excluir outros administradores!'}), 403

        # If the user is a configurador, inactivate the related Colaborador
        if user.tipo_acesso == 'configurador':
            colaborador = Colaborador.query.filter_by(nome=user.username).first()
            if colaborador:
                colaborador.ativo = False

        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'Usuário excluído com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

