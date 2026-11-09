'use strict';

// Site estático: a autorização para PUBLICAR é feita pelo próprio GitHub.
// O token é mantido exclusivamente em memória, nunca em localStorage ou no repositório.
const $ = id => document.getElementById(id);
const DEFAULT_THEMES = [
  {id:'institucional',name:'Institucional',description:'O visual original da Seridóplast',image:'assets/wallpaper-base.png',sectorColor:'#ffffff',nameColor:'#ffffff',sectorSize:95,nameSize:65,x:89.5,y:19,maxWidth:34,align:'right'}
];
const LIMITS = {sectorSize:[38,110],nameSize:[30,88],x:[15,90],y:[10,76],maxWidth:[20,80]};
const loadedImages = new Map();
let themes = DEFAULT_THEMES.map(t=>({...t}));
let selectedThemeId = themes[0].id;
let previewNonce = 0;
let draftThemes = [];
let editingId = null;
let uploadedImageData = null;
let github = null;
let baseSha = null;
let toastTimeout;

const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const clampNumber = (value,min,max,fallback) => Number.isFinite(Number(value)) ? clamp(Number(value),min,max) : fallback;
const getSelectedTheme = () => themes.find(t=>t.id===selectedThemeId) || themes[0];
function userTheme(theme){
  return {...theme,
    sectorSize:theme.sectorSize*Number($('userSectorSize').value)/100,
    nameSize:theme.nameSize*Number($('userNameSize').value)/100,
    maxWidth:Number($('userMaxWidth').value)};
}
function syncTextControls(reset=false){
  if(reset){$('userSectorSize').value=100;$('userNameSize').value=100;$('userMaxWidth').value=getSelectedTheme().maxWidth;}
  for(const [id,label] of [['userSectorSize','userSectorSizeVal'],['userNameSize','userNameSizeVal'],['userMaxWidth','userMaxWidthVal']])$(label).textContent=$(id).value;
}
const imgUrl = theme => theme?.imageData || theme?.image || 'assets/wallpaper-base.png';
function normalizeTheme(raw){
  if(!raw || typeof raw!=='object') return null;
  const id=String(raw.id||'').trim();
  if(!/^[a-z0-9_-]{1,70}$/.test(id))return null;
  const color = (value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'') ? value : fallback;
  return {
    id, name:String(raw.name||'Tema').slice(0,48),description:String(raw.description||'').slice(0,90),
    image:String(raw.image||'assets/wallpaper-base.png'),
    sectorColor:color(raw.sectorColor??raw.roleColor,'#ffffff'),nameColor:color(raw.nameColor,'#ffffff'),
    sectorSize:clampNumber(raw.sectorSize??raw.roleSize,38,110,95),nameSize:clampNumber(raw.nameSize,30,88,65),
    x:clampNumber(raw.x,15,90,89.5),y:clampNumber(raw.y,10,76,19),maxWidth:clampNumber(raw.maxWidth,20,80,34),
    align:['center','left','right'].includes(raw.align)?raw.align:'right'
  };
}
function notify(message){
  const el=$('toast');el.textContent=message;el.classList.add('show');
  clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),3600);
}
function setAdminMessage(message='',status=''){
  const el=$('adminMessage');el.textContent=message;el.className='admin-message'+(status?' '+status:'');
}
function buttonBusy(btn,isBusy,text){
  if(isBusy){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.textContent=text||'Aguarde...';}
  else{btn.disabled=false;btn.textContent=btn.dataset.oldText||btn.textContent;}
}

