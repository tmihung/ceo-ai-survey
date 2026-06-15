const form=document.getElementById('surveyForm');
const steps=[...document.querySelectorAll('.step')];
const nextBtn=document.getElementById('nextBtn');
const backBtn=document.getElementById('backBtn');
const nav=document.getElementById('formNav');
const error=document.getElementById('errorMessage');
let current=0;

function answers(){
  const data={};
  new FormData(form).forEach((value,key)=>{data[key]=data[key]?[].concat(data[key],value):value});
  return data;
}
const storageKey='executive-discovery-v2';
function save(){localStorage.setItem(storageKey,JSON.stringify(answers()))}
function restore(){
  const saved=JSON.parse(localStorage.getItem(storageKey)||localStorage.getItem('ceo-survey-v1')||'{}');
  Object.entries(saved).forEach(([name,value])=>{
    const values=[].concat(value);document.querySelectorAll(`[name="${name}"]`).forEach(el=>{
      if(el.type==='radio'||el.type==='checkbox')el.checked=values.includes(el.value);else el.value=value;
    });
  });
}
function render(){
  steps.forEach((s,i)=>s.classList.toggle('active',i===current));
  const pct=Math.round((current/(steps.length-1))*100);
  document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressText').textContent=pct+'%';
  document.getElementById('stepLabel').textContent=steps[current].dataset.title;
  backBtn.style.visibility=current===0?'hidden':'visible';
  nav.style.display=current===steps.length-1?'none':'flex';
  nextBtn.textContent=current===0?'Bắt đầu':current===steps.length-2?'Hoàn thành':'Tiếp tục';
  error.classList.remove('show');window.scrollTo({top:0,behavior:'smooth'});
}
function validStep(){
  const required=[...steps[current].querySelectorAll('fieldset[data-required=true]')];
  const missing=required.find(f=>!f.querySelector('input:checked'));
  if(missing){error.textContent='Vui lòng chọn câu trả lời trước khi tiếp tục.';error.classList.add('show');missing.scrollIntoView({behavior:'smooth',block:'center'});return false}
  return true;
}
form.addEventListener('change',e=>{
  if(e.target.type==='checkbox'&&e.target.dataset.max){
    const checked=form.querySelectorAll(`input[name="${e.target.name}"]:checked`);
    if(checked.length>Number(e.target.dataset.max)){e.target.checked=false;alert(`Chỉ được chọn tối đa ${e.target.dataset.max} phương án.`)}
  }
  save();
});
form.addEventListener('input',save);
nextBtn.addEventListener('click',()=>{if(current>0&&!validStep())return;save();current++;render()});
backBtn.addEventListener('click',()=>{current=Math.max(0,current-1);render()});
function summary(){const data=answers();return Object.entries(data).map(([k,v])=>`${k}: ${[].concat(v).join('; ')}`).join('\n')}
function payload(){return {ten_khao_sat:'Khảo sát Hồ sơ Người dùng Lãnh đạo & Trợ lý AI',phien_ban:'2.0',muc_dich:'Discovery và chuẩn bị pilot; mọi quyền hạn cần được người có thẩm quyền xác nhận lại',hoan_thanh_luc:new Date().toISOString(),cau_tra_loi:answers()}}
const submitBtn=document.getElementById('submitBtn');
const submitStatus=document.getElementById('submitStatus');
const hasDatabaseApi=location.hostname==='127.0.0.1'||location.hostname==='localhost';
if(!hasDatabaseApi){
  submitBtn.textContent='Tải kết quả để gửi lại';
  submitStatus.textContent='Bản khảo sát công khai không lưu dữ liệu trên GitHub. Kết quả chỉ được tạo thành file trên thiết bị của Anh/Chị.';
}
submitBtn.addEventListener('click',async()=>{
  if(!hasDatabaseApi){document.getElementById('downloadBtn').click();return}
  submitBtn.disabled=true;submitBtn.textContent='Đang gửi...';submitStatus.textContent='';
  try{
    const endpoint=location.protocol==='file:'?'http://127.0.0.1:8765/api/surveys':'/api/surveys';
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Không thể lưu kết quả');
    localStorage.setItem(`${storageKey}-submission`,JSON.stringify(result));
    submitStatus.textContent=`Đã lưu thành công. Mã hồ sơ: ${result.id} · ${new Date(result.saved_at).toLocaleString('vi-VN')}`;
    submitBtn.textContent='Đã gửi dữ liệu';
  }catch(e){
    submitStatus.textContent=`Chưa gửi được dữ liệu: ${e.message}. Hãy mở form qua local server và thử lại.`;
    submitBtn.disabled=false;submitBtn.textContent='Gửi lại dữ liệu khảo sát';
  }
});
document.getElementById('downloadBtn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(payload(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`khao-sat-lanh-dao-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
});
document.getElementById('copyBtn').addEventListener('click',async()=>{await navigator.clipboard.writeText(summary());const b=document.getElementById('copyBtn');b.textContent='Đã sao chép';setTimeout(()=>b.textContent='Sao chép bản tóm tắt',1800)});
document.getElementById('clearBtn').addEventListener('click',()=>{if(confirm('Xóa toàn bộ câu trả lời trên thiết bị này?')){localStorage.removeItem(storageKey);localStorage.removeItem(`${storageKey}-submission`);localStorage.removeItem('ceo-survey-v1');form.reset();submitBtn.disabled=false;submitBtn.textContent='Gửi dữ liệu khảo sát';submitStatus.textContent='';current=0;render()}});
restore();render();
