from flask import Flask
import webbrowser

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

if __name__ == "__main__":
    app.run(threaded=True)
    webbrowser.open("http://localhost:5000")
