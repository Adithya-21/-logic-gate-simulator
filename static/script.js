// ══════════════════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════════════════
function switchTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (btn) btn.classList.add('active');
  if (tab === 'symbols')  renderSymbols('all');
  if (tab === 'signal')   generateSignal();
  if (tab === 'kmap')     renderKmapGrid();
}

// ══════════════════════════════════════════════════════════
// GATE SIMULATOR
// ══════════════════════════════════════════════════════════
let selectedGate = null;
let inputs = { a: 0, b: 0 };

function selectGate(gate, btn) {
  selectedGate = gate;
  document.getElementById('selected-gate-label').textContent = gate;
  document.querySelectorAll('#tab-gates .gate-btn').forEach(b => b.classList.remove('selected'));
  if (btn) btn.classList.add('selected');
  document.getElementById('input-b-group').style.display = gate === 'NOT' ? 'none' : 'block';
  document.getElementById('output-section').style.display      = 'none';
  document.getElementById('truth-table-section').style.display = 'none';
}

function setInput(input, value) {
  inputs[input] = value;
  document.getElementById(`${input}0`).classList.toggle('active', value === 0);
  document.getElementById(`${input}1`).classList.toggle('active', value === 1);
}

async function simulate() {
  if (!selectedGate) { alert('Please select a gate first!'); return; }
  const res  = await fetch('/evaluate', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({gate: selectedGate, a: inputs.a, b: inputs.b})
  });
  const data = await res.json();
  const outDiv = document.getElementById('output-display');
  outDiv.textContent = `${data.gate} Gate → Output = ${data.output}`;
  outDiv.className   = 'output-display ' + (data.output === 1 ? 'high' : 'low');
  document.getElementById('output-section').style.display = 'block';
  drawGate(data.gate, data.inputs.A, data.inputs.B, data.output);
  renderTruthTable(data.truth_table, 'truth-table-container');
  document.getElementById('truth-table-section').style.display = 'block';
}

