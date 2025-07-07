# Sistema de Controle de Estoque de Rastreadores
## Guia Rápido de Instalação

Este guia fornece instruções simplificadas para instalação e configuração inicial do Sistema de Controle de Estoque de Rastreadores. Para documentação completa, consulte o arquivo `DOCUMENTACAO_COMPLETA.md`.

### Requisitos

- Python 3.8 ou superior
- 2GB de RAM (mínimo)
- 1GB de espaço em disco
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

### Instalação Rápida

1. **Clone ou extraia os arquivos do sistema para o diretório desejado:**

```bash
mkdir -p /opt/rastreadores
cd /opt/rastreadores
# Extraia os arquivos aqui
```

2. **Crie e ative um ambiente virtual Python:**

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate.bat  # Windows
```

3. **Instale as dependências:**

```bash
pip install -r requirements.txt
```

4. **Execute a aplicação:**

```bash
python src/main.py
```

5. **Acesse o sistema:**

Abra seu navegador e acesse `http://localhost:5000`

### Usuário Inicial

Na primeira execução um usuário administrador é criado automaticamente. Altere a senha logo após o login.


### Configuração para Produção

Para ambientes de produção, recomenda-se:

1. **Definir a chave secreta:**

Configure a variável de ambiente `SECRET_KEY` com um valor seguro antes de iniciar a aplicação. Em desenvolvimento um valor padrão é utilizado, mas em produção esta variável deve ser definida.

2. **Configurar HTTPS:**

Utilize um servidor web como Nginx ou Apache como proxy reverso com SSL configurado.

3. **Configurar backups automáticos:**

Crie um script cron para backup diário do arquivo de banco de dados:
```bash
0 2 * * * cp /opt/rastreadores/rastreadores.db /backup/rastreadores_$(date +\%Y\%m\%d).db
```

### Automações

O sistema inclui automações para:

- **Backup e reset mensal:** Executado automaticamente no primeiro dia de cada mês
- **Salvamento diário de histórico de configuração:** Configurado para executar às 18:30

### Suporte

Para suporte técnico ou dúvidas, consulte a documentação completa ou entre em contato com o administrador do sistema.

---

*Guia Rápido - Versão 1.0 - 03 de Julho de 2025*

