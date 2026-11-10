const keyInput = document.getElementById('key');
const modelInput = document.getElementById('model');
const status = document.getElementById('status');
chrome.storage.local.get(['inceptionApiKey', 'inceptionModel']).then(settings => {
  keyInput.value = settings.inceptionApiKey || '';
  modelInput.value = settings.inceptionModel || 'mercury-3';
});
document.getElementById('save').addEventListener('click', async () => {
  const values = { inceptionApiKey: keyInput.value.trim(), inceptionModel: modelInput.value.trim() || 'mercury-3' };
  await chrome.storage.local.set(values);
  status.textContent = 'Saved in this browser profile.';
});