function renderTruthTable(table, containerId) {
  if (!table || table.length === 0) return;
  const vars = Object.keys(table[0]);
  let html = '<table><thead><tr>';
  vars.forEach(v => html += `<th>${v}</th>`);
  html += '</tr></thead><tbody>';
  table.forEach(row => {
    html += '<tr>';
    vars.forEach(v => {
      const val = row[v];
      const cls = val === 'X' ? 'dontcare' : val === 1 ? 'one' : 'zero';
      html += `<td class="${cls}">${val}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById(containerId).innerHTML = html;
}

function drawGate(gate, a, b, out) {
  const canvas = document.getElementById('gateCanvas');
  const ctx    = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = 150, cy = 80;
  ctx.fillStyle='#0f0f1a'; ctx.strokeStyle='#7ee8fa'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.roundRect(cx-40,cy-30,80,60,8); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#7ee8fa'; ctx.font='bold 16px Segoe UI'; ctx.textAlign='center';
  ctx.fillText(gate, cx, cy+6);
  ctx.strokeStyle=a?'#56f89c':'#f85656';
  ctx.beginPath(); ctx.moveTo(cx-100,cy-15); ctx.lineTo(cx-40,cy-15); ctx.stroke();
  ctx.fillStyle='#aaa'; ctx.font='13px Segoe UI'; ctx.textAlign='right';
  ctx.fillText(`A=${a}`, cx-105, cy-10);
  if (gate !== 'NOT') {
    ctx.strokeStyle=b?'#56f89c':'#f85656';
    ctx.beginPath(); ctx.moveTo(cx-100,cy+15); ctx.lineTo(cx-40,cy+15); ctx.stroke();
    ctx.fillText(`B=${b}`, cx-105, cy+20);
  }
  ctx.strokeStyle=out?'#56f89c':'#f85656';
  ctx.beginPath(); ctx.moveTo(cx+40,cy); ctx.lineTo(cx+100,cy); ctx.stroke();
  ctx.fillStyle='#aaa'; ctx.textAlign='left';
  ctx.fillText(`Out=${out}`, cx+105, cy+5);
}

// ══════════════════════════════════════════════════════════
// NUMBER CONVERTER
// ══════════════════════════════════════════════════════════
let selectedBase = '10';

function selectBase(base, btn) {
  selectedBase = base;
  document.querySelectorAll('.base-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const ph = {'10':'Enter decimal e.g. 255','2':'Enter binary e.g. 11111111','8':'Enter octal e.g. 377','16':'Enter hex e.g. FF'};
  document.getElementById('number-input').placeholder = ph[base];
  document.getElementById('number-input').value = '';
  ['conv-results','conv-steps','bit-visualizer'].forEach(id => document.getElementById(id).style.display='none');
  document.getElementById('conv-error').style.display='none';
}

function setNumber(num) { document.getElementById('number-input').value = num; }

async function convertNumber() {
  const number = document.getElementById('number-input').value.trim();
  const errBox = document.getElementById('conv-error');
  errBox.style.display = 'none';
  if (!number) { errBox.textContent='Please enter a number'; errBox.style.display='block'; return; }
  const res  = await fetch('/convert', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number,from_base:selectedBase})});
  const data = await res.json();
  if (!data.success) { errBox.textContent=data.message; errBox.style.display='block'; return; }
  document.getElementById('res-decimal').textContent = data.results.decimal;
  document.getElementById('res-binary').textContent  = data.results.binary;
  document.getElementById('res-octal').textContent   = data.results.octal;
  document.getElementById('res-hex').textContent     = data.results.hex;
  document.getElementById('conv-results').style.display = 'block';
  document.querySelectorAll('.conv-card').forEach(c => c.classList.remove('active-result'));
  const bm = {'10':'decimal','2':'binary','8':'octal','16':'hex'};
  document.querySelector(`.${bm[selectedBase]}-card`).classList.add('active-result');
  renderSteps(data.steps, data.results);
  renderBitVisualizer(data.results.binary);
}

function renderSteps(steps, results) {
  const container = document.getElementById('steps-container');
  let html = '';
  const defs = [
    {key:'to_binary',title:'→ Binary (Base 2)', result:results.binary, color:'#7ee8fa',div:2},
    {key:'to_octal', title:'→ Octal (Base 8)',  result:results.octal,  color:'#56f89c',div:8},
    {key:'to_hex',   title:'→ Hex (Base 16)',   result:results.hex,    color:'#f8c956',div:16},
  ];
  defs.forEach(def => {
    if (!steps[def.key]) return;
    html += `<div class="step-block">
      <div class="step-title" style="color:${def.color}">${def.title}</div>
      <div class="step-desc">Divide by ${def.div}, collect remainders bottom-up</div>
      <div class="step-table-wrap"><table class="step-table">
        <thead><tr><th>Dividend</th><th>Quotient</th><th>Remainder</th></tr></thead><tbody>`;
    steps[def.key].forEach((row,i) => {
      const isLast = i === steps[def.key].length-1;
      html += `<tr ${isLast?'style="background:#ffffff08"':''}><td>${row.dividend}</td><td>${row.quotient}</td><td style="color:${def.color};font-weight:bold;">${row.remainder}</td></tr>`;
    });
    html += `</tbody></table></div>
      <div class="step-result">Result: <span style="color:${def.color};font-weight:bold;font-family:monospace;">${def.result}</span>
      <span class="step-arrow">↑ Read remainders bottom to top</span></div></div>`;
  });
  container.innerHTML = html;
  document.getElementById('conv-steps').style.display = 'block';
}

function renderBitVisualizer(binary) {
  const padLen = Math.ceil(binary.length/4)*4;
  const padded = binary.padStart(padLen,'0');
  let html = '<div class="bit-row">';
  padded.split('').forEach((bit,i) => {
    const power=padded.length-1-i, isOne=bit==='1';
    html+=`<div class="bit-cell ${isOne?'bit-one':'bit-zero'}">
      <div class="bit-power">2<sup>${power}</sup></div>
      <div class="bit-value">${bit}</div>
      <div class="bit-decimal">${isOne?Math.pow(2,power):0}</div></div>`;
  });
  html += '</div>';
  const active = padded.split('').map((b,i)=>b==='1'?Math.pow(2,padded.length-1-i):0).filter(v=>v>0);
  html += `<div class="bit-sum">${active.join(' + ')} = <span style="color:#56f89c;font-weight:bold;">${parseInt(padded,2)}</span></div>`;
  document.getElementById('bit-display').innerHTML = html;
  document.getElementById('bit-visualizer').style.display = 'block';
}

function copyVal(id, btn) {
  navigator.clipboard.writeText(document.getElementById(id).textContent).then(() => {
    btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy',1500);
  });
}

// ══════════════════════════════════════════════════════════
// CIRCUITS
// ══════════════════════════════════════════════════════════
let currentCircuit = null;
const circuitInputs = {};
const circuitInfo = {
  'half-adder': {title:'Half Adder',       desc:'Adds two 1-bit numbers. Outputs: Sum (XOR) and Carry (AND)',           inputs:['A','B']},
  'full-adder': {title:'Full Adder',        desc:'Adds three 1-bit numbers (A, B, Cin). Outputs: Sum and Carry-out',     inputs:['A','B','Cin']},
  'mux':        {title:'2:1 Multiplexer',   desc:'Selects one of two inputs based on Select line',                       inputs:['I0','I1','S']},
  'demux':      {title:'1:2 DeMultiplexer', desc:'Routes one input to one of two outputs based on Select',               inputs:['Input','S']},
  'encoder':    {title:'2:1 Encoder',       desc:'Encodes 2 input lines into 1 output line',                             inputs:['I0','I1']},
  'decoder':    {title:'1:2 Decoder',       desc:'Decodes 1 input into 2 output lines based on Enable',                  inputs:['A','Enable']},
};

function selectCircuit(type, btn) {
  currentCircuit = type;
  const info = circuitInfo[type];
  document.querySelectorAll('#tab-circuits .gate-btn').forEach(b=>b.classList.remove('selected'));
  if (btn) btn.classList.add('selected');
  document.getElementById('circuit-title').textContent = info.title;
  document.getElementById('circuit-desc').textContent  = info.desc;
  let html = '<div class="inputs">';
  info.inputs.forEach(inp => {
    circuitInputs[inp]=0;
    html+=`<div class="input-group"><label>${inp}</label><div class="toggle-group">
      <button onclick="setCInput('${inp}',0)" id="ci-${inp}-0" class="toggle active">0</button>
      <button onclick="setCInput('${inp}',1)" id="ci-${inp}-1" class="toggle">1</button>
    </div></div>`;
  });
  html += '</div>';
  document.getElementById('circuit-input-fields').innerHTML = html;
  document.getElementById('circuit-inputs').style.display        = 'block';
  document.getElementById('circuit-output').style.display        = 'none';
  document.getElementById('circuit-table-section').style.display = 'none';
}

function setCInput(name, val) {
  circuitInputs[name]=val;
  document.getElementById(`ci-${name}-0`).classList.toggle('active',val===0);
  document.getElementById(`ci-${name}-1`).classList.toggle('active',val===1);
}

function computeCircuit(type, vals) {
  const v=k=>vals[k]??0;
  if (type==='half-adder') return {outputs:{Sum:v('A')^v('B'),Carry:v('A')&v('B')},table:[{A:0,B:0,Sum:0,Carry:0},{A:0,B:1,Sum:1,Carry:0},{A:1,B:0,Sum:1,Carry:0},{A:1,B:1,Sum:0,Carry:1}]};
  if (type==='full-adder') {
    const t=[];
    for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)t.push({A:a,B:b,Cin:c,Sum:a^b^c,'Carry-out':(a&b)|(b&c)|(a&c)});
    return {outputs:{Sum:v('A')^v('B')^v('Cin'),'Carry-out':(v('A')&v('B'))|(v('B')&v('Cin'))|(v('A')&v('Cin'))},table:t};
  }
  if (type==='mux') return {outputs:{Y:v('S')===0?v('I0'):v('I1')},table:[{I0:0,I1:0,S:0,Y:0},{I0:0,I1:1,S:0,Y:0},{I0:1,I1:0,S:0,Y:1},{I0:1,I1:1,S:0,Y:1},{I0:0,I1:0,S:1,Y:0},{I0:0,I1:1,S:1,Y:1},{I0:1,I1:0,S:1,Y:0},{I0:1,I1:1,S:1,Y:1}]};
  if (type==='demux') return {outputs:{Y0:v('S')===0?v('Input'):0,Y1:v('S')===1?v('Input'):0},table:[{Input:0,S:0,Y0:0,Y1:0},{Input:1,S:0,Y0:1,Y1:0},{Input:0,S:1,Y0:0,Y1:0},{Input:1,S:1,Y0:0,Y1:1}]};
  if (type==='encoder') return {outputs:{Out:v('I0')===0&&v('I1')===1?1:0},table:[{I0:0,I1:0,Out:0},{I0:0,I1:1,Out:1},{I0:1,I1:0,Out:0},{I0:1,I1:1,Out:1}]};
  if (type==='decoder') return {outputs:{Y0:v('Enable')&(~v('A')&1),Y1:v('Enable')&v('A')},table:[{Enable:0,A:0,Y0:0,Y1:0},{Enable:0,A:1,Y0:0,Y1:0},{Enable:1,A:0,Y0:1,Y1:0},{Enable:1,A:1,Y0:0,Y1:1}]};
}

function simulateCircuit() {
  if (!currentCircuit) return;
  const result = computeCircuit(currentCircuit, circuitInputs);
  let html='<div class="circuit-outputs">';
  Object.entries(result.outputs).forEach(([k,v])=>{ html+=`<div class="output-pill ${v?'high':'low'}">${k} = ${v}</div>`; });
  html+='</div>';
  document.getElementById('circuit-result').innerHTML=html;
  document.getElementById('circuit-output').style.display='block';
  renderTruthTable(result.table,'circuit-truth-table');
  document.getElementById('circuit-table-section').style.display='block';
}

// ══════════════════════════════════════════════════════════
// TIMING DIAGRAM
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('timing-gate');
  if (sel) sel.addEventListener('change', function() {
    document.getElementById('timing-b-row').style.display = this.value==='NOT'?'none':'flex';
  });
  renderKmapGrid();
  renderSymbols('all');
  generateSignal();
});

function drawTiming() {
  const gate=document.getElementById('timing-gate').value;
  const aStr=document.getElementById('timing-a').value.replace(/[^01]/g,'');
  const bStr=document.getElementById('timing-b').value.replace(/[^01]/g,'');
  const len=Math.min(aStr.length,gate==='NOT'?99:bStr.length,8);
  if (len===0){alert('Enter valid 0/1 patterns');return;}
  const aVals=aStr.slice(0,len).split('').map(Number);
  const bVals=bStr.slice(0,len).split('').map(Number);
  const outVals=aVals.map((a,i)=>{
    const b=bVals[i]??0;
    if(gate==='AND')return a&b; if(gate==='OR')return a|b; if(gate==='NOT')return a^1;
    if(gate==='NAND')return(a&b)^1; if(gate==='NOR')return(a|b)^1;
    if(gate==='XOR')return a^b; if(gate==='XNOR')return(a^b)^1;
  });
  const canvas=document.getElementById('timingCanvas');
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const rows=gate==='NOT'?['A','Out']:['A','B','Out'];
  const colors={A:'#7ee8fa',B:'#a0c4ff',Out:'#56f89c'};
  const data={A:aVals,B:bVals,Out:outVals};
  const rowH=60,padL=60,padT=20,stepW=(canvas.width-padL-20)/len;
  rows.forEach((row,ri)=>{
    const y=padT+ri*rowH,hi=y+8,lo=y+38;
    ctx.fillStyle='#aaa';ctx.font='13px Segoe UI';ctx.textAlign='right';
    ctx.fillText(row,padL-8,(hi+lo)/2+5);
    ctx.strokeStyle=colors[row];ctx.lineWidth=2;ctx.beginPath();
    data[row].forEach((val,i)=>{
      const x=padL+i*stepW,cy2=val===1?hi:lo,ny=data[row][i+1]===1?hi:lo;
      if(i===0)ctx.moveTo(x,cy2);
      ctx.lineTo(x+stepW,cy2);
      if(i<len-1&&cy2!==ny)ctx.lineTo(x+stepW,ny);
    });
    ctx.stroke();
  });
  ctx.fillStyle='#444';ctx.font='11px Segoe UI';ctx.textAlign='center';
  for(let i=0;i<=len;i++)ctx.fillText(i,padL+i*stepW,padT+rows.length*rowH+12);
  ctx.fillStyle='#555';ctx.textAlign='left';
  ctx.fillText('Clock →',padL,padT+rows.length*rowH+12);
  document.getElementById('timing-output').style.display='block';
}

// ══════════════════════════════════════════════════════════
// CIRCUIT SYMBOL LIBRARY
// ══════════════════════════════════════════════════════════
const symbolData = [
  {name:'AND Gate',     category:'basic',     desc:'Output is 1 only when ALL inputs are 1',            expr:'A · B',          color:'#7ee8fa'},
  {name:'OR Gate',      category:'basic',     desc:'Output is 1 when AT LEAST ONE input is 1',          expr:'A + B',          color:'#a0c4ff'},
  {name:'NOT Gate',     category:'basic',     desc:'Inverts the input. Also called Inverter',            expr:"A'",             color:'#56f89c'},
  {name:'XOR Gate',     category:'basic',     desc:'Output is 1 when inputs are DIFFERENT',             expr:'A ⊕ B',          color:'#f8c956'},
  {name:'XNOR Gate',    category:'basic',     desc:'Output is 1 when inputs are the SAME',              expr:'(A ⊕ B)\'',      color:'#f8a056'},
  {name:'NAND Gate',    category:'universal', desc:'NOT AND — Universal gate. Can build any circuit',   expr:"(A · B)'",       color:'#ff6b9d'},
  {name:'NOR Gate',     category:'universal', desc:'NOT OR — Universal gate. Can build any circuit',    expr:"(A + B)'",       color:'#c77dff'},
  {name:'Half Adder',   category:'arithmetic',desc:'Adds 2 bits. Outputs: Sum and Carry',               expr:'S=A⊕B, C=A·B',  color:'#7ee8fa'},
  {name:'Full Adder',   category:'arithmetic',desc:'Adds 3 bits including carry-in',                    expr:'S=A⊕B⊕Cin',     color:'#56f89c'},
  {name:'Multiplexer',  category:'arithmetic',desc:'Selects one of many inputs to output',              expr:'Y=S\'I0+S·I1',   color:'#f8c956'},
  {name:'Demultiplexer',category:'arithmetic',desc:'Routes input to one of many outputs',               expr:'Y=Input·S',      color:'#f8a056'},
  {name:'SR Flip Flop', category:'flip',      desc:'Set-Reset flip flop. Basic memory element',         expr:'Q=S+R\'Q',       color:'#ff6b9d'},
  {name:'JK Flip Flop', category:'flip',      desc:'Improved SR — no invalid state',                   expr:'Q=JQ\'+K\'Q',    color:'#c77dff'},
  {name:'D Flip Flop',  category:'flip',      desc:'Data flip flop. Stores a single bit',               expr:'Q(t+1)=D',       color:'#7ee8fa'},
  {name:'T Flip Flop',  category:'flip',      desc:'Toggle flip flop. Flips state when T=1',            expr:'Q(t+1)=T⊕Q',    color:'#a0c4ff'},
];

function filterSymbols(category, btn) {
  document.querySelectorAll('#tab-symbols .gate-btn').forEach(b=>b.classList.remove('selected'));
  if(btn)btn.classList.add('selected');
  renderSymbols(category);
}

function renderSymbols(category) {
  const filtered = category==='all' ? symbolData : symbolData.filter(s=>s.category===category);
  const grid = document.getElementById('symbols-grid');
  let html='';
  filtered.forEach(sym=>{
    html+=`<div class="symbol-card">
      <div class="symbol-icon" style="border-color:${sym.color}44;background:${sym.color}11;">
        <span style="color:${sym.color};font-size:1.4rem;font-weight:900;">${sym.name.split(' ')[0]}</span>
      </div>
      <div class="symbol-name" style="color:${sym.color}">${sym.name}</div>
      <div class="symbol-expr">${sym.expr}</div>
      <div class="symbol-desc">${sym.desc}</div>
      <div class="symbol-badge">${sym.category}</div>
    </div>`;
  });
  grid.innerHTML=html;
}

// ══════════════════════════════════════════════════════════
// FLIP FLOP SIMULATOR
// ══════════════════════════════════════════════════════════
let currentFF = null;
const ffInputs = { Q: 0 };

const ffData = {
  SR: {
    title: 'SR Flip Flop',
    desc:  'Set-Reset flip flop. S=1 sets Q to 1. R=1 resets Q to 0. S=R=1 is invalid.',
    inputs: ['S','R'],
    info: '• S (Set) = 1 → Q becomes 1\n• R (Reset) = 1 → Q becomes 0\n• S=R=0 → Q holds previous state\n• S=R=1 → Invalid / Forbidden state\n• Used as basic memory element in digital circuits',
    compute: (vals,Q) => {
      const S=vals.S??0, R=vals.R??0;
      if(S===1&&R===1) return {Q_next:'X',Q_bar:'X',note:'⚠️ Invalid State (S=R=1)'};
      if(S===1&&R===0) return {Q_next:1, Q_bar:0, note:'Set: Q → 1'};
      if(S===0&&R===1) return {Q_next:0, Q_bar:1, note:'Reset: Q → 0'};
      return {Q_next:Q, Q_bar:Q^1, note:'Hold: Q unchanged'};
    },
    table: () => {
      const rows=[];
      for(let s=0;s<2;s++)for(let r=0;r<2;r++)for(let q=0;q<2;q++){
        let qn;
        if(s===1&&r===1)qn='X';
        else if(s===1&&r===0)qn=1;
        else if(s===0&&r===1)qn=0;
        else qn=q;
        rows.push({S:s,R:r,'Q(t)':q,'Q(t+1)':qn});
      }
      return rows;
    }
  },
  JK: {
    title: 'JK Flip Flop',
    desc:  'Improved SR flip flop. J=K=1 toggles the output. No invalid state.',
    inputs: ['J','K'],
    info: '• J=0, K=0 → Hold: Q unchanged\n• J=1, K=0 → Set: Q becomes 1\n• J=0, K=1 → Reset: Q becomes 0\n• J=1, K=1 → Toggle: Q flips\n• Eliminates the invalid state of SR flip flop',
    compute: (vals,Q) => {
      const J=vals.J??0, K=vals.K??0;
      if(J===0&&K===0) return {Q_next:Q, Q_bar:Q^1, note:'Hold: Q unchanged'};
      if(J===1&&K===0) return {Q_next:1, Q_bar:0,   note:'Set: Q → 1'};
      if(J===0&&K===1) return {Q_next:0, Q_bar:1,   note:'Reset: Q → 0'};
      return {Q_next:Q^1, Q_bar:Q, note:'Toggle: Q flipped'};
    },
    table: () => {
      const rows=[];
      for(let j=0;j<2;j++)for(let k=0;k<2;k++)for(let q=0;q<2;q++){
        let qn;
        if(j===0&&k===0)qn=q;
        else if(j===1&&k===0)qn=1;
        else if(j===0&&k===1)qn=0;
        else qn=q^1;
        rows.push({J:j,K:k,'Q(t)':q,'Q(t+1)':qn});
      }
      return rows;
    }
  },
  D: {
    title: 'D Flip Flop',
    desc:  'Data flip flop. Output follows input D on clock edge. Used to store a single bit.',
    inputs: ['D'],
    info: '• D=0 → Q becomes 0 on next clock edge\n• D=1 → Q becomes 1 on next clock edge\n• Q always follows D after clock\n• Simplest flip flop — single input\n• Widely used in registers and memory',
    compute: (vals,Q) => {
      const D=vals.D??0;
      return {Q_next:D, Q_bar:D^1, note:`Q follows D: Q → ${D}`};
    },
    table: () => {
      const rows=[];
      for(let d=0;d<2;d++)for(let q=0;q<2;q++)rows.push({D:d,'Q(t)':q,'Q(t+1)':d});
      return rows;
    }
  },
  T: {
    title: 'T Flip Flop',
    desc:  'Toggle flip flop. When T=1, output toggles on each clock edge.',
    inputs: ['T'],
    info: '• T=0 → Q holds its current value\n• T=1 → Q toggles (flips) on clock edge\n• Used in counters and frequency dividers\n• Derived from JK flip flop with J=K=T\n• Output frequency = Input frequency / 2',
    compute: (vals,Q) => {
      const T=vals.T??0;
      if(T===0) return {Q_next:Q,   Q_bar:Q^1, note:'Hold: Q unchanged'};
      return     {Q_next:Q^1, Q_bar:Q,   note:'Toggle: Q flipped'};
    },
    table: () => {
      const rows=[];
      for(let t=0;t<2;t++)for(let q=0;q<2;q++)rows.push({T:t,'Q(t)':q,'Q(t+1)':t===0?q:q^1});
      return rows;
    }
  }
};

function selectFF(type, btn) {
  currentFF = type;
  const ff = ffData[type];
  document.querySelectorAll('#tab-flipflop .gate-btn').forEach(b=>b.classList.remove('selected'));
  if(btn)btn.classList.add('selected');
  document.getElementById('ff-title').textContent = ff.title;
  document.getElementById('ff-desc').textContent  = ff.desc;
  let html='';
  ff.inputs.forEach(inp=>{
    ffInputs[inp]=0;
    html+=`<div class="input-group"><label>Input ${inp}</label><div class="toggle-group">
      <button onclick="setFFInput('${inp}',0)" id="ff${inp}0" class="toggle active">0</button>
      <button onclick="setFFInput('${inp}',1)" id="ff${inp}1" class="toggle">1</button>
    </div></div>`;
  });
  document.getElementById('ff-input-fields').innerHTML=html;
  ffInputs['Q']=0;
  document.getElementById('ffQ0').classList.add('active');
  document.getElementById('ffQ1').classList.remove('active');
  document.getElementById('ff-inputs').style.display       ='block';
  document.getElementById('ff-output').style.display       ='none';
  document.getElementById('ff-table-section').style.display='none';
  document.getElementById('ff-info-section').style.display ='none';
}

function setFFInput(name, val) {
  ffInputs[name]=val;
  document.getElementById(`ff${name}0`).classList.toggle('active',val===0);
  document.getElementById(`ff${name}1`).classList.toggle('active',val===1);
}

function simulateFF() {
  if(!currentFF)return;
  const ff=ffData[currentFF];
  const result=ff.compute(ffInputs, ffInputs['Q']);
  let html='<div class="circuit-outputs">';
  html+=`<div class="output-pill ${result.Q_next===1?'high':result.Q_next==='X'?'invalid':'low'}">Q(next) = ${result.Q_next}</div>`;
  if(result.Q_bar!==undefined&&result.Q_bar!=='X')
    html+=`<div class="output-pill ${result.Q_bar===1?'high':'low'}">Q̄(next) = ${result.Q_bar}</div>`;
  html+=`</div><div class="ff-note">${result.note}</div>`;
  document.getElementById('ff-result').innerHTML=html;
  document.getElementById('ff-output').style.display='block';
  renderTruthTable(ff.table(),'ff-truth-table');
  document.getElementById('ff-table-section').style.display='block';
  document.getElementById('ff-info').innerHTML=ff.info.split('\n').map(l=>`<div>${l}</div>`).join('');
  document.getElementById('ff-info-section').style.display='block';
}

// ══════════════════════════════════════════════════════════
// K-MAP SIMPLIFIER
// ══════════════════════════════════════════════════════════
let kmapState = {};

function renderKmapGrid() {
  const numVars = parseInt(document.getElementById('kmap-vars')?.value||'2');
  const total   = Math.pow(2, numVars);
  kmapState = {};
  for(let i=0;i<total;i++) kmapState[i]=0;

  const grayCode2 = [0,1,3,2];
  const grayCode4 = [0,1,3,2];
  let html='<div class="kmap-wrap">';

  if(numVars===2){
    html+=`<table class="kmap-table">
      <tr><th></th><th>B=0</th><th>B=1</th></tr>
      <tr><th>A=0</th>${[0,1].map(b=>`<td class="kmap-cell" onclick="toggleCell(${b*2+0},this)" id="kc-${b*2+0}">0</td>`).join('')}</tr>
      <tr><th>A=1</th>${[0,1].map(b=>`<td class="kmap-cell" onclick="toggleCell(${b*2+1},this)" id="kc-${b*2+1}">0</td>`).join('')}</tr>
    </table>`;
  } else if(numVars===3){
    const abCodes=[[0,0],[0,1],[1,1],[1,0]];
    html+=`<table class="kmap-table"><tr><th>AB \\ C</th><th>0</th><th>1</th></tr>`;
    abCodes.forEach(([a,b])=>{
      html+=`<tr><th>AB=${a}${b}</th>`;
      [0,1].forEach(c=>{
        const idx=a*4+b*2+c;
        html+=`<td class="kmap-cell" onclick="toggleCell(${idx},this)" id="kc-${idx}">0</td>`;
      });
      html+='</tr>';
    });
    html+='</table>';
  } else {
    const abCodes=[[0,0],[0,1],[1,1],[1,0]];
    const cdCodes=[[0,0],[0,1],[1,1],[1,0]];
    html+=`<table class="kmap-table"><tr><th>AB \\ CD</th>`;
    cdCodes.forEach(([c,d])=>html+=`<th>CD=${c}${d}</th>`);
    html+='</tr>';
    abCodes.forEach(([a,b])=>{
      html+=`<tr><th>AB=${a}${b}</th>`;
      cdCodes.forEach(([c,d])=>{
        const idx=a*8+b*4+c*2+d;
        html+=`<td class="kmap-cell" onclick="toggleCell(${idx},this)" id="kc-${idx}">0</td>`;
      });
      html+='</tr>';
    });
    html+='</table>';
  }
  html+='</div>';
  document.getElementById('kmap-grid-container').innerHTML=html;
  document.getElementById('kmap-result').style.display      ='none';
  document.getElementById('kmap-table-section').style.display='none';
}

function toggleCell(idx, el) {
  const cur=kmapState[idx];
  const next=cur===0?1:cur===1?'X':0;
  kmapState[idx]=next;
  el.textContent=next;
  el.className='kmap-cell'+(next===1?' kmap-one':next==='X'?' kmap-x':'');
}

function clearKmap() {
  Object.keys(kmapState).forEach(k=>{
    kmapState[k]=0;
    const el=document.getElementById(`kc-${k}`);
    if(el){el.textContent='0';el.className='kmap-cell';}
  });
  document.getElementById('kmap-result').style.display      ='none';
  document.getElementById('kmap-table-section').style.display='none';
}

async function simplifyKmap() {
  const numVars  = parseInt(document.getElementById('kmap-vars').value);
  const minterms = Object.entries(kmapState).filter(([k,v])=>v===1).map(([k])=>parseInt(k));
  const dontCares= Object.entries(kmapState).filter(([k,v])=>v==='X').map(([k])=>parseInt(k));
  if(minterms.length===0){
    document.getElementById('kmap-simplified').textContent='F = 0 (no minterms selected)';
    document.getElementById('kmap-result').style.display='block';
    return;
  }
  const res  = await fetch('/kmap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({num_vars:numVars,minterms,dont_cares:dontCares})});
  const data = await res.json();
  if(!data.success){alert(data.message);return;}
  document.getElementById('kmap-simplified').innerHTML=`F = <span style="color:#7ee8fa">${data.simplified}</span>`;
  let piHtml='<div style="margin-top:10px;"><strong style="color:#aaa;font-size:0.85rem;">Prime Implicants:</strong><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">';
  data.prime_implicants.forEach(pi=>{
    piHtml+=`<div class="pi-badge">Pattern: ${pi.pattern} → covers {${pi.covers.join(',')}}</div>`;
  });
  piHtml+='</div></div>';
  document.getElementById('kmap-implicants').innerHTML=piHtml;
  document.getElementById('kmap-result').style.display='block';
  renderTruthTable(data.truth_table,'kmap-truth-table');
  document.getElementById('kmap-table-section').style.display='block';
}

// ══════════════════════════════════════════════════════════
// SIGNAL GENERATOR
// ══════════════════════════════════════════════════════════
let waves = [];
const waveColors = ['#7ee8fa','#56f89c','#f8c956','#ff6b9d','#c77dff','#a0c4ff'];

function generateSignal() {
  const type  = document.getElementById('wave-type')?.value||'sine';
  const freq  = parseFloat(document.getElementById('wave-freq')?.value||2);
  const amp   = parseFloat(document.getElementById('wave-amp')?.value||5)/5;
  const phase = parseFloat(document.getElementById('wave-phase')?.value||0)*Math.PI/180;

  const canvas = document.getElementById('signalCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const allWaves=[...waves,{type,freq,amp,phase,color:waveColors[waves.length%waveColors.length]}];
  drawSignals(ctx,canvas,allWaves);

  const props=document.getElementById('signal-props');
  const period=(1/freq).toFixed(3);
  props.innerHTML=`
    <div class="prop-item"><span class="prop-label">Wave Type</span><span class="prop-val">${type.charAt(0).toUpperCase()+type.slice(1)}</span></div>
    <div class="prop-item"><span class="prop-label">Frequency</span><span class="prop-val">${freq} Hz</span></div>
    <div class="prop-item"><span class="prop-label">Period</span><span class="prop-val">${period} s</span></div>
    <div class="prop-item"><span class="prop-label">Amplitude</span><span class="prop-val">${amp.toFixed(1)}</span></div>
    <div class="prop-item"><span class="prop-label">Phase</span><span class="prop-val">${Math.round(phase*180/Math.PI)}°</span></div>
    <div class="prop-item"><span class="prop-label">Angular Freq (ω)</span><span class="prop-val">${(2*Math.PI*freq).toFixed(2)} rad/s</span></div>
  `;
}

function drawSignals(ctx, canvas, waveList) {
  const W=canvas.width, H=canvas.height;
  const midY=H/2, scaleY=(H/2-30);

  // Grid
  ctx.strokeStyle='#1e1e38'; ctx.lineWidth=1;
  for(let i=0;i<=10;i++){
    const x=i*(W/10);
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
  }
  for(let i=0;i<=6;i++){
    const y=i*(H/6);
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
  }

  // Axes
  ctx.strokeStyle='#2a2a4a'; ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,midY);ctx.lineTo(W,midY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(40,0);ctx.lineTo(40,H);ctx.stroke();

  // Labels
  ctx.fillStyle='#444';ctx.font='10px monospace';ctx.textAlign='center';
  for(let i=0;i<=10;i++) ctx.fillText(`${i*0.5}s`,i*(W/10),H-5);
  ctx.textAlign='right';
  ['+1','0','-1'].forEach((l,i)=>ctx.fillText(l,35,[30,midY,H-10][i]));

  // Waves
  const legend=document.getElementById('wave-legend');
  if(legend)legend.innerHTML='';
  waveList.forEach((wave,wi)=>{
    ctx.strokeStyle=wave.color; ctx.lineWidth=2;
    ctx.beginPath();
    const steps=W-40;
    for(let px=0;px<steps;px++){
      const t=(px/steps)*5;
      const rad=2*Math.PI*wave.freq*t+wave.phase;
      let y=0;
      if(wave.type==='sine')    y=Math.sin(rad);
      else if(wave.type==='square')   y=Math.sign(Math.sin(rad));
      else if(wave.type==='triangle') y=(2/Math.PI)*Math.asin(Math.sin(rad));
      else if(wave.type==='sawtooth') y=((rad%(2*Math.PI))/(Math.PI))-1;
      const canvasY=midY - y*wave.amp*scaleY;
      px===0?ctx.moveTo(40+px,canvasY):ctx.lineTo(40+px,canvasY);
    }
    ctx.stroke();
    if(legend){
      const item=document.createElement('div');
      item.style.cssText=`display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#aaa;`;
      item.innerHTML=`<span style="width:20px;height:3px;background:${wave.color};display:inline-block;border-radius:2px;"></span>${wave.type} (${wave.freq}Hz)`;
      legend.appendChild(item);
    }
  });
}

function addWave() {
  const type  = document.getElementById('wave-type').value;
  const freq  = parseFloat(document.getElementById('wave-freq').value);
  const amp   = parseFloat(document.getElementById('wave-amp').value)/5;
  const phase = parseFloat(document.getElementById('wave-phase').value)*Math.PI/180;
  waves.push({type,freq,amp,phase,color:waveColors[waves.length%waveColors.length]});
  generateSignal();
}

function clearWaves() {
  waves=[];
  generateSignal();
}

// ══════════════════════════════════════════════════════════
// CODE CONVERTER
// ══════════════════════════════════════════════════════════
let codeMode='text-to-binary';

function selectCodeMode(mode, btn) {
  codeMode=mode;
  document.querySelectorAll('#tab-code .base-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.getElementById('code-input').value='';
  document.getElementById('code-error').style.display='none';
  document.getElementById('code-output-card').style.display='none';
  document.getElementById('code-table-card').style.display='none';
  const ph={
    'text-to-binary':'Enter text e.g. Hello',
    'binary-to-text':'Enter binary e.g. 01001000 01101001',
    'text-to-hex':   'Enter text e.g. Hello',
    'hex-to-text':   'Enter hex e.g. 48 65 6C 6C 6F'
  };
  document.getElementById('code-input').placeholder=ph[mode];
}

function setCodeInput(val){ document.getElementById('code-input').value=val; }

async function convertCode() {
  const text=document.getElementById('code-input').value;
  const errBox=document.getElementById('code-error');
  errBox.style.display='none';
  if(!text.trim()){errBox.textContent='Please enter some input';errBox.style.display='block';return;}
  const res =await fetch('/code-convert',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,mode:codeMode})});
  const data=await res.json();
  if(!data.success){errBox.textContent=data.message;errBox.style.display='block';return;}

  // Output text
  let outputStr='';
  if(codeMode==='text-to-binary') outputStr=data.result.map(r=>r.binary).join(' ');
  else if(codeMode==='binary-to-text') outputStr=data.output_text;
  else if(codeMode==='text-to-hex')    outputStr=data.result.map(r=>r.hex).join(' ');
  else if(codeMode==='hex-to-text')    outputStr=data.output_text;

  document.getElementById('code-output-text').textContent=outputStr;
  document.getElementById('code-output-card').style.display='block';

  // Table
  let html='<table><thead><tr>';
  const cols=Object.keys(data.result[0]);
  cols.forEach(c=>html+=`<th>${c}</th>`);
  html+='</tr></thead><tbody>';
  data.result.forEach(row=>{
    html+='<tr>';
    cols.forEach(c=>html+=`<td style="font-family:monospace;">${row[c]}</td>`);
    html+='</tr>';
  });
  html+='</tbody></table>';
  document.getElementById('code-table').innerHTML=html;
  document.getElementById('code-table-card').style.display='block';
}

