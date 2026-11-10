const DB_NAME = 'futurelearn-study-library';
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('lessons', { keyPath: 'url' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function allLessons() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction('lessons').objectStore('lessons').getAll();
    req.onsuccess = () => { db.close(); resolve(req.result.sort((a, b) => a.savedAt.localeCompare(b.savedAt))); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
async function render() {
  const list = await allLessons();
  const root = document.getElementById('lessons');
  root.textContent = '';
  if (!list.length) { root.textContent = 'No lessons saved yet.'; return; }
  for (const item of list) {
    const article = document.createElement('article');
    const title = document.createElement('h2'); title.textContent = item.title;
    const link = document.createElement('a'); link.href = item.url; link.textContent = 'Open course step'; link.target = '_blank';
    const comment = document.createElement('p'); comment.textContent = `English comment: ${item.analysis?.english_comment || 'No analysis'}`;
    const hands = document.createElement('p'); hands.textContent = `Hands-on: ${item.analysis?.hands_on_required || 'Unclear'} — ${item.analysis?.hands_on_task || 'No task identified'}`;
    const course = document.createElement('p'); course.textContent = `Course action: ${item.analysis?.course_action || 'Not identified'}`;
    const extra = document.createElement('p'); extra.textContent = `Summary: ${item.analysis?.summary_id || ''}${item.analysis?.missing_info ? ` | Need more info: ${item.analysis.missing_info}` : ''}`;
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Captured lesson text';
    const pre = document.createElement('pre'); pre.textContent = item.text;
    details.append(summary, pre);
    article.append(title, link, comment, hands, course, extra, details);
    root.append(article);
  }
}
document.getElementById('export').addEventListener('click', async () => {
  const blob = new Blob([JSON.stringify(await allLessons(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'futurelearn-study-library.json'; link.click();
  URL.revokeObjectURL(url);
});
document.getElementById('clear').addEventListener('click', async () => {
  if (!confirm('Delete all saved lesson text and analyses from this browser?')) return;
  indexedDB.deleteDatabase(DB_NAME);
  await render();
});
render();
