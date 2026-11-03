const style = document.createElement('style');
style.textContent = `html,body,#root{height:100%;margin:0;background:#F7F9FA}body{overflow:hidden}*{box-sizing:border-box}::selection{background:#dce3e9;color:#1c2b39}input,textarea{caret-color:#1c2b39}:focus-visible{outline:2px solid #1c2b39;outline-offset:3px}::-webkit-scrollbar{width:9px;height:9px}::-webkit-scrollbar-thumb{background:#adb8c2;border-radius:8px}::-webkit-scrollbar-track{background:#f0f3f5}`;
document.head.appendChild(style);
document.title = 'Rositrus · Local POS';
void navigator.storage?.persist?.().catch(() => undefined);