// Fonts loaded on the website are also used when drawing the exported PNG.
async function ensureFonts(){
  try { await Promise.all([document.fonts.load('600 76px Poppins'),document.fonts.load('300 54px Poppins')]); }
  catch(e){ console.warn('Fonte externa indisponível; usando fonte substituta.',e); }
}
function getImage(src){
  if(loadedImages.has(src))return loadedImages.get(src);
  const promise=new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Não foi possível abrir a imagem deste tema.'));
    img.src=src;
  });
  loadedImages.set(src,promise);
  return promise;
}
function coverImage(ctx,img,w,h){
  const ratio=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  const destWidth=img.naturalWidth*ratio,destHeight=img.naturalHeight*ratio;
  ctx.drawImage(img,(w-destWidth)/2,(h-destHeight)/2,destWidth,destHeight);
}
function measureLines(ctx,text,maxWidth){
  const paragraphs=String(text).split(/\n/);
  const result=[];
  for(const paragraph of paragraphs){
    const words=paragraph.trim().replace(/\s+/g,' ').split(' ').filter(Boolean);
    if(!words.length){result.push(' ');continue;}
    let line='';
    for(const word of words){
      const next=line?line+' '+word:word;
      if(line&&ctx.measureText(next).width>maxWidth){result.push(line);line=word;}
      else{line=next;}
    }
    if(line)result.push(line);
  }
  return result.length?result:[' '];
}
function fitText(ctx,text,size,weight,maxWidth,maxLines,scale){
  let fontSize=size*scale;
  const minSize=Math.max(20*scale,fontSize*.48);
  let lines=[];
  for(let tries=0;tries<38;tries++){
    ctx.font=`${weight} ${fontSize}px Poppins, Arial, sans-serif`;
    lines=measureLines(ctx,text,maxWidth);
    const widest=Math.max(...lines.map(line=>ctx.measureText(line).width));
    if(lines.length<=maxLines && widest<=maxWidth+1) break;
    if(fontSize<=minSize)break;
    fontSize=Math.max(minSize,fontSize*.94);
  }
  // A very long full name may require a third line rather than clipping letters.
  return {fontSize,lines};
}
async function renderWallpaper(canvas,theme,sector,name){
  if(!theme)return;
  const ctx=canvas.getContext('2d',{alpha:false});
  const w=canvas.width,h=canvas.height,scale=w/2048;
  ctx.fillStyle='#303033';ctx.fillRect(0,0,w,h);
  const img=await getImage(imgUrl(theme));
  coverImage(ctx,img,w,h);
  const maxW=w*theme.maxWidth/100;
  const x=w*theme.x/100;
  const sectorText=(sector||'Setor').trim();
  const nameText=(name||'Nome pessoa').trim();
  const sectorFit=fitText(ctx,sectorText,theme.sectorSize,600,maxW,2,scale);
  const nameFit=fitText(ctx,nameText,theme.nameSize,300,maxW,2,scale);
  const sectorLineHeight=sectorFit.fontSize*1.18;
  const nameLineHeight=nameFit.fontSize*1.29;
  const sectorBlockHeight=sectorFit.lines.length*sectorLineHeight;
  const sectorCenterY=h*theme.y/100;
  ctx.textAlign=theme.align;
  ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,.20)';ctx.shadowBlur=3*scale;ctx.shadowOffsetY=1.3*scale;
  ctx.fillStyle=theme.sectorColor;ctx.font=`600 ${sectorFit.fontSize}px Poppins, Arial, sans-serif`;
  sectorFit.lines.forEach((line,index)=>ctx.fillText(line,x,sectorCenterY-sectorBlockHeight/2+sectorLineHeight*(index+.5),maxW));
  ctx.fillStyle=theme.nameColor;ctx.font=`300 ${nameFit.fontSize}px Poppins, Arial, sans-serif`;
  const nameTop=sectorCenterY+sectorBlockHeight/2+h*.018;
  nameFit.lines.forEach((line,index)=>ctx.fillText(line,x,nameTop+nameLineHeight*(index+.5),maxW));
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
}
async function updatePreview(){
  const nonce=++previewNonce;
  const theme=getSelectedTheme();
  try{
    await ensureFonts();
    if(nonce!==previewNonce)return;
    const source=await getImage(imgUrl(theme));
    if(nonce!==previewNonce)return;
    const canvas=$('wallpaperCanvas');
    // One render per state change; guard against fast theme switching.
    await renderWallpaper(canvas,userTheme(theme),$('sectorInput').value,$('nameInput').value);
    $('previewDimensions').textContent=`${source.naturalWidth} × ${source.naturalHeight} · Visualização`;
  }catch(e){notify(e.message);console.error(e);}
}
function createThemeCard(theme){
  const btn=document.createElement('button');btn.type='button';btn.className='theme-choice';
  btn.setAttribute('role','radio');btn.setAttribute('aria-checked',String(theme.id===selectedThemeId));
  btn.setAttribute('aria-label',theme.name);btn.addEventListener('click',()=>{selectedThemeId=theme.id;syncTextControls(true);refreshThemeList();updatePreview();});
  const thumb=document.createElement('span');thumb.className='theme-thumb';thumb.style.backgroundImage=`url(${JSON.stringify(imgUrl(theme))})`;
  const text=document.createElement('span');text.className='theme-copy';
  const name=document.createElement('strong');name.textContent=theme.name;
  const desc=document.createElement('small');desc.textContent=theme.description;
  text.append(name,desc);
  const radio=document.createElement('span');radio.className='radio-visual';radio.setAttribute('aria-hidden','true');
  btn.append(thumb,text,radio);return btn;
}
function refreshThemeList(){
  const list=$('themeList');list.replaceChildren(...themes.map(createThemeCard));
}
async function loadPublicThemes(){
  try{
    const response=await fetch('./themes.json',{cache:'no-store'});
    if(!response.ok)throw Error('Falha ao carregar temas.json');
    const data=await response.json();
    const items=Array.isArray(data.themes)?data.themes.map(normalizeTheme).filter(Boolean):[];
    if(items.length)themes=items;
  }catch(e){console.warn('Usando tema local de reserva:',e.message);}
  selectedThemeId=themes[0].id;
  syncTextControls(true);refreshThemeList();updatePreview();
}
async function downloadWallpaper(){
  const btn=$('downloadBtn');buttonBusy(btn,true,'Gerando PNG...');
  try{
    const [w,h]=$('resolutionSelect').value.split('x').map(Number);
    const c=document.createElement('canvas');c.width=w;c.height=h;
    await ensureFonts();await renderWallpaper(c,userTheme(getSelectedTheme()),$('sectorInput').value,$('nameInput').value);
    const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Não foi possível gerar o arquivo.')),'image/png'));
    const url=URL.createObjectURL(blob);
    const cleanName=($('nameInput').value||'wallpaper').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,50)||'wallpaper';
    const a=document.createElement('a');a.download=`seridoplast-${cleanName}-${w}x${h}.png`;a.href=url;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);notify('Wallpaper PNG gerado com sucesso!');
  }catch(e){notify('Erro ao gerar imagem: '+e.message);console.error(e);}finally{buttonBusy(btn,false);}
}

