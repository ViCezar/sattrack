from waitress import serve
from main import create_app  

app = create_app()
serve(app, host="127.0.0.1", port=5000)
