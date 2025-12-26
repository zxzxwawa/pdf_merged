// app.js — 浏览器端 PDF 合并，按文件列表中的顺序合并
(function(){
  const fileInput = document.getElementById('fileInput');
  const fileListEl = document.getElementById('fileList');
  const mergeBtn = document.getElementById('mergeBtn');
  const statusEl = document.getElementById('status');

  // 当前文件数组（保持上传/用户调整的顺序）
  let files = [];

  function renderList(){
    fileListEl.innerHTML = '';
    if(files.length === 0){
      fileListEl.innerHTML = '<div class="small">未选择 PDF。使用上方文件选择或拖拽到此窗口（浏览器支持时）。</div>';
      return;
    }

    files.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'file-item';

      const meta = document.createElement('div');
      meta.className = 'file-meta';
      const name = document.createElement('div');
      name.className = 'file-name';
      name.textContent = file.name;
      const info = document.createElement('div');
      info.className = 'small';
      info.textContent = `${(file.size/1024|0)} KB`;

      meta.appendChild(name);
      meta.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'file-actions';

      const up = document.createElement('button'); up.textContent = '↑';
      up.title = '上移'; up.disabled = (idx===0);
      up.addEventListener('click', ()=>{ swap(idx, idx-1); });

      const down = document.createElement('button'); down.textContent = '↓';
      down.title = '下移'; down.disabled = (idx===files.length-1);
      down.addEventListener('click', ()=>{ swap(idx, idx+1); });

      const remove = document.createElement('button'); remove.textContent = '删除';
      remove.title = '从列表中移除';
      remove.addEventListener('click', ()=>{ files.splice(idx,1); renderList(); });

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(remove);

      item.appendChild(meta);
      item.appendChild(actions);
      fileListEl.appendChild(item);
    });
  }

  function swap(a,b){
    if(a<0||b<0||a>=files.length||b>=files.length) return;
    const tmp = files[a]; files[a]=files[b]; files[b]=tmp; renderList();
  }

  fileInput.addEventListener('change', (e)=>{
    const selected = Array.from(e.target.files || []);
    // 仅保留 PDF
    const pdfs = selected.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if(pdfs.length !== selected.length){
      alert('已过滤非 PDF 文件。');
    }
    // 将新选择追加到末尾（保留原有顺序）
    files = files.concat(pdfs);
    renderList();
    // 清空 input，以便可重复选择同一文件
    fileInput.value = '';
  });

  mergeBtn.addEventListener('click', async ()=>{
    if(files.length === 0){ alert('请先选择至少一个 PDF 文件。'); return; }
    mergeBtn.disabled = true;
    statusEl.textContent = '合并中 —— 请稍候...';
    try{
      await mergePdfFiles(files);
      statusEl.textContent = '合并完成，已触发下载。';
    }catch(err){
      console.error(err);
      alert('合并失败：' + (err && err.message ? err.message : err));
      statusEl.textContent = '合并失败，请查看控制台错误信息。';
    }finally{
      mergeBtn.disabled = false;
    }
  });

  // 合并实现（使用 pdf-lib）
  async function mergePdfFiles(fileArray){
    const PDFLib = window.PDFLib;
    if(!PDFLib || !PDFLib.PDFDocument) throw new Error('未能加载 pdf-lib。检查网络或 CDN。');

    const { PDFDocument } = PDFLib;
    // 新建目标文档
    const mergedPdf = await PDFDocument.create();

    for(let i=0;i<fileArray.length;i++){
      const file = fileArray[i];
      statusEl.textContent = `正在合并 (${i+1}/${fileArray.length})： ${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(arrayBuffer);
      const copied = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      copied.forEach(p => mergedPdf.addPage(p));
    }

    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // 延迟释放 url，确保浏览器已读取
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
  }

  // 初始渲染
  renderList();

})();
