(function() {
  const MAX_COLS = 50;
  const API_URL = 'https://ledictglm-api.onrender.com/predict';

  let columns = [];
  let darkMode = false;
  let currentTheme = 'blue';

  const container = document.getElementById('columnContainer');
  const colCountSpan = document.getElementById('colCount');
  const statusMsg = document.getElementById('statusMessage');
  const resultCard = document.getElementById('resultCard');
  const resultPred = document.getElementById('resultPrediction');
  const resultConf = document.getElementById('resultConfidence');
  const resultProbs = document.getElementById('resultProbs');
  const resultQuality = document.getElementById('resultDataQuality');
  const errorDiv = document.getElementById('errorMessage');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsDropdown = document.getElementById('settingsDropdown');
  const darkToggle = document.getElementById('darkToggle');
  const themeSelect = document.getElementById('themeSelect');

  settingsToggle.addEventListener('click', () => {
    settingsDropdown.style.display = settingsDropdown.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!settingsToggle.contains(e.target) && !settingsDropdown.contains(e.target)) {
      settingsDropdown.style.display = 'none';
    }
  });

  darkToggle.addEventListener('change', () => {
    darkMode = darkToggle.checked;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  });

  themeSelect.addEventListener('change', () => {
    currentTheme = themeSelect.value;
    document.documentElement.setAttribute('data-theme', (darkMode ? 'dark' : 'light') + ' ' + currentTheme);
  });

  function updateStatus() {
    colCountSpan.textContent = columns.length;
    statusMsg.textContent = columns.length === MAX_COLS ? 'Maximum columns reached' : 'Ready';
    document.getElementById('addColumnBtn').disabled = columns.length >= MAX_COLS;
  }

  function showError(msg, details = '') {
    errorDiv.innerHTML = msg + (details ? '<br><pre style="white-space:pre-wrap;font-size:0.8rem;margin-top:8px;background:#f1f1f1;padding:8px;border-radius:8px;">' + details + '</pre>' : '');
    errorDiv.style.display = 'block';
    setTimeout(() => { errorDiv.style.display = 'none'; }, 15000);
  }

  function hideError() { errorDiv.style.display = 'none'; }

  function getPlaceholder(type) {
    if (type === 'numeric') return 'e.g. 25.5';
    if (type === 'datetime') return 'YYYY-MM-DD';
    return 'e.g. Sunny';
  }

  function renderColumns() {
    container.innerHTML = '';
    if (columns.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'text-align:center; color:#94a3b8; padding:20px; font-style:italic;';
      emptyMsg.textContent = 'No columns yet. Click "Add Column" to start building your input.';
      container.appendChild(emptyMsg);
      updateStatus();
      return;
    }
    columns.forEach((col, index) => {
      const row = document.createElement('div');
      row.className = 'column-row';
      row.dataset.id = col.id;

      const idxSpan = document.createElement('span');
      idxSpan.className = 'col-index';
      idxSpan.textContent = '#' + (index+1);
      row.appendChild(idxSpan);

      const nameInput = document.createElement('input');
      nameInput.className = 'col-name';
      nameInput.type = 'text';
      nameInput.placeholder = 'Name (e.g. Temperature)';
      nameInput.value = col.name;
      nameInput.addEventListener('input', () => { col.name = nameInput.value; });
      row.appendChild(nameInput);

      const typeSelect = document.createElement('select');
      typeSelect.className = 'col-type';
      ['numeric', 'categorical', 'datetime'].forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
        if (t === col.type) opt.selected = true;
        typeSelect.appendChild(opt);
      });
      typeSelect.addEventListener('change', () => {
        col.type = typeSelect.value;
        updateValueInput(row, col);
      });
      row.appendChild(typeSelect);

      const valInput = document.createElement('input');
      valInput.className = 'col-value-input';
      valInput.type = col.type === 'datetime' ? 'date' : 'text';
      valInput.placeholder = getPlaceholder(col.type);
      valInput.value = col.value;
      valInput.addEventListener('input', () => { col.value = valInput.value; });
      row.appendChild(valInput);

      const meanLabel = document.createElement('label');
      meanLabel.className = 'col-mean';
      const meanCheck = document.createElement('input');
      meanCheck.type = 'checkbox';
      meanCheck.title = 'Use mean value from training data';
      meanCheck.checked = col.useMean || false;
      meanCheck.addEventListener('change', () => {
        col.useMean = meanCheck.checked;
        valInput.disabled = col.useMean;
        if (col.useMean) {
          valInput.value = '';
          valInput.placeholder = 'mean';
        } else {
          valInput.placeholder = getPlaceholder(col.type);
        }
      });
      meanLabel.appendChild(meanCheck);
      meanLabel.appendChild(document.createTextNode('Mean'));
      row.appendChild(meanLabel);

      const delBtn = document.createElement('button');
      delBtn.className = 'col-delete';
      delBtn.textContent = '✕';
      delBtn.title = 'Remove this column';
      delBtn.addEventListener('click', () => {
        columns = columns.filter(c => c.id !== col.id);
        renderColumns();
        updateStatus();
        hideError();
      });
      row.appendChild(delBtn);

      container.appendChild(row);
      if (col.useMean) {
        valInput.disabled = true;
        valInput.placeholder = 'mean';
      }
    });
    updateStatus();
  }

  function updateValueInput(row, col) {
    const valInput = row.querySelector('.col-value-input');
    if (valInput) {
      valInput.placeholder = col.useMean ? 'mean' : getPlaceholder(col.type);
      valInput.type = col.type === 'datetime' && !col.useMean ? 'date' : 'text';
    }
  }

  function addColumn(name = '', type = 'numeric', value = '', useMean = false) {
    if (columns.length >= MAX_COLS) return;
    const id = Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    columns.push({ id, name, type, value, useMean });
    renderColumns();
    hideError();
    container.scrollTop = container.scrollHeight;
  }

  function clearAll() {
    if (columns.length === 0) return;
    columns = [];
    renderColumns();
    resultCard.classList.remove('show');
    hideError();
    updateStatus();
  }

  function addMeanColumns() {
    const needed = MAX_COLS - columns.length;
    if (needed <= 0) {
      showError('Already have 50 columns.');
      return;
    }
    for (let i = 0; i < needed; i++) {
      const idx = columns.length + 1;
      addColumn('Feature' + idx, 'numeric', '', true);
    }
    updateStatus();
  }

  async function predict() {
    hideError();
    resultCard.classList.remove('show');

    try {
      // Build data object
      const dataObj = {};
      columns.forEach((col, idx) => {
        if (col.useMean) {
          dataObj[col.name || 'col_' + (idx+1)] = null;
        } else {
          let val = col.value.trim();
          if (col.type === 'numeric') {
            const num = parseFloat(val);
            if (!isNaN(num)) val = num;
          }
          dataObj[col.name || 'col_' + (idx+1)] = val;
        }
      });

      // Pad to 50 with null
      const currentCount = Object.keys(dataObj).length;
      if (currentCount < MAX_COLS) {
        for (let i = currentCount + 1; i <= MAX_COLS; i++) {
          dataObj['col_' + i] = null;
        }
      }

      if (columns.length === 0) {
        showError('Please add at least one column.');
        return;
      }

      statusMsg.innerHTML = '<span class="loading-spinner"></span> Predicting...';
      document.getElementById('predictBtn').disabled = true;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataObj })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        showError('Failed to parse server response as JSON.', responseText.substring(0, 500));
        return;
      }

      if (!response.ok) {
        const detail = result && result.detail ? result.detail : 'Server error (status ' + response.status + ')';
        showError(detail, responseText.substring(0, 500));
        return;
      }

      // Validate required fields
      if (typeof result.prediction === 'undefined' || typeof result.confidence === 'undefined') {
        showError('Incomplete response from server.', JSON.stringify(result, null, 2));
        return;
      }

      resultPred.textContent = 'Prediction: ' + result.prediction;
      resultConf.textContent = 'Confidence: ' + (result.confidence * 100).toFixed(1) + '%';

      resultProbs.innerHTML = '';
      if (result.probabilities && typeof result.probabilities === 'object') {
        const entries = Object.entries(result.probabilities);
        if (entries.length === 0) {
          resultProbs.innerHTML = '<div style="color:var(--text-muted);">No probability data available.</div>';
        } else {
          entries.sort((a, b) => b[1] - a[1]);
          entries.forEach(([label, prob]) => {
            if (typeof prob !== 'number' || isNaN(prob)) prob = 0;
            const pct = (prob * 100).toFixed(1);
            const div = document.createElement('div');
            div.className = 'prob-item';
            div.innerHTML = `
              <span style="min-width:60px;">${label}</span>
              <div class="prob-bar"><div class="fill" style="width:${pct}%;"></div></div>
              <span>${pct}%</span>
            `;
            resultProbs.appendChild(div);
          });
        }
      } else {
        resultProbs.innerHTML = '<div style="color:var(--text-muted);">Probability data unavailable.</div>';
      }

      resultQuality.textContent = 'Data quality: ' + (result.data_quality || '1.0');
      resultCard.classList.add('show');
      statusMsg.textContent = 'Prediction complete';

    } catch (err) {
      showError('Unexpected error: ' + err.message, err.stack || '');
    } finally {
      document.getElementById('predictBtn').disabled = false;
    }
  }

  document.getElementById('addColumnBtn').addEventListener('click', () => addColumn());
  document.getElementById('addMeanColumnsBtn').addEventListener('click', addMeanColumns);
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);
  document.getElementById('predictBtn').addEventListener('click', predict);

  renderColumns();
  for (let i = 0; i < 5; i++) {
    addColumn('Feature' + (i+1), 'numeric', '', false);
  }

  document.documentElement.setAttribute('data-theme', 'light blue');
})();
