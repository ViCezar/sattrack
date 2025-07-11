from src.models.user import db
from datetime import datetime, date
from zoneinfo import ZoneInfo
from sqlalchemy import func

BR_TZ = ZoneInfo("America/Sao_Paulo")

def now_brasilia():
    return datetime.now(BR_TZ)

def today_brasilia():
    return now_brasilia().date()

class Movimentacao(db.Model):
    __tablename__ = 'movimentacoes'
    
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.Date, nullable=False, default=today_brasilia)
    modelo_rastreador = db.Column(db.String(50), nullable=False)
    operadora = db.Column(db.String(50), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    tipo = db.Column(db.String(10), nullable=False)  # 'Entrada' ou 'Saída'
    solicitante = db.Column(db.String(100), nullable=False)
    operador = db.Column(db.String(100), nullable=False)
    data_criacao = db.Column(db.DateTime, default=now_brasilia)
    
    def to_dict(self):
        return {
            'id': self.id,
            'data': self.data.strftime('%d/%m/%Y'),
            'modelo_rastreador': self.modelo_rastreador,
            'operadora': self.operadora,
            'quantidade': self.quantidade,
            'tipo': self.tipo,
            'solicitante': self.solicitante,
            'operador': self.operador,
            'data_criacao': self.data_criacao.astimezone(BR_TZ).strftime('%d/%m/%Y %H:%M')
        }

class HistoricoMovimentacao(db.Model):
    __tablename__ = 'historico_movimentacoes'
    
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.Date, nullable=False)
    modelo_rastreador = db.Column(db.String(50), nullable=False)
    operadora = db.Column(db.String(50), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    tipo = db.Column(db.String(10), nullable=False)
    solicitante = db.Column(db.String(100), nullable=False)
    operador = db.Column(db.String(100), nullable=False)
    mes_ano = db.Column(db.String(7), nullable=False)  # formato MM/YYYY
    data_backup = db.Column(db.DateTime, default=now_brasilia)

    def to_dict(self):
        return {
            'id': self.id,
            'data': self.data.strftime('%d/%m/%Y'),
            'hora_backup': self.data_backup.astimezone(BR_TZ).strftime('%H:%M'),
            'modelo_rastreador': self.modelo_rastreador,
            'operadora': self.operadora,
            'quantidade': self.quantidade,
            'tipo': self.tipo,
            'solicitante': self.solicitante,
            'operador': self.operador,
            'mes_ano': self.mes_ano
        }

class Colaborador(db.Model):
    __tablename__ = 'colaboradores'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    ativo = db.Column(db.Boolean, default=True)
    data_criacao = db.Column(db.DateTime, default=now_brasilia)
    
    def get_quantidade_dia_atual(self):
        hoje = date.today()
        config = ConfiguracaoDiaria.query.filter_by(
            colaborador_id=self.id,
            data=hoje
        ).first()
        return config.quantidade if config else 0
    
    def get_quantidade_total_mes(self):
        hoje = date.today()
        mes_atual = hoje.replace(day=1)
        
        total = db.session.query(func.sum(ConfiguracaoDiaria.quantidade)).filter(
            ConfiguracaoDiaria.colaborador_id == self.id,
            ConfiguracaoDiaria.data >= mes_atual,
            ConfiguracaoDiaria.data <= hoje
        ).scalar()
        
        return total if total else 0
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'quantidade_atual': 0,  # Não usado mais
            'quantidade_dia_atual': self.get_quantidade_dia_atual(),
            'quantidade_total_mes': self.get_quantidade_total_mes(),
            'ativo': self.ativo
        }

class ConfiguracaoDiaria(db.Model):
    __tablename__ = 'configuracao_diaria'
    
    id = db.Column(db.Integer, primary_key=True)
    colaborador_id = db.Column(db.Integer, db.ForeignKey('colaboradores.id'), nullable=False)
    data = db.Column(db.Date, nullable=False, default=today_brasilia)
    quantidade = db.Column(db.Integer, nullable=False)
    data_criacao = db.Column(db.DateTime, default=now_brasilia)
    
    colaborador = db.relationship('Colaborador', backref='configuracoes_diarias')
    
    def to_dict(self):
        return {
            'id': self.id,
            'colaborador_id': self.colaborador_id,
            'nome_colaborador': self.colaborador.nome,
            'data': self.data.strftime('%d/%m/%Y'),
            'quantidade': self.quantidade,
            'quantidade_total_mes': self.colaborador.get_quantidade_total_mes()
        }

class HistoricoConfig(db.Model):
    __tablename__ = 'historico_config'
    
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.Date, nullable=False)
    nome_colaborador = db.Column(db.String(100), nullable=False)
    quantidade_dia_atual = db.Column(db.Integer, nullable=False)
    quantidade_total_mes = db.Column(db.Integer, nullable=False)
    mes_ano = db.Column(db.String(7), nullable=False)  # formato MM/YYYY
    data_backup = db.Column(db.DateTime, default=now_brasilia)
    
    def to_dict(self):
        return {
            'id': self.id,
            'data': self.data.strftime('%d/%m/%Y'),
            'nome_colaborador': self.nome_colaborador,
            'quantidade_dia_atual': self.quantidade_dia_atual,
            'quantidade_total_mes': self.quantidade_total_mes,
            'mes_ano': self.mes_ano
        }

class Estoque(db.Model):
    __tablename__ = 'estoque'
    
    id = db.Column(db.Integer, primary_key=True)
    modelo_rastreador = db.Column(db.String(50), nullable=False)
    operadora = db.Column(db.String(50), nullable=False)
    quantidade_estoque = db.Column(db.Integer, nullable=False, default=0)
    data_ultima_alteracao = db.Column(db.DateTime, default=now_brasilia)
    
    __table_args__ = (db.UniqueConstraint('modelo_rastreador', 'operadora'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'modelo_rastreador': self.modelo_rastreador,
            'operadora': self.operadora,
            'quantidade_estoque': self.quantidade_estoque,
            'data_ultima_alteracao': self.data_ultima_alteracao.astimezone(BR_TZ).strftime('%d/%m/%Y %H:%M')
        }

