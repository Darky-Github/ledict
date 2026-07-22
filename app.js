(function() {
  const MAX_COLS = 50;
  const API_URL = 'https://ledictglm-api.onrender.com/predict';

  let columns = [];

  const container = document.getElementById('columnContainer');
  const colCountSpan = document.getElementById('colCount');
  const statusMsg = document.getElementById('statusMessage');
  const resultCard = document.getElementById('resultCard');
  const resultPred = document.getElementById('resultPrediction');
  const resultConf = document.getElementById('resultConfidence');
  const resultProbs = document.getElementById('resultProbs');
  const resultQuality = document.getElementById('resultDataQuality');
  const errorDiv = document.getElementById('errorMessage');

  function updateStatus() {
    colCountSpan.textContent = columns.length;
    statusMsg.textContent = columns.length === MAX_COLS ? 'Maximum columns reached' : 'Ready';
    document.getElementById('addColumnBtn').disabled = columns.length >= MAX_COLS;
  }

  function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => { errorDiv.style.display = 'none'; }, 6000);
  }

  function hideError() { errorDiv.style.display = 'none'; }

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
        // Update value input placeholder and disable state
        updateValueInput(row, col);
      });
      row.appendChild(typeSelect);

      // Value input
      const valInput = document.createElement('input');
      valInput.className = 'col-value-input';
      valInput.type = col.type === 'datetime' ? 'date' : 'text';
      valInput.placeholder = getPlaceholder(col.type);
      valInput.value = col.value;
      valInput.addEventListener('input', () => { col.value = valInput.value; });
      row.appendChild(valInput);

      // Mean checkbox
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

      // Delete button
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
      // Apply initial disabled state if mean is checked
      if (col.useMean) {
        valInput.disabled = true;
        valInput.placeholder = 'mean';
      }
    });
    updateStatus();
  }

  function getPlaceholder(type) {
    if (type === 'numeric') return 'e.g. 25.5';
    if (type === 'datetime') return 'YYYY-MM-DD';
    return 'e.g. Sunny';
  }

  function updateValueInput(row, col) {
    const valInput = row.querySelector('.col-value-input');
    if (valInput) {
      valInput.placeholder = col.useMean ? 'mean' : getPlaceholder(col.type);
      valInput.type = col.type === 'datetime' && !col.useMean ? 'date' : 'text';
    }
  }

  function addColumn(name = '', type = 'numeric', value = '', useMean = false) {
    if (columns.length >= MAX_COLS) {
      showError('Maximum ' + MAX_COLS + ' columns reached.');
      return;
    }
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

  // Sample data loaders (unchanged, but now with useMean = false)
  function loadSample(sampleName) {
    clearAll();
    let sampleData = [];
    const generateGroup = (namePrefix, typePattern, valueFn) => {
      for (let g = 0; g < 10; g++) {
        const vals = valueFn(g);
        for (let j = 0; j < 5; j++) {
          const name = namePrefix + (g+1) + (j+1);
          const type = typePattern[j];
          const value = String(vals[j]);
          sampleData.push({ name, type, value, useMean: false });
        }
      }
    };
    switch(sampleName) {
      case 'weather':
        generateGroup('T', ['numeric','numeric','categorical','numeric','datetime'],
          (g) => {
            const baseDate = new Date(2024,5,15+g);
            return [
              (20 + g*0.5 + Math.random()*2).toFixed(1),
              (55 + g*1.5 + Math.random()*5).toFixed(0),
              (1010 + g*0.8 + Math.random()*10).toFixed(0),
              (8 + g*1.2 + Math.random()*4).toFixed(0),
              baseDate.toISOString().split('T')[0]
            ];
          });
        break;
      case 'cpu':
        generateGroup('C', ['numeric','numeric','numeric','numeric','datetime'],
          (g) => {
            const baseDate = new Date(2024,6,10+g);
            return [
              (50 + g*3 + Math.random()*10).toFixed(1),
              (2500 + g*80 + Math.random()*400).toFixed(0),
              (20 + g*0.5 + Math.random()*3).toFixed(1),
              (70 + g*5 + Math.random()*20).toFixed(0),
              baseDate.toISOString().split('T')[0]
            ];
          });
        break;
      case 'exam':
        generateGroup('E', ['numeric','numeric','numeric','numeric','numeric'],
          (g) => {
            return [
              (50 + g*2 + Math.random()*15).toFixed(0),
              (1.5 + g*0.3 + Math.random()*1.2).toFixed(1),
              (45 + g*2 + Math.random()*10).toFixed(0),
              (4 + g*0.3 + Math.random()*2).toFixed(1),
              (6 + g*0.2 + Math.random()*2).toFixed(1)
            ];
          });
        break;
      case 'maths_good':
        generateGroup('M', ['numeric','numeric','numeric','numeric','numeric'],
          (g) => {
            return [
              (85 + g*0.5 + Math.random()*3).toFixed(0),
              (5.0 + g*0.1 + Math.random()*0.8).toFixed(1),
              (10 + g*0.2 + Math.random()*1.5).toFixed(1),
              (8.0 + g*0.1 + Math.random()*0.8).toFixed(1),
              (1.5 - g*0.05 + Math.random()*0.5).toFixed(1)
            ];
          });
        break;
      case 'maths_bad':
        generateGroup('M', ['numeric','numeric','numeric','numeric','numeric'],
          (g) => {
            return [
              (35 + g*0.5 + Math.random()*5).toFixed(0),
              (1.0 + g*0.1 + Math.random()*0.5).toFixed(1),
              (2.0 + g*0.2 + Math.random()*1.0).toFixed(1),
              (3.5 + g*0.1 + Math.random()*0.8).toFixed(1),
              (8.5 - g*0.1 + Math.random()*0.8).toFixed(1)
            ];
          });
        break;
      default: return;
    }
    let added = 0;
    for (let item of sampleData) {
      if (added >= MAX_COLS) break;
      addColumn(item.name, item.type, item.value, item.useMean);
      added++;
    }
    updateStatus();
  }

  async function predict() {
    hideError();
    resultCard.classList.remove('show');

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

    if (columns.length === 0) {
      showError('Please add at least one column.');
      return;
    }
    if (columns.length !== 50) {
      showError('Model expects exactly 50 features. You have ' + columns.length + '. Please add ' + (50 - columns.length) + ' more or use "Mean" for the rest.');
      return;
    }

    statusMsg.innerHTML = '<span class="loading-spinner"></span> Predicting...';
    document.getElementById('predictBtn').disabled = true;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataObj })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || 'Server error');
      }
      resultPred.textContent = 'Prediction: ' + result.prediction;
      resultConf.textContent = 'Confidence: ' + (result.confidence * 100).toFixed(1) + '%';
      resultProbs.innerHTML = '';
      const probs = result.probabilities;
      const sorted = Object.entries(probs).sort((a,b) => b[1]-a[1]);
      sorted.forEach(([label, prob]) => {
        const div = document.createElement('div');
        div.className = 'prob-item';
        div.innerHTML = `
          <span style="min-width:60px;">${label}</span>
          <div class="prob-bar"><div class="fill" style="width:${prob*100}%;"></div></div>
          <span>${(prob*100).toFixed(1)}%</span>
        `;
        resultProbs.appendChild(div);
      });
      resultQuality.textContent = 'Data quality: ' + (result.data_quality || '1.0');
      resultCard.classList.add('show');
      statusMsg.textContent = 'Prediction complete';
    } catch (err) {
      showError(err.message || 'Prediction failed. Check your input or API status.');
      statusMsg.textContent = 'Error';
    } finally {
      document.getElementById('predictBtn').disabled = false;
    }
  }

  // Event listeners
  document.getElementById('addColumnBtn').addEventListener('click', () => addColumn());
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);
  document.getElementById('predictBtn').addEventListener('click', predict);

  document.querySelectorAll('[data-sample]').forEach(btn => {
    btn.addEventListener('click', () => {
      loadSample(btn.dataset.sample);
    });
  });

  // Initial render with 5 empty columns (useMean false)
  renderColumns();
  for (let i = 0; i < 5; i++) {
    addColumn('Feature' + (i+1), 'numeric', '', false);
  }
})();