function copyCodeOutput() {
  const text=document.getElementById('code-output-text').textContent;
  navigator.clipboard.writeText(text).then(()=>{
    const btn=event.target;
    btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy Result',1500);
  });
}

// ══════════════════════════════════════════════════════════
// QUIZ
// ══════════════════════════════════════════════════════════
let quizQuestions=[],quizIndex=0,quizScore=0;
let answered=false,timerInterval=null,selectedLevel=null;

const allQuestions={
  basic:[
    {q:'Output of AND gate when A=1, B=0?',        opts:['0','1','X','Z'],                                              ans:'0',             exp:'AND outputs 1 only when ALL inputs are 1.'},
    {q:'Output of OR gate when A=0, B=0?',         opts:['0','1','X','Z'],                                              ans:'0',             exp:'OR outputs 0 only when ALL inputs are 0.'},
    {q:'Output of NOT gate when A=0?',             opts:['0','1','X','Z'],                                              ans:'1',             exp:'NOT inverts the input. NOT 0 = 1.'},
    {q:'Output of NAND gate when A=1, B=1?',       opts:['0','1','X','Z'],                                              ans:'0',             exp:'NAND = NOT AND. AND(1,1)=1, NOT 1 = 0.'},
    {q:'Output of NOR gate when A=0, B=0?',        opts:['0','1','X','Z'],                                              ans:'1',             exp:'NOR outputs 1 only when ALL inputs are 0.'},
    {q:'Output of XOR gate when A=1, B=1?',        opts:['0','1','X','Z'],                                              ans:'0',             exp:'XOR outputs 0 when both inputs are same.'},
    {q:'How many inputs does a NOT gate have?',    opts:['1','2','3','4'],                                              ans:'1',             exp:'NOT gate is a single-input gate.'},
    {q:'Which gate outputs 1 when inputs differ?', opts:['AND','OR','XOR','NAND'],                                      ans:'XOR',           exp:'XOR outputs 1 when inputs are different.'},
    {q:'Output of XNOR when A=0, B=0?',           opts:['0','1','X','Z'],                                              ans:'1',             exp:'XNOR outputs 1 when both inputs are same.'},
    {q:'OR gate output when A=1, B=0?',            opts:['0','1','X','Z'],                                              ans:'1',             exp:'OR outputs 1 when at least one input is 1.'},
    {q:'What does a logic gate process?',          opts:['Analog signals','Binary signals','AC signals','RF signals'],  ans:'Binary signals', exp:'Logic gates work with binary (0 and 1) signals.'},
    {q:'AND gate output when A=1, B=1?',           opts:['0','1','X','Z'],                                              ans:'1',             exp:'AND outputs 1 when ALL inputs are 1.'},
  ],
  moderate:[
    {q:'NAND is a combination of?',                opts:['NOT+OR','NOT+AND','AND+OR','NOR+NOT'],                        ans:'NOT+AND',       exp:'NAND = NOT after AND gate.'},
    {q:'Which gate is called Universal Gate?',     opts:['AND','OR','NAND','XOR'],                                      ans:'NAND',          exp:'NAND and NOR are universal gates.'},
    {q:'Half Adder has how many outputs?',         opts:['1','2','3','4'],                                              ans:'2',             exp:'Half Adder outputs: Sum and Carry.'},
    {q:'Full Adder has how many inputs?',          opts:['1','2','3','4'],                                              ans:'3',             exp:'Full Adder inputs: A, B, and Carry-in.'},
    {q:'Truth table rows for 3 inputs?',           opts:['4','6','8','16'],                                             ans:'8',             exp:'Rows = 2^n. 2^3 = 8.'},
    {q:'MUX stands for?',                         opts:['Multi Xor Unit','Multiplexer','Multi X Unit','Main X Unit'],  ans:'Multiplexer',   exp:'MUX = Multiplexer, selects one of many inputs.'},
    {q:'Boolean Identity Law: A + 0 = ?',          opts:['0','1','A','A+1'],                                            ans:'A',             exp:'Identity Law: A + 0 = A.'},
    {q:"De Morgan: NOT(A AND B) = ?",              opts:['NOT A AND NOT B','NOT A OR NOT B','A OR B','A AND B'],        ans:'NOT A OR NOT B',exp:"De Morgan's: NOT(A·B) = NOT A + NOT B."},
    {q:'Complement Law: A AND NOT A = ?',          opts:['0','1','A','NOT A'],                                          ans:'0',             exp:'A · NOT A = 0 always.'},
    {q:'Sum output of Half Adder is?',             opts:['AND','OR','XOR','NAND'],                                      ans:'XOR',           exp:'Sum = A XOR B in Half Adder.'},
    {q:'Carry output of Half Adder is?',           opts:['AND','OR','XOR','NAND'],                                      ans:'AND',           exp:'Carry = A AND B in Half Adder.'},
    {q:'D Flip Flop next state Q(t+1) = ?',        opts:['D','Q','D+Q','D XOR Q'],                                      ans:'D',             exp:'D flip flop always follows D input.'},
  ],
  advanced:[
    {q:'Minimum NAND gates to implement NOT?',     opts:['1','2','3','4'],                                              ans:'1',             exp:'Connect both NAND inputs together = NOT gate.'},
    {q:'Full Adder Carry-out expression?',         opts:['A XOR B','AB+BCin+ACin','A+B+Cin','AB XOR Cin'],             ans:'AB+BCin+ACin',  exp:'Cout = AB + BCin + ACin.'},
    {q:'How many NAND gates to implement AND?',    opts:['1','2','3','4'],                                              ans:'2',             exp:'AND = NAND followed by NOT (another NAND).'},
    {q:'Absorption Law: A + AB = ?',               opts:['AB','A','B','A+B'],                                           ans:'A',             exp:'Absorption Law: A + AB = A.'},
    {q:'A 4:1 MUX needs how many select lines?',   opts:['1','2','3','4'],                                              ans:'2',             exp:'2 select lines can address 2^2 = 4 inputs.'},
    {q:'Dual of AND is?',                          opts:['NOT','NAND','OR','NOR'],                                      ans:'OR',            exp:'Duality principle: AND ↔ OR, 0 ↔ 1.'},
    {q:'A 3:8 decoder has how many outputs?',      opts:['3','6','8','16'],                                             ans:'8',             exp:'3 inputs → 2^3 = 8 output lines.'},
    {q:'Boolean expression for XNOR?',             opts:['A XOR B','NOT(A XOR B)','A AND B','NOT A OR NOT B'],         ans:'NOT(A XOR B)',  exp:'XNOR = NOT(XOR). Outputs 1 when inputs are same.'},
    {q:'Which logic family has lowest power?',     opts:['TTL','ECL','CMOS','DTL'],                                    ans:'CMOS',          exp:'CMOS consumes near-zero static power.'},
    {q:'JK Flip Flop when J=1, K=1?',             opts:['Set','Reset','Hold','Toggle'],                                ans:'Toggle',        exp:'J=K=1 in JK flip flop toggles the output.'},
    {q:'SR Flip Flop invalid state is?',           opts:['S=0,R=0','S=1,R=0','S=0,R=1','S=1,R=1'],                   ans:'S=1,R=1',       exp:'S=R=1 is the forbidden/invalid state in SR FF.'},
    {q:'Which minimization uses K-map?',           opts:['SOP only','QM only','Both','Neither'],                       ans:'Both',          exp:'Both K-map and Quine-McCluskey minimize Boolean.'},
  ]
};

