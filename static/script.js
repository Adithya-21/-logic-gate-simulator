let selectedGate = null;
let inputs = { a: 0, b: 0 };

function selectGate(gate) {
  selectedGate = gate;
  document.getElementById('selected-gate-label').textContent = gate;

  // Highlight selected button
  document.querySelectorAll('.gate-btn').forEach(btn => btn.classList.remove('selected'));
  event.target.classList.add('selected');

  // Hide input B for NOT gate
  document.getElementById('input-b-group').style.display =
    gate === 'NOT' ? 'none' : 'block';

  document.getElementById('output-section').style.display = 'none';
  document.getElementById('truth-table-section').style.display = 'none';
}

function setInput(input, value) {
  inputs[input] = value;
  const btn0 = document.getElementById(`${input}0`);
  const btn1 = document.getElementById(`${input}1`);
  btn0.classList.toggle('active', value === 0);
  btn1.classList.toggle('active', value === 1);
}

async function simulate() {
  if (!selectedGate) {
    alert('Please select a gate first!');
    return;
  }

  const response = await fetch('/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gate: selectedGate, a: inputs.a, b: inputs.b })
  });

  const data = await response.json();

  // Show output
  const outDiv = document.getElementById('output-display');
  outDiv.textContent = `${data.gate} Gate Output = ${data.output}`;
  outDiv.className = 'output-display ' + (data.output === 1 ? 'high' : 'low');
  document.getElementById('output-section').style.display = 'block';

  // Draw gate on canvas
  drawGate(data.gate, data.inputs.A, data.inputs.B, data.output);

  // Render truth table
  renderTruthTable(data.truth_table, data.gate);
  document.getElementById('truth-table-section').style.display = 'block';
}

function renderTruthTable(table, gate) {
  const isNot = gate === 'NOT';
  let html = `<table><thead><tr><th>A</th>${!isNot ? '<th>B</th>' : ''}<th>Output</th></tr></thead><tbody>`;
  table.forEach(row => {
    html += `<tr>
      <td class="${row.A ? 'one' : 'zero'}">${row.A}</td>
      ${!isNot ? `<td class="${row.B ? 'one' : 'zero'}">${row.B}</td>` : ''}
      <td class="${row.Output ? 'one' : 'zero'}">${row.Output}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('truth-table-container').innerHTML = html;
}

function drawGate(gate, a, b, out) {
  const canvas = document.getElementById('gateCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#7ee8fa';
  ctx.fillStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.font = '14px Segoe UI';
  ctx.fillStyle = '#e0e0e0';

  const cx = 150, cy = 80;

  // Draw gate body (simple rectangle with label)
  ctx.strokeStyle = '#7ee8fa';
  ctx.fillStyle = '#0f0f1a';
  ctx.beginPath();
  ctx.roundRect(cx - 40, cy - 30, 80, 60, 8);
  ctx.fill(); ctx.stroke();

  // Gate label
  ctx.fillStyle = '#7ee8fa';
  ctx.font = 'bold 16px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(gate, cx, cy + 6);

  // Input wires
  ctx.strokeStyle = a ? '#56f89c' : '#f85656';
  ctx.beginPath(); ctx.moveTo(cx - 100, cy - 15); ctx.lineTo(cx - 40, cy - 15); ctx.stroke();
  ctx.fillStyle = '#aaa'; ctx.font = '13px Segoe UI';
  ctx.textAlign = 'right';
  ctx.fillText(`A=${a}`, cx - 105, cy - 10);

  if (gate !== 'NOT') {
    ctx.strokeStyle = b ? '#56f89c' : '#f85656';
    ctx.beginPath(); ctx.moveTo(cx - 100, cy + 15); ctx.lineTo(cx - 40, cy + 15); ctx.stroke();
    ctx.fillText(`B=${b}`, cx - 105, cy + 20);
  }

  // Output wire
  ctx.strokeStyle = out ? '#56f89c' : '#f85656';
  ctx.beginPath(); ctx.moveTo(cx + 40, cy); ctx.lineTo(cx + 100, cy); ctx.stroke();
  ctx.fillStyle = '#aaa'; ctx.textAlign = 'left';
  ctx.fillText(`Out=${out}`, cx + 105, cy + 5);
}