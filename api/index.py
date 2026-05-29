from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import sqlite3
import os
import itertools
import random
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__,
            template_folder=os.path.join(BASE_DIR, 'templates'),
            static_folder=os.path.join(BASE_DIR, 'static'))

app.secret_key = 'logicgate_secret_key_2024_xyz'
app.config['SESSION_COOKIE_SECURE']   = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True

CORS(app)
bcrypt = Bcrypt(app)

# DB path
if os.environ.get('RENDER'):
    DB_PATH = '/tmp/users.db'
else:
    DB_PATH = os.path.join(BASE_DIR, 'users.db')

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT UNIQUE NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password      TEXT NOT NULL,
            secret_answer TEXT NOT NULL,
            phone         TEXT NOT NULL
        )''')
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB init error: {e}")

@app.before_request
def before_request():
    init_db()

# ── Auth ───────────────────────────────────────────────────
@app.route('/')
def home():
    if 'user' not in session:
        return redirect('/login')
    return render_template('index.html', username=session['user'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    data     = request.json
    email    = data.get('email')
    password = data.get('password')
    if not all([email, password]):
        return jsonify({'success': False, 'message': 'All fields are required'})
    try:
        conn = sqlite3.connect(DB_PATH)
        c    = conn.cursor()
        c.execute('SELECT username, password FROM users WHERE email = ?', (email,))
        user = c.fetchone()
        conn.close()
        if not user:
            return jsonify({'success': False, 'message': 'Email not found'})
        if not bcrypt.check_password_hash(user[1], password):
            return jsonify({'success': False, 'message': 'Incorrect password'})
        session['user'] = user[0]
        return jsonify({'success': True, 'username': user[0]})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('register.html')
    data          = request.json
    username      = data.get('username')
    email         = data.get('email')
    phone         = data.get('phone')
    password      = data.get('password')
    secret_answer = data.get('secret_answer')
    if not all([username, email, phone, password, secret_answer]):
        return jsonify({'success': False, 'message': 'All fields are required'})
    if len(password) < 8:
        return jsonify({'success': False, 'message': 'Password must be at least 8 characters'})
    if not re.search(r'[A-Z]', password):
        return jsonify({'success': False, 'message': 'Password must contain at least one uppercase letter'})
    if not re.search(r'[a-z]', password):
        return jsonify({'success': False, 'message': 'Password must contain at least one lowercase letter'})
    if not re.search(r'[0-9]', password):
        return jsonify({'success': False, 'message': 'Password must contain at least one number'})
    if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>/?\\|`~]', password):
        return jsonify({'success': False, 'message': 'Password must contain at least one special character'})
    hashed_pw  = bcrypt.generate_password_hash(password).decode('utf-8')
    hashed_ans = bcrypt.generate_password_hash(secret_answer.lower()).decode('utf-8')
    try:
        conn = sqlite3.connect(DB_PATH)
        c    = conn.cursor()
        c.execute('''INSERT INTO users (username, email, password, secret_answer, phone)
                     VALUES (?, ?, ?, ?, ?)''',
                  (username, email, hashed_pw, hashed_ans, phone))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email or username already exists'})

@app.route('/forgot', methods=['GET', 'POST'])
def forgot():
    if request.method == 'GET':
        return render_template('forgot.html')
    data          = request.json
    email         = data.get('email')
    secret_answer = data.get('secret_answer')
    new_password  = data.get('new_password')
    if not all([email, secret_answer, new_password]):
        return jsonify({'success': False, 'message': 'All fields are required'})
    if len(new_password) < 8:
        return jsonify({'success': False, 'message': 'Password must be at least 8 characters'})
    if not re.search(r'[A-Z]', new_password):
        return jsonify({'success': False, 'message': 'Password must contain at least one uppercase letter'})
    if not re.search(r'[a-z]', new_password):
        return jsonify({'success': False, 'message': 'Password must contain at least one lowercase letter'})
    if not re.search(r'[0-9]', new_password):
        return jsonify({'success': False, 'message': 'Password must contain at least one number'})
    if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>/?\\|`~]', new_password):
        return jsonify({'success': False, 'message': 'Password must contain at least one special character'})
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()
    c.execute('SELECT secret_answer FROM users WHERE email = ?', (email,))
    user = c.fetchone()
    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'Email not found'})
    if not bcrypt.check_password_hash(user[0], secret_answer.lower()):
        conn.close()
        return jsonify({'success': False, 'message': 'Incorrect answer'})
    hashed_pw = bcrypt.generate_password_hash(new_password).decode('utf-8')
    c.execute('UPDATE users SET password = ? WHERE email = ?', (hashed_pw, email))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

# ── Gate Logic ─────────────────────────────────────────────
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
    gate  = gate.upper()
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
    return jsonify({'gate': gate.upper(), 'inputs': {'A': a, 'B': b},
                    'output': result, 'truth_table': generate_truth_table(gate)})

# ── Number Converter ───────────────────────────────────────
@app.route('/convert', methods=['POST'])
def convert():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data      = request.json
    number    = data.get('number', '').strip()
    from_base = data.get('from_base')
    try:
        decimal_val = int(number, int(from_base))
        binary  = bin(decimal_val)[2:]
        octal   = oct(decimal_val)[2:]
        hexa    = hex(decimal_val)[2:].upper()
        decimal = str(decimal_val)
        steps   = {}
        hex_map = {10:'A',11:'B',12:'C',13:'D',14:'E',15:'F'}
        if from_base != '2':
            b_steps = []
            n = decimal_val
            while n > 0:
                b_steps.append({'dividend': n, 'quotient': n//2, 'remainder': n%2})
                n = n // 2
            steps['to_binary'] = b_steps[::-1]
        if from_base != '8':
            o_steps = []
            n = decimal_val
            while n > 0:
                o_steps.append({'dividend': n, 'quotient': n//8, 'remainder': n%8})
                n = n // 8
            steps['to_octal'] = o_steps[::-1]
        if from_base != '16':
            h_steps = []
            n = decimal_val
            while n > 0:
                rem = n % 16
                h_steps.append({'dividend': n, 'quotient': n//16,
                                 'remainder': hex_map.get(rem, str(rem))})
                n = n // 16
            steps['to_hex'] = h_steps[::-1]
        return jsonify({'success': True, 'input': number.upper(), 'from_base': from_base,
                        'results': {'binary': binary, 'octal': octal,
                                    'decimal': decimal, 'hex': hexa}, 'steps': steps})
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid number for the selected base'})

# ── K-Map ──────────────────────────────────────────────────
@app.route('/kmap', methods=['POST'])
def kmap():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data       = request.json
    num_vars   = int(data.get('num_vars', 2))
    minterms   = data.get('minterms', [])
    dont_cares = data.get('dont_cares', [])
    try:
        total    = 2 ** num_vars
        all_ones = set(minterms) | set(dont_cares)
        def to_bin(n, bits): return format(n, f'0{bits}b')
        def combine(a, b):
            diff = [(i,ca,cb) for i,(ca,cb) in enumerate(zip(a,b)) if ca!=cb]
            if len(diff)==1 and '-' not in a and '-' not in b:
                return a[:diff[0][0]] + '-' + a[diff[0][0]+1:]
            return None
        prime_implicants = []
        current = {to_bin(m, num_vars): {m} for m in range(total) if m in all_ones}
        for _ in range(num_vars):
            next_round = {}
            used = set()
            terms = list(current.keys())
            for i in range(len(terms)):
                for j in range(i+1, len(terms)):
                    combined = combine(terms[i], terms[j])
                    if combined:
                        new_covered = current[terms[i]] | current[terms[j]]
                        if all(m in all_ones for m in new_covered):
                            next_round[combined] = new_covered
                            used.add(terms[i])
                            used.add(terms[j])
            for t in terms:
                if t not in used:
                    covered = current[t]
                    if any(m in minterms for m in covered):
                        prime_implicants.append((t, covered))
            current = next_round
            if not next_round: break
        vars_map = ['A','B','C','D'][:num_vars]
        def implicant_to_expr(imp):
            terms = []
            for i, ch in enumerate(imp):
                if ch=='1':   terms.append(vars_map[i])
                elif ch=='0': terms.append(f"NOT {vars_map[i]}")
            return ' AND '.join(terms) if terms else '1'
        if not minterms:             simplified = '0'
        elif len(minterms) == total: simplified = '1'
        else:
            expr_parts = [implicant_to_expr(pi[0]) for pi in prime_implicants]
            simplified = ' OR '.join(
                f"({e})" if ' AND ' in e else e for e in expr_parts
            ) if expr_parts else '0'
        table = []
        for i in range(total):
            row = {}
            binary = to_bin(i, num_vars)
            for j, v in enumerate(vars_map): row[v] = int(binary[j])
            row['Output'] = 1 if i in minterms else ('X' if i in dont_cares else 0)
            table.append(row)
        return jsonify({'success': True, 'simplified': simplified,
                        'prime_implicants': [{'pattern': pi[0], 'covers': list(pi[1])}
                                             for pi in prime_implicants],
                        'truth_table': table, 'num_vars': num_vars})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ── Code Converter ─────────────────────────────────────────
@app.route('/code-convert', methods=['POST'])
def code_convert():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    text = data.get('text', '')
    mode = data.get('mode', 'text-to-binary')
    try:
        if mode == 'text-to-binary':
            result = [{'char': ch, 'ascii': ord(ch),
                       'binary': format(ord(ch),'08b'),
                       'hex': format(ord(ch),'02X')} for ch in text]
            return jsonify({'success': True, 'mode': mode, 'result': result})
        elif mode == 'binary-to-text':
            chunks = text.strip().split()
            result = []; output_text = ''
            for chunk in chunks:
                if len(chunk)==8 and all(c in '01' for c in chunk):
                    ascii_val = int(chunk,2); ch = chr(ascii_val); output_text += ch
                    result.append({'binary': chunk, 'ascii': ascii_val,
                                   'char': ch, 'hex': format(ascii_val,'02X')})
                else:
                    return jsonify({'success': False,
                                    'message': f'Invalid binary: {chunk}'})
            return jsonify({'success': True, 'mode': mode,
                            'result': result, 'output_text': output_text})
        elif mode == 'text-to-hex':
            result = [{'char': ch, 'ascii': ord(ch),
                       'hex': format(ord(ch),'02X'),
                       'binary': format(ord(ch),'08b')} for ch in text]
            return jsonify({'success': True, 'mode': mode, 'result': result})
        elif mode == 'hex-to-text':
            chunks = text.strip().split()
            result = []; output_text = ''
            for chunk in chunks:
                ascii_val = int(chunk,16); ch = chr(ascii_val); output_text += ch
                result.append({'hex': chunk.upper(), 'ascii': ascii_val,
                               'char': ch, 'binary': format(ascii_val,'08b')})
            return jsonify({'success': True, 'mode': mode,
                            'result': result, 'output_text': output_text})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

# ── Quiz ───────────────────────────────────────────────────
@app.route('/quiz', methods=['POST'])
def quiz():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify({'success': True})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)