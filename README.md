# Sistema de Controle de Estoque de Rastreadores

Sistema web completo para gerenciamento de estoque de dispositivos rastreadores GPS, controle de movimentações e monitoramento de produtividade de configuradores.

## Documentação

Este projeto inclui documentação detalhada nos seguintes arquivos:

- [Documentação Completa](./DOCUMENTACAO_COMPLETA.md) - Documentação técnica detalhada do sistema
- [Guia Rápido de Instalação](./GUIA_RAPIDO.md) - Instruções simplificadas para instalação e configuração

## Estrutura do Projeto

```
rastreadores_app/
├── src/                      # Código-fonte da aplicação
│   ├── models/               # Modelos de dados
│   ├── routes/               # Rotas da API
│   ├── static/               # Arquivos estáticos (HTML, CSS, JS)
│   └── main.py               # Arquivo principal da aplicação
├── instance/                 # Banco de dados SQLite
├── requirements.txt          # Dependências do projeto
├── DOCUMENTACAO_COMPLETA.md  # Documentação técnica detalhada
└── GUIA_RAPIDO.md            # Guia rápido de instalação
```

## Funcionalidades Principais

- Registro de movimentações de entrada e saída de rastreadores
- Histórico completo de movimentações com backup mensal automático
- Controle de produtividade de colaboradores configuradores
- Histórico de configuração com organização por data
- Gestão de estoque com filtros por modelo e operadora
- Sistema de autenticação com dois níveis de acesso (Administrador e Configurador)
- Interface responsiva com design moderno em tons de verde

## Credenciais de Acesso

**Administrador Principal:**
- Usuário: Vinícius Cezar
- Senha: Sat@1655

## Instalação Rápida

Consulte o [Guia Rápido de Instalação](./GUIA_RAPIDO.md) para instruções detalhadas.

```bash
# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate.bat  # Windows

# Instalar dependências
pip install -r requirements.txt

# Executar a aplicação
python src/main.py
```

## Licença

Todos os direitos reservados.

---

*Desenvolvido por Manus AI - 03 de Julho de 2025*