// ----- Administration: validated GitHub identity and repository write access -----
function openAdmin(){
  $('adminModal').hidden=false;document.body.style.overflow='hidden';
  setAdminMessage();$('closeAdmin').focus();
}
function closeAdmin(){
  $('adminModal').hidden=true;document.body.style.overflow='';
  setAdminMessage();
}
async function apiRequest(method,path,body){
  if(!github)throw Error('Conecte-se ao GitHub primeiro.');
  const response=await fetch(`https://api.github.com${path}`,{
    method,headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${github.token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  let data;
  try{data=await response.json();}catch{data={};}
  if(!response.ok){
    const detail=String(data.message||response.statusText||'Erro na API');
    throw Error(`${response.status}: ${detail}${response.status===401?' (token inválido ou expirado)':''}${response.status===403?' (confira as permissões do token)':''}`);
  }
  return data;
}
function apiPath(filepath){
  const {owner,repo}=github;
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filepath.split('/').map(encodeURIComponent).join('/')}`;
}
function withBranch(path){return path+`?ref=${encodeURIComponent(github.branch)}`;}
function fromBase64Unicode(str){
  const raw=atob(str.replace(/\s/g,''));
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function toBase64Unicode(str){
  const bytes=new TextEncoder().encode(str);let result='';
  // Use blocks to avoid a stack overflow for large theme manifests.
  for(let i=0;i<bytes.length;i+=16384){result+=String.fromCharCode(...bytes.subarray(i,i+16384));}
  return btoa(result);
}
async function getManifest(){
  const file=await apiRequest('GET',withBranch(apiPath('themes.json')));
  if(!file.content)throw Error('themes.json não encontrado. Verifique se o projeto está na branch selecionada.');
  return {sha:file.sha,data:JSON.parse(fromBase64Unicode(file.content))};
}
async function connectGitHub(){
  const btn=$('connectGitHub');
  const owner=$('repoOwner').value.trim(),repo=$('repoName').value.trim(),branch=$('repoBranch').value.trim()||'main';
  const token=$('githubToken').value.trim();
  if(!/^[\w.-]+$/.test(owner)||!/^[\w.-]+$/.test(repo)||!branch||!token){setAdminMessage('Informe usuário, repositório, branch e token válido.','error');return;}
  buttonBusy(btn,true,'Validando acesso...');setAdminMessage();
  try{
    github={owner,repo,branch,token};
    const [user,repository]=await Promise.all([
      apiRequest('GET','/user'),apiRequest('GET',`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
    ]);
    if(repository.permissions?.push===false)throw Error('Este token não possui acesso de escrita ao repositório.');
    const manifest=await getManifest();
    const list=Array.isArray(manifest.data.themes)?manifest.data.themes.map(normalizeTheme).filter(Boolean):[];
    if(!list.length)throw Error('themes.json não contém nenhum tema válido.');
    draftThemes=list;baseSha=manifest.sha;
    $('adminLogin').hidden=true;$('adminDashboard').hidden=false;
    $('connectedLabel').textContent=`${user.login} · ${owner}/${repo} · ${branch}`;
    $('githubToken').value='';
    $('adminEditor').hidden=true;
    renderAdminThemeList();
    notify('Autorizado para gerenciar temas.');
  }catch(e){github=null;setAdminMessage('Não foi possível conectar: '+e.message,'error');}
  finally{buttonBusy(btn,false);}
}
function disconnectGitHub(){
  github=null;baseSha=null;draftThemes=[];uploadedImageData=null;editingId=null;
  $('adminDashboard').hidden=true;$('adminLogin').hidden=false;
  $('adminEditor').hidden=true;setAdminMessage();notify('Sessão administrativa encerrada.');
}
function renderAdminThemeList(){
  const list=$('adminThemeList');list.replaceChildren();
  for(const theme of draftThemes){
    const row=document.createElement('div');row.className='admin-theme-row';
    const thumb=document.createElement('span');thumb.className='admin-theme-image';thumb.style.backgroundImage=`url(${JSON.stringify(imgUrl(theme))})`;
    const info=document.createElement('div');info.className='admin-theme-info';
    const title=document.createElement('strong');title.textContent=theme.name;
    const description=document.createElement('small');description.textContent=theme.description||'Sem descrição';
    info.append(title,description);
    const edit=document.createElement('button');edit.type='button';edit.className='ghost-mini';edit.textContent='Editar';edit.addEventListener('click',()=>startThemeEdit(theme.id));
    const remove=document.createElement('button');remove.type='button';remove.className='ghost-mini danger';remove.textContent='Excluir';
    remove.addEventListener('click',()=>removeDraftTheme(theme.id));
    row.append(thumb,info,edit,remove);list.append(row);
  }
}
function removeDraftTheme(id){
  if(draftThemes.length===1){setAdminMessage('É necessário manter pelo menos um tema.','error');return;}
  const t=draftThemes.find(t=>t.id===id);
  if(!t||!confirm(`Excluir o tema “${t.name}” da próxima publicação?`))return;
  draftThemes=draftThemes.filter(t=>t.id!==id);
  if(editingId===id)$('adminEditor').hidden=true;
  renderAdminThemeList();setAdminMessage('Tema removido do rascunho. Clique em Publicar para atualizar o site.','success');
}
function defaultNewTheme(){
  return {...DEFAULT_THEMES[0],id:'',name:'',description:'',image:'assets/wallpaper-base.png'};
}
function setEditFields(theme){
  $('editThemeName').value=theme.name;
  $('editThemeDescription').value=theme.description;
  $('editSectorColor').value=theme.sectorColor;
  $('editNameColor').value=theme.nameColor;
  $('editAlign').value=theme.align;
  for(const [field,key] of [['editSectorSize','sectorSize'],['editNameSize','nameSize'],['editX','x'],['editY','y'],['editMaxWidth','maxWidth']])$(field).value=theme[key];
  $('editThemeImage').value='';
  updateSliderLabels();
}
function updateSliderLabels(){
  for(const [field,out] of [['editSectorSize','sectorSizeVal'],['editNameSize','nameSizeVal'],['editX','xVal'],['editY','yVal'],['editMaxWidth','maxWidthVal']])$(out).textContent=$(field).value;
}
function startThemeEdit(id=null){
  editingId=id;
  uploadedImageData=null;
  const existing=id?draftThemes.find(t=>t.id===id):null;
  const theme=existing||defaultNewTheme();
  $('editorHeading').textContent=existing?`Editar · ${theme.name}`:'Criar novo tema';
  $('adminEditor').hidden=false;
  setEditFields(theme);
  renderAdminPreview();
  $('adminEditor').scrollIntoView({behavior:'smooth',block:'nearest'});
  $('editThemeName').focus();setAdminMessage();
}
function editorTheme(){
  const prior=editingId?draftThemes.find(t=>t.id===editingId):defaultNewTheme();
  if(!prior)return defaultNewTheme();
  return {
    ...prior,name:$('editThemeName').value.trim(),description:$('editThemeDescription').value.trim(),
    sectorColor:$('editSectorColor').value,nameColor:$('editNameColor').value,
    sectorSize:Number($('editSectorSize').value),nameSize:Number($('editNameSize').value),
    x:Number($('editX').value),y:Number($('editY').value),maxWidth:Number($('editMaxWidth').value),
    align:$('editAlign').value,
    ...(uploadedImageData?{imageData:uploadedImageData}:{})
  };
}
let editPreviewNonce=0;
async function renderAdminPreview(){
  const nonce=++editPreviewNonce;
  const theme=editorTheme();
  try{
    await ensureFonts();
    if(nonce!==editPreviewNonce)return;
    await renderWallpaper($('adminPreview'),theme,$('sectorInput').value,$('nameInput').value);
  }catch(e){setAdminMessage(e.message,'error');}
}
async function convertImageToWebp(file){
  if(file.size>25*1024*1024)throw Error('Imagem muito grande. Limite: 25 MB.');
  if(!/^image\/(png|jpeg|webp|avif)$/.test(file.type))throw Error('Use uma imagem PNG, JPG, WebP ou AVIF.');
  const url=URL.createObjectURL(file);
  try{
    const img=await getImage(url);
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1152;
    const ctx=canvas.getContext('2d',{alpha:false});coverImage(ctx,img,2048,1152);
    const data=canvas.toDataURL('image/webp',.94);
    if(!data.startsWith('data:image/webp;'))throw Error('Seu navegador não suporta exportação WebP. Use Chrome, Edge ou Firefox recente.');
    return data;
  }finally{URL.revokeObjectURL(url);loadedImages.delete(url);}
}
async function onThemeImageUpload(){
  const file=$('editThemeImage').files?.[0];if(!file)return;
  setAdminMessage('Otimizando imagem para o wallpaper...');
  try{uploadedImageData=await convertImageToWebp(file);setAdminMessage('Imagem preparada. Salve o tema e depois publique.','success');renderAdminPreview();}
  catch(e){uploadedImageData=null;setAdminMessage(e.message,'error');}
}
function slugify(str){return str.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,43)||'tema';}
function saveThemeDraft(){
  const theme=editorTheme();
  if(!theme.name){setAdminMessage('Digite o nome do tema.','error');$('editThemeName').focus();return;}
  if(editingId){
    const idx=draftThemes.findIndex(t=>t.id===editingId);
    if(idx<0)return;
    draftThemes[idx]=theme;
  }else{
    theme.id=`${slugify(theme.name)}-${Math.random().toString(36).slice(2,7)}`;
    draftThemes.push(theme);
  }
  $('adminEditor').hidden=true;
  editingId=null;uploadedImageData=null;
  renderAdminThemeList();setAdminMessage('Tema salvo no rascunho. Clique em “Publicar no GitHub” para disponibilizá-lo a todos.','success');
}
async function putGitHubFile(filepath,content,message,sha){
  const payload={message,content,branch:github.branch};
  if(sha)payload.sha=sha;
  return apiRequest('PUT',apiPath(filepath),payload);
}
async function publishThemes(){
  if(!github)return;
  if(!$('adminEditor').hidden){setAdminMessage('Salve ou cancele a edição do tema antes de publicar.','error');return;}
  const btn=$('publishThemes');buttonBusy(btn,true,'Publicando...');setAdminMessage();
  try{
    const latest=await getManifest();
    if(latest.sha!==baseSha)throw Error('Os temas foram alterados no GitHub desde o login. Saia e conecte-se novamente para não sobrescrever alterações.');
    let uploaded=0;
    for(const theme of draftThemes){
      if(!theme.imageData)continue;
      const filepath=`assets/themes/${theme.id}.webp`;
      setAdminMessage(`Enviando imagem ${uploaded+1}...`);
      let existingSha;
      try{existingSha=(await apiRequest('GET',withBranch(apiPath(filepath)))).sha;}
      catch(e){if(!String(e.message).startsWith('404:'))throw e;}
      await putGitHubFile(filepath,theme.imageData.split(',')[1],`Studio: atualiza imagem do tema ${theme.name}`,existingSha);
      theme.image=filepath;
      delete theme.imageData;
      uploaded++;
    }
    const safeThemes=draftThemes.map(t=>normalizeTheme(t)).filter(Boolean);
    const manifest={version:1,themes:safeThemes};
    const out=await putGitHubFile('themes.json',toBase64Unicode(JSON.stringify(manifest,null,2)+'\n'),'Studio: publica temas de wallpapers',baseSha);
    baseSha=out.content.sha;
    draftThemes=safeThemes.map(t=>({...t}));
    themes=safeThemes.map(t=>({...t}));
    if(!themes.some(t=>t.id===selectedThemeId))selectedThemeId=themes[0].id;
    refreshThemeList();updatePreview();renderAdminThemeList();
    setAdminMessage(`Publicado no GitHub com sucesso! ${themes.length} tema(s) disponíveis. O GitHub Pages pode demorar alguns instantes para refletir o commit.`, 'success');
    notify('Temas publicados no repositório!');
  }catch(e){setAdminMessage('Falha na publicação: '+e.message+'\nCaso alguma imagem tenha sido enviada, ela poderá ser reaproveitada na próxima tentativa.','error');console.error(e);}
  finally{buttonBusy(btn,false);}
}

