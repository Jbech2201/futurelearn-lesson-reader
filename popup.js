const readButton = document.getElementById('read');
const analyzeButton = document.getElementById('analyze');
const result = document.getElementById('result');
const status = document.getElementById('status');
const analysis = document.getElementById('analysis');
let currentPage = null;

const DB_NAME = 'futurelearn-study-library';
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('lessons', { keyPath: 'url' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveLesson(entry) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lessons', 'readwrite');
    tx.objectStore('lessons').put(entry);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
function showAnalysis(data) {
  analysis.textContent = '';
  const heading = document.createElement('h2');
  heading.textContent = 'Draft result';
  const comment = document.createElement('p');
  comment.textContent = `English comment: ${data.english_comment || 'Not provided'}`;
  const handsOn = document.createElement('p');
  handsOn.textContent = `Hands-on: ${data.hands_on_required || 'Unclear'}${data.evidence ? ` — ${data.evidence}` : ''}`;
  const task = document.createElement('p');
  task.textContent = `Task: ${data.hands_on_task || 'No specific lab task identified in the captured text.'}`;
  const courseWork = document.createElement('p');
  courseWork.textContent = `Course step: ${data.course_action || 'Review the lesson and follow its on-page activity.'}`;
  const summary = document.createElement('p');
  summary.textContent = `Summary: ${data.summary_id || ''}`;
  const missing = document.createElement('p');
  missing.textContent = data.missing_info ? `Need more information: ${data.missing_info}` : '';
  analysis.append(heading, comment, handsOn, task, courseWork, summary, missing);
}

readButton.addEventListener('click', async () => {
  status.textContent = '';
  readButton.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.startsWith('https://www.futurelearn.com/')) {
      throw new Error('Open a FutureLearn lesson page first.');
    }
    const [{ result: page }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const root = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
        const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
        const title = clean(document.querySelector('h1')?.innerText || document.title);
        const text = clean(root.innerText).slice(0, 24000);
        return { title, url: location.href, text };
      }
    });
    currentPage = page;
    result.value = `TITLE: ${page.title}\nURL: ${page.url}\n\nPAGE TEXT:\n${page.text}`;
    analyzeButton.disabled = false;
    analysis.textContent = '';
    status.textContent = `Read “${page.title}” (${page.text.length} characters).`;
  } catch (error) {
    status.textContent = error.message || 'Could not read this page. Try reloading the lesson and opening the extension again.';
  } finally {
    readButton.disabled = false;
  }
});

analyzeButton.addEventListener('click', async () => {
  if (!currentPage) return;
  analyzeButton.disabled = true;
  status.textContent = 'Analyzing lesson…';
  try {
    const settings = await chrome.storage.local.get(['inceptionApiKey', 'inceptionModel']);
    if (!settings.inceptionApiKey) throw new Error('Add your replacement Inception API key in API settings first.');
    const model = settings.inceptionModel || 'mercury-3';
    const instructions = `You are a study assistant for an Internet operations course. Use only the supplied lesson text. Return valid JSON with keys: summary_id (concise Indonesian summary), english_comment (a natural 1-3 sentence English discussion comment grounded in this step; do not claim the learner performed actions), hands_on_required (Yes, No, or Unclear), evidence (short quote or paraphrase that supports the classification), hands_on_task (specific lab actions only if stated; otherwise say not specified), course_action (what the learner should do on this course step), missing_info (what additional lab guide or screenshot is needed, or empty string). Do not invent course requirements or claim work is complete.`;
    const response = await fetch('https://api.inceptionlabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${settings.inceptionApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `${instructions} Return only a valid JSON object.` },
          { role: 'user', content: `TITLE: ${currentPage.title}\nURL: ${currentPage.url}\n\nLESSON TEXT:\n${currentPage.text}` }
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 2500
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `API request failed (${response.status}).`);
    const output = payload.choices?.[0]?.message?.content;
    if (!output) throw new Error('The API returned no text.');
    const data = JSON.parse(output);
    const entry = { ...currentPage, analysis: data, model, savedAt: new Date().toISOString() };
    await saveLesson(entry);
    showAnalysis(data);
    status.textContent = 'Analysis saved to your local course library.';
  } catch (error) {
    status.textContent = error.message || 'Analysis failed. Check the API key and try again.';
  } finally {
    analyzeButton.disabled = false;
  }
});

document.getElementById('library').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('library.html') }));
document.getElementById('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