function selectLevel(level, btn) {
  selectedLevel=level;
  document.querySelectorAll('.level-btn').forEach(b=>b.className='level-btn');
  btn.classList.add(`selected-${level}`);
  document.getElementById('start-quiz-btn').disabled=false;
}

function startQuiz() {
  if(!selectedLevel)return;
  quizQuestions=[...allQuestions[selectedLevel]].sort(()=>Math.random()-0.5).slice(0,10);
  quizIndex=0;quizScore=0;
  document.getElementById('quiz-start-card').style.display ='none';
  document.getElementById('quiz-result-card').style.display='none';
  document.getElementById('quiz-area').style.display       ='block';
  showQuestion();
}

function showQuestion() {
  answered=false;
  clearInterval(timerInterval);
  const q=quizQuestions[quizIndex];
  const badge=document.getElementById('quiz-level-badge');
  const colors={basic:'#56f89c',moderate:'#f8c956',advanced:'#f85656'};
  badge.textContent=selectedLevel.toUpperCase();
  badge.style.cssText=`background:${colors[selectedLevel]}22;color:${colors[selectedLevel]};border:1px solid ${colors[selectedLevel]}44;display:inline-block;padding:3px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;`;
  document.getElementById('quiz-question').textContent     =`Q${quizIndex+1}. ${q.q}`;
  document.getElementById('quiz-explanation').style.display='none';
  document.getElementById('quiz-next').style.display       ='none';
  document.getElementById('quiz-progress-fill').style.width=`${(quizIndex/10)*100}%`;
  document.getElementById('quiz-progress-text').textContent=`Question ${quizIndex+1} of 10`;
  const opts=[...q.opts].sort(()=>Math.random()-0.5);
  document.getElementById('quiz-options').innerHTML=opts.map(opt=>`<button class="quiz-opt" onclick="answerQuiz('${opt}',this)">${opt}</button>`).join('');
  let timeLeft=15;
  const timerEl=document.getElementById('quiz-timer');
  const timerBox=document.querySelector('.timer-box');
  timerEl.textContent=timeLeft; timerBox.className='timer-box';
  timerInterval=setInterval(()=>{
    timeLeft--;timerEl.textContent=timeLeft;
    if(timeLeft<=5)timerBox.className='timer-box danger';
    else if(timeLeft<=8)timerBox.className='timer-box warning';
    if(timeLeft<=0){clearInterval(timerInterval);timeUp();}
  },1000);
}