function prefillRepository(){
  const host=window.location.hostname;
  const match=host.match(/^([a-z0-9-]+)\.github\.io$/i);
  if(match){
    $('repoOwner').value=match[1];
    const project=window.location.pathname.split('/').filter(Boolean)[0];
    $('repoName').value=project||`${match[1]}.github.io`;
  }else{
    $('repoOwner').value='seridoplast';
    $('repoName').value='wallpapers';
  }
}
function setupListeners(){
  prefillRepository();
  $('year').textContent=String(new Date().getFullYear());
  for(const id of ['nameInput','sectorInput'])$(id).addEventListener('input',updatePreview);
  for(const id of ['userSectorSize','userNameSize','userMaxWidth'])$(id).addEventListener('input',()=>{syncTextControls();updatePreview();});
  $('resetTextControls').addEventListener('click',()=>{syncTextControls(true);updatePreview();});
  $('downloadBtn').addEventListener('click',downloadWallpaper);
  $('resetBtn').addEventListener('click',()=>{$('sectorInput').value='Setor';$('nameInput').value='Nome pessoa';selectedThemeId=themes[0].id;syncTextControls(true);refreshThemeList();updatePreview();notify('Exemplo restaurado.');});
  $('openAdmin').addEventListener('click',openAdmin);
  $('closeAdmin').addEventListener('click',closeAdmin);
  $('adminModal').addEventListener('click',e=>{if(e.target===$('adminModal'))closeAdmin();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('adminModal').hidden)closeAdmin();});
  $('connectGitHub').addEventListener('click',connectGitHub);
  $('disconnectGitHub').addEventListener('click',disconnectGitHub);
  $('newTheme').addEventListener('click',()=>startThemeEdit(null));
  $('cancelThemeEdit').addEventListener('click',()=>{$('adminEditor').hidden=true;editingId=null;uploadedImageData=null;setAdminMessage();});
  $('editThemeImage').addEventListener('change',onThemeImageUpload);
  $('saveThemeDraft').addEventListener('click',saveThemeDraft);
  $('publishThemes').addEventListener('click',publishThemes);
  for(const id of ['editSectorColor','editNameColor','editSectorSize','editNameSize','editX','editY','editMaxWidth','editAlign','editThemeName','editThemeDescription']){
    $(id).addEventListener('input',()=>{updateSliderLabels();renderAdminPreview();});
  }
}
setupListeners();loadPublicThemes();
