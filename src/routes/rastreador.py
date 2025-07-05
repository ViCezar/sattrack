from flask import Blueprint, request, jsonify, session
from src.models.user import db
from src.models.rastreador import (
    Movimentacao, HistoricoMovimentacao, Colaborador, 
    ConfiguracaoDiaria, HistoricoConfig, Estoque
)
from datetime import datetime, date
from sqlalchemy import func, desc
from collections import defaultdict

rastreador_bp = Blueprint('rastreador', __name__)

def require_auth():
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    return None

def require_admin():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    if session.get('tipo_acesso') != 'administrador':
        return jsonify({'error': 'Acesso negado. Apenas administradores podem realizar esta ação.'}), 403
    return None

# Constantes para os novos campos
MODELOS_RASTREADOR = ['ITR 120', 'ITR 155', 'TRX', 'Getrak']
OPERADORAS = ['Tim', 'Claro', 'Vivo', '4 Operadora', '1NCE']

@rastreador_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    try:
        # Total em estoque
        total_estoque = db.session.query(func.sum(Estoque.quantidade_estoque)).scalar() or 0
        
        # Movimentações do mês atual
        hoje = date.today()
        primeiro_dia_mes = hoje.replace(day=1)
        movimentacoes_mes = Movimentacao.query.filter(
            Movimentacao.data >= primeiro_dia_mes,
            Movimentacao.data <= hoje
        ).count()
        
        # Total de rastreadores configurados no mês
        rastreadores_configurados = db.session.query(func.sum(ConfiguracaoDiaria.quantidade)).filter(
            ConfiguracaoDiaria.data >= primeiro_dia_mes,
            ConfiguracaoDiaria.data <= hoje
        ).scalar() or 0
        
        # Últimas movimentações
        ultimas_movimentacoes = Movimentacao.query.order_by(
            desc(Movimentacao.data_criacao)
        ).limit(5).all()
        
        return jsonify({
            'total_estoque': total_estoque,
            'movimentacoes_mes': movimentacoes_mes,
            'rastreadores_configurados': rastreadores_configurados,
            'ultimas_movimentacoes': [mov.to_dict() for mov in ultimas_movimentacoes]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rastreador_bp.route('/movimentacoes', methods=['GET'])
def get_movimentacoes():
    admin_error = require_admin()
    if admin_error:
        return admin_error
    
    try:
        movimentacoes = Movimentacao.query.order_by(desc(Movimentacao.data_criacao)).all()
        return jsonify([mov.to_dict() for mov in movimentacoes]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rastreador_bp.route('/movimentacoes/registrar', methods=['POST'])
def registrar_movimentacao():
    admin_error = require_admin()
    if admin_error:
        return admin_error
    
    try:
        data = request.get_json()
        
        # Validar campos obrigatórios
        campos_obrigatorios = ['data', 'modelo_rastreador', 'operadora', 'quantidade', 'tipo', 'solicitante']
        for campo in campos_obrigatorios:
            if not data.get(campo):
                return jsonify({'error': f'Campo {campo} é obrigatório'}), 400
        
        # Validar modelo e operadora
        if data['modelo_rastreador'] not in MODELOS_RASTREADOR:
            return jsonify({'error': 'Modelo de rastreador inválido'}), 400
        
        if data['operadora'] not in OPERADORAS:
            return jsonify({'error': 'Operadora inválida'}), 400
        
        # Converter data
        data_movimentacao = datetime.strptime(data['data'], '%Y-%m-%d').date()
        
        # Criar movimentação
        movimentacao = Movimentacao(
            data=data_movimentacao,
            modelo_rastreador=data['modelo_rastreador'],
            operadora=data['operadora'],
            quantidade=int(data['quantidade']),
            tipo=data['tipo'],
            solicitante=data['solicitante'],
            operador=session['username']  # Preencher automaticamente com o usuário logado
        )
        
        db.session.add(movimentacao)
        
        # Atualizar estoque
        estoque = Estoque.query.filter_by(
            modelo_rastreador=data['modelo_rastreador'],
            operadora=data['operadora']
        ).first()
        
        if not estoque:
            estoque = Estoque(
                modelo_rastreador=data['modelo_rastreador'],
                operadora=data['operadora'],
                quantidade_estoque=0
            )
            db.session.add(estoque)
        
        if data['tipo'] == 'Entrada':
            estoque.quantidade_estoque += int(data['quantidade'])
        else:  # Saída
            estoque.quantidade_estoque -= int(data['quantidade'])
            if estoque.quantidade_estoque < 0:
                return jsonify({'error': 'Quantidade em estoque insuficiente'}), 400
        
        estoque.data_ultima_alteracao = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Movimentação registrada com sucesso'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rastreador_bp.route('/colaboradores', methods=['GET'])
def get_colaboradores():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    try:
        colaboradores = Colaborador.query.filter_by(ativo=True).all()
        return jsonify([col.to_dict() for col in colaboradores]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rastreador_bp.route('/configuracao/registrar', methods=['POST'])
def registrar_configuracao():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    try:
        data = request.get_json()
        quantidade = int(data.get('quantidade', 0))
        
        if quantidade <= 0:
            return jsonify({'error': 'Quantidade deve ser maior que zero'}), 400
        
        # Buscar colaborador pelo nome do usuário logado
        colaborador = Colaborador.query.filter_by(nome=session['username']).first()
        if not colaborador:
            return jsonify({'error': 'Colaborador não encontrado'}), 404
        
        hoje = date.today()
        
        # Verificar se já existe configuração para hoje
        config_existente = ConfiguracaoDiaria.query.filter_by(
            colaborador_id=colaborador.id,
            data=hoje
        ).first()
        
        if config_existente:
            # Atualizar quantidade existente
            config_existente.quantidade += quantidade
        else:
            # Criar nova configuração
            config = ConfiguracaoDiaria(
                colaborador_id=colaborador.id,
                data=hoje,
                quantidade=quantidade
            )
            db.session.add(config)
        
        db.session.commit()
        
        return jsonify({'message': 'Configuração registrada com sucesso'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rastreador_bp.route('/historico-config', methods=['GET'])
def get_historico_config():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    try:
        # Buscar configurações diárias do mês atual
        hoje = date.today()
        primeiro_dia_mes = hoje.replace(day=1)
        
        configuracoes = ConfiguracaoDiaria.query.filter(
            ConfiguracaoDiaria.data >= primeiro_dia_mes,
            ConfiguracaoDiaria.data <= hoje
        ).order_by(desc(ConfiguracaoDiaria.data)).all()
        
        # Organizar por data
        historico_por_data = defaultdict(list)
        for config in configuracoes:
            data_str = config.data.strftime('%d/%m/%Y')
            historico_por_data[data_str].append({
                'nome_colaborador': config.colaborador.nome,
                'quantidade_dia': config.quantidade,
                'quantidade_total_mes': config.colaborador.get_quantidade_total_mes()
            })
        
        # Converter para lista ordenada
        resultado = []
        for data_str in sorted(historico_por_data.keys(), reverse=True):
            resultado.append({
                'data': data_str,
                'colaboradores': historico_por_data[data_str]
            })
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rastreador_bp.route('/historico-config/salvar-diario', methods=['POST'])
def salvar_historico_diario():
    admin_error = require_admin()
    if admin_error:
        return admin_error
    
    try:
        hoje = date.today()
        mes_ano = hoje.strftime('%m/%Y')
        
        # Buscar todas as configurações de hoje
        configuracoes_hoje = ConfiguracaoDiaria.query.filter_by(data=hoje).all()
        
        for config in configuracoes_hoje:
            # Verificar se já existe no histórico
            historico_existente = HistoricoConfig.query.filter_by(
                data=hoje,
                nome_colaborador=config.colaborador.nome
            ).first()
            
            if not historico_existente:
                historico = HistoricoConfig(
                    data=hoje,
                    nome_colaborador=config.colaborador.nome,
                    quantidade_dia_atual=config.quantidade,
                    quantidade_total_mes=config.colaborador.get_quantidade_total_mes(),
                    mes_ano=mes_ano
                )
                db.session.add(historico)
        
        db.session.commit()
        
        return jsonify({'message': 'Histórico diário salvo com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rastreador_bp.route('/estoque', methods=['GET'])
def get_estoque():
    auth_error = require_auth()
    if auth_error:
        return auth_error

    try:
        modelo = request.args.get('modelo', 'Todos')
        operadora = request.args.get('operadora', 'Todos')

        query = Estoque.query

        if modelo and modelo != 'Todos':
            query = query.filter_by(modelo_rastreador=modelo)

        if operadora and operadora != 'Todos':
            query = query.filter_by(operadora=operadora)

        estoque = query.all()
        total = sum(item.quantidade_estoque for item in estoque)

        return jsonify({
            'estoque': [item.to_dict() for item in estoque],
            'total': total
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rastreador_bp.route('/estoque/resumo', methods=['GET'])
def get_resumo_estoque():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    try:
        filtro = request.args.get('filtro', 'modelo')
        
        if filtro == 'modelo':
            resultado = db.session.query(
                Estoque.modelo_rastreador,
                func.sum(Estoque.quantidade_estoque).label('total')
            ).group_by(Estoque.modelo_rastreador).all()
            
            return jsonify([{
                'modelo_rastreador': item[0],
                'total': item[1]
            } for item in resultado]), 200
        
        else:  # operadora
            resultado = db.session.query(
                Estoque.operadora,
                func.sum(Estoque.quantidade_estoque).label('total')
            ).group_by(Estoque.operadora).all()
            
            return jsonify([{
                'operadora': item[0],
                'total': item[1]
            } for item in resultado]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rastreador_bp.route('/opcoes', methods=['GET'])
def get_opcoes():
    """Retorna as opções disponíveis para modelos e operadoras"""
    return jsonify({
        'modelos': MODELOS_RASTREADOR,
        'operadoras': OPERADORAS
    }), 200

