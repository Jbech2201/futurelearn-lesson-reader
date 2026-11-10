# FutureLearn Lesson Reader

Chrome extension for reading a visible FutureLearn lesson, sending its text to the Inception chat completions API, and saving the lesson plus study draft in a local IndexedDB library.

For each captured step it requests an Indonesian summary, a grounded English discussion comment, whether hands-on work is explicitly required, the evidence, any lab task stated on the page, and missing information. It does not post comments, submit course answers, or control APNIC Virtual Lab. Review generated text and do the actual practical work yourself.

## Install

1. In Chrome, open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select this folder.
3. Open the extension's **API settings** and enter a newly created Inception API key. The key is saved in this Chrome profile's `storage.local`; this extension does not encrypt it. Never commit or share it.
4. Open a FutureLearn lesson, choose **Read current lesson**, then **Save & Analyze**.
5. Use **Open library** to review saved results or export the course library as JSON.

The extension sends lesson text to `https://api.inceptionlabs.ai/v1/chat/completions` using the `mercury-3` model when you press **Save & Analyze**. Only visible page text is captured, up to 24,000 characters. If the lab guide is a separate page or embedded content is missing, capture that page separately. The AI must mark unsupported hands-on requirements as **Unclear** rather than inventing them.

If a key is exposed, revoke it and create a replacement before use. The extension calls Inception directly from the browser; the key is stored locally in Chrome and lesson text is sent to Inception for analysis.
