(() => {
  const qs = (sel) => document.querySelector(sel);

  const input = qs('#inputRaw');
  const autoDecode = qs('#autoDecode');
  const btnDecode = qs('#btnDecode');
  const btnClear = qs('#btnClear');
  const btnCopy = qs('#btnCopy');
  const btnExample = qs('#btnExample');
  const output = qs('#outputJson');
  const notice = qs('#errorBox');

  function setNotice(message, type = '') {
    notice.className = 'notice' + (type ? ' ' + type : '');
    notice.textContent = message || '';
  }

  function setOutput(text) {
    output.textContent = text || '';
  }

  function debounce(fn, delay = 300) {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), delay);
    };
  }

  function normalizeBase64(input) {
    let s = (input || '').trim();
    s = s.replace(/\s+/g, '');
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4;
    if (pad) s = s + '='.repeat(4 - pad);
    return s;
  }

  function base64ToUtf8(b64) {
    const binary = atob(b64);
    if (typeof TextDecoder !== 'undefined') {
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
    // Fallback for very old browsers
    return decodeURIComponent(escape(binary));
  }

  function utf8ToBase64(str) {
    if (typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    }
    // Fallback
    return btoa(unescape(encodeURIComponent(str)));
  }

  function base64UrlEncodeFromUtf8(str) {
    const b64 = utf8ToBase64(str);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function safeUrlDecode(text) {
    // Replace '+' with whitespace as some implementations use it for space
    const replaced = (text || '').replace(/\+/g, ' ');
    try {
      return decodeURIComponent(replaced);
    } catch (e) {
      return text; // keep original when not a valid URI component
    }
  }

  function truncate(text, max = 240) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  function runDecodePipeline(raw) {
    const steps = [];

    const urlDecoded = safeUrlDecode(raw);
    if (urlDecoded !== raw) {
      steps.push('URL 解码成功');
    } else {
      steps.push('URL 解码跳过（看起来无需解码）');
    }

    const b64 = normalizeBase64(urlDecoded);
    let jsonText = '';
    try {
      jsonText = base64ToUtf8(b64);
      steps.push('Base64 解码成功');
    } catch (e) {
      throw new Error('Base64 解码失败：' + e.message + '。请检查是否为有效的 Base64 字符串。');
    }

    try {
      const data = JSON.parse(jsonText);
      return { data, steps };
    } catch (e) {
      throw new Error('JSON 解析失败：' + e.message + '。原文片段：' + truncate(jsonText));
    }
  }

  function decodeNow() {
    const raw = input.value.trim();
    if (!raw) {
      setOutput('');
      setNotice('');
      return;
    }
    try {
      const res = runDecodePipeline(raw);
      setOutput(JSON.stringify(res.data, null, 2));
      setNotice('解码成功：' + res.steps.join('，'), 'success');
    } catch (e) {
      setOutput('');
      setNotice(String(e.message || e), 'error');
    }
  }

  const decodeDebounced = debounce(() => {
    if (autoDecode.checked) decodeNow();
  }, 300);

  function clearAll() {
    input.value = '';
    setOutput('');
    setNotice('');
    input.focus();
  }

  async function copyResult() {
    const text = output.textContent || '';
    if (!text) {
      setNotice('没有可复制的结果', 'error');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(output);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
      }
      setNotice('已复制到剪贴板', 'success');
    } catch (e) {
      setNotice('复制失败：' + (e.message || e), 'error');
    }
  }

  function fillExample() {
    const example = {
      name: '测试',
      message: '你好，世界',
      id: 123,
      ok: true,
      list: [1, 2, 3],
      when: '2025-01-01T12:34:56Z'
    };
    const json = JSON.stringify(example);
    const encoded = encodeURIComponent(base64UrlEncodeFromUtf8(json));
    input.value = encoded;
    if (autoDecode.checked) decodeNow();
    else setNotice('已填充示例，点击“解码”查看结果', 'success');
  }

  // Bind events
  btnDecode.addEventListener('click', decodeNow);
  btnClear.addEventListener('click', clearAll);
  btnCopy.addEventListener('click', copyResult);
  btnExample.addEventListener('click', fillExample);
  input.addEventListener('input', decodeDebounced);

  setNotice('粘贴内容到左侧，系统会尝试自动解码');
})();


