async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

document.getElementById('predictBtn').addEventListener('click', async () => {
  const description = document.getElementById('description').value;
  const amount = parseFloat(document.getElementById('amount').value || 0);
  const out = document.getElementById('result');
  out.innerText = 'Predicting...';
  try {
    const res = await postJson('/predict', { description, amount });
    out.innerHTML = `<strong>Category:</strong> ${res.category}<br/><strong>Probabilities:</strong><pre>${JSON.stringify(res.probabilities, null, 2)}</pre>`;
  } catch (err) {
    out.innerText = 'Error: ' + err.message;
  }
});

document.getElementById('batchBtn').addEventListener('click', async () => {
  const raw = document.getElementById('batch').value;
  const out = document.getElementById('batchResult');
  out.innerText = 'Predicting batch...';
  try {
    const items = JSON.parse(raw);
    const res = await postJson('/predict/batch', { items });
    out.innerHTML = `<pre>${JSON.stringify(res, null, 2)}</pre>`;
  } catch (err) {
    out.innerText = 'Error: ' + err.message;
  }
});
