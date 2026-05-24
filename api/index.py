from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import sqlite3
import os
import itertools

app = Flask(__name__, template_folder='../templates', static_folder='../static')
app.secret_key = 'logicgate_secret_key_2024'
CORS(app)
bcrypt = Bcrypt(app)

# ─── Database Setup ────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'users.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            secret_answer TEXT NOT NULL,
            phone TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ─── Auth Routes ───────────────────────────────────────────
@app.route('/')
def home():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', username=session['user'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    data = request.json
    email    = data.get('email')
    phone    = data.get('phone')
    password = data.get('password')

    if not email or not phone or not password:
        return jsonify({'success': False, 'message': 'All fields are required'})

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT username, password, phone FROM users WHERE email = ?', (email,))
    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({'success': False, 'message': 'Email not found'})
    if user[2] != phone:
        return jsonify({'success': False, 'message': 'Phone number does not match'})
    if not bcrypt.check_password_hash(user[1], password):
        return jsonify({'success': False, 'message': 'Incorrect password'})

    session['user'] = user[0]
    return jsonify({'success': True, 'username': user[0]})

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('register.html')
    data = request.json
    username      = data.get('username')
    email         = data.get('email')
    phone         = data.get('phone')
    password      = data.get('password')
    secret_answer = data.get('secret_answer')

    if not all([username, email, phone, password, secret_answer]):
        return jsonify({'success': False, 'message': 'All fields are required'})

    hashed_pw  = bcrypt.generate_password_hash(password).decode('utf-8')
    hashed_ans = bcrypt.generate_password_hash(secret_answer.lower()).decode('utf-8')

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            INSERT INTO users (username, email, password, secret_answer, phone)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, email, hashed_pw, hashed_ans, phone))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email or username already exists'})

@app.route('/forgot', methods=['GET', 'POST'])
def forgot():
    if request.method == 'GET':
        return render_template('forgot.html')
    data = request.json
    email         = data.get('email')
    secret_answer = data.get('secret_answer')
    new_password  = data.get('new_password')

    if not all([email, secret_answer, new_password]):
        return jsonify({'success': False, 'message': 'All fields are required'})

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT secret_answer FROM users WHERE email = ?', (email,))
    user = c.fetchone()

    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'Email not found'})

    if not bcrypt.check_password_hash(user[0], secret_answer.lower()):
        conn.close()
        return jsonify({'success': False, 'message': 'Incorrect answer to secret question'})

    hashed_pw = bcrypt.generate_password_hash(new_password).decode('utf-8')
    c.execute('UPDATE users SET password = ? WHERE email = ?', (hashed_pw, email))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ─── Gate Logic ────────────────────────────────────────────
def evaluate_gate(gate, a, b=None):
    gate = gate.upper()
    if gate == "NOT":    return int(not a)
    elif gate == "AND":  return int(a and b)
    elif gate == "OR":   return int(a or b)
    elif gate == "NAND": return int(not (a and b))
    elif gate == "NOR":  return int(not (a or b))
    elif gate == "XOR":  return int(a ^ b)
    elif gate == "XNOR": return int(not (a ^ b))
    return None

def generate_truth_table(gate):
    gate = gate.upper()
    table = []
    if gate == "NOT":
        for a in [0, 1]:
            table.append({"A": a, "Output": evaluate_gate(gate, a)})
    else:
        for a, b in itertools.product([0, 1], repeat=2):
            table.append({"A": a, "B": b, "Output": evaluate_gate(gate, a, b)})
    return table

@app.route('/evaluate', methods=['POST'])
def evaluate():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data   = request.json
    gate   = data.get('gate')
    a      = int(data.get('a', 0))
    b      = int(data.get('b', 0))
    result = evaluate_gate(gate, a) if gate.upper() == 'NOT' else evaluate_gate(gate, a, b)
    return jsonify({
        'gate':        gate.upper(),
        'inputs':      {'A': a, 'B': b},
        'output':      result,
        'truth_table': generate_truth_table(gate)
    })

if __name__ == '__main__':
    app.run(debug=True)