function timeUp() {
  if(answered)return;
  answered=true;
  const q=quizQuestions[quizIndex];
  document.querySelectorAll('.quiz-opt').forEach(b=>{if(b.textContent===q.ans)b.classList.add('correct');b.disabled=true;});
  const expBox=document.getElementById('quiz-explanation');
  expBox.textContent=`⏰ Time's up! Correct: ${q.ans}. 💡 ${q.exp}`;
  expBox.style.display='block';
  document.getElementById('quiz-next').style.display='block';
}

function answerQuiz(selected, btn) {
  if(answered)return;
  answered=true;clearInterval(timerInterval);
  const q=quizQuestions[quizIndex];
  const correct=selected===q.ans;
  if(correct){quizScore++;btn.classList.add('correct');}
  else{btn.classList.add('wrong');document.querySelectorAll('.quiz-opt').forEach(b=>{if(b.textContent===q.ans)b.classList.add('correct');});}
  document.querySelectorAll('.quiz-opt').forEach(b=>b.disabled=true);
  const expBox=document.getElementById('quiz-explanation');
  expBox.textContent=`💡 ${q.exp}`;expBox.style.display='block';
  document.getElementById('quiz-next').style.display='block';
}

function nextQuestion() {
  quizIndex++;
  if(quizIndex>=10)showResult();else showQuestion();
}

function showResult() {
  clearInterval(timerInterval);
  document.getElementById('quiz-area').style.display       ='none';
  document.getElementById('quiz-result-card').style.display='block';
  const pct=(quizScore/10)*100;
  const grade=pct===100?'🏆 Perfect!':pct>=80?'⭐ Excellent!':pct>=60?'👍 Good Job!':pct>=40?'📚 Keep Practicing!':"💪 Don't Give Up!";
  const lc={basic:'#56f89c',moderate:'#f8c956',advanced:'#f85656'};
  document.getElementById('quiz-score-display').innerHTML=`
    <div class="score-number" style="color:${lc[selectedLevel]}">${quizScore}/10</div>
    <div class="score-grade">${grade}</div>
    <div class="score-pct">${pct}% Correct · ${selectedLevel.toUpperCase()} Level</div>`;
}

function resetQuiz() {
  clearInterval(timerInterval);selectedLevel=null;
  document.getElementById('quiz-result-card').style.display='none';
  document.getElementById('quiz-start-card').style.display ='block';
  document.getElementById('start-quiz-btn').disabled=true;
  document.querySelectorAll('.level-btn').forEach(b=>b.className='level-btn');
}