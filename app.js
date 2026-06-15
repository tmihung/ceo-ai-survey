const form=document.getElementById('surveyForm');
const steps=[...document.querySelectorAll('.step')];
const nextBtn=document.getElementById('nextBtn');
const backBtn=document.getElementById('backBtn');
const nav=document.getElementById('formNav');
const error=document.getElementById('errorMessage');
const storageKey='executive-discovery-v2';
const config=window.SURVEY_CONFIG||{};
let current=0;

function answers(){
  const data={};
  new FormData(form).forEach((value,key)=>{data[key]=data[key]?[].concat(data[key],value):value});
  delete data.submission_method;
  return data;
}
function payload(){return {submission_id:crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`,ten_khao_sat:'Khảo sát Hồ sơ Người dùng Lãnh đạo & Trợ lý AI',phien_ban:'2.1',muc_dich:'Discovery và chuẩn bị pilot; mọi quyền hạn cần được người có thẩm quyền xác nhận lại',hoan_thanh_luc:new Date().toISOString(),cau_tra_loi:answers()}}
function save(){localStorage.setItem(storageKey,JSON.stringify(answers()))}
function restore(){
  const saved=JSON.parse(localStorage.getItem(storageKey)||localStorage.getItem('ceo-survey-v1')||'{}');
  Object.entries(saved).forEach(([name,value])=>{const values=[].concat(value);document.querySelectorAll(`[name="${name}"]`).forEach(el=>{if(el.type==='radio'||el.type==='checkbox')el.checked=values.includes(el.value);else el.value=value})});
}
function render(){
  steps.forEach((s,i)=>s.classList.toggle('active',i===current));
  const pct=Math.round((current/(steps.length-1))*100);
  document.getElementById('progressBar').style.width=pct+'%';document.getElementById('progressText').textContent=pct+'%';document.getElementById('stepLabel').textContent=steps[current].dataset.title;
  backBtn.style.visibility=current===0?'hidden':'visible';nav.style.display=current===steps.length-1?'none':'flex';nextBtn.textContent=current===0?'Bắt đầu':current===steps.length-2?'Hoàn thành':'Tiếp tục';error.classList.remove('show');window.scrollTo({top:0,behavior:'smooth'});
}
function validStep(){const required=[...steps[current].querySelectorAll('fieldset[data-required=true]')];const missing=required.find(f=>!f.querySelector('input:checked'));if(missing){error.textContent='Vui lòng chọn câu trả lời trước khi tiếp tục.';error.classList.add('show');missing.scrollIntoView({behavior:'smooth',block:'center'});return false}return true}
form.addEventListener('change',e=>{if(e.target.type==='checkbox'&&e.target.dataset.max){const checked=form.querySelectorAll(`input[name="${e.target.name}"]:checked`);if(checked.length>Number(e.target.dataset.max)){e.target.checked=false;alert(`Chỉ được chọn tối đa ${e.target.dataset.max} phương án.`)}}save()});
form.addEventListener('input',save);
nextBtn.addEventListener('click',()=>{if(current>0&&!validStep())return;save();current++;render()});
backBtn.addEventListener('click',()=>{current=Math.max(0,current-1);render()});

function openLocalDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open('executive-survey-local',1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('submissions'))db.createObjectStore('submissions',{keyPath:'submission_id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function saveLocal(record,status){const db=await openLocalDb();record.local_status=status;record.local_saved_at=new Date().toISOString();await new Promise((resolve,reject)=>{const tx=db.transaction('submissions','readwrite');tx.objectStore('submissions').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
function summary(data=answers()){return Object.entries(data).map(([k,v])=>`${k}: ${[].concat(v).join('; ')}`).join('\n')}
function endpoint(){if(config.apiEndpoint)return config.apiEndpoint;if(location.hostname==='127.0.0.1'||location.hostname==='localhost')return '/api/surveys';return ''}
function sendEmail(record){const recipient=config.resultEmail||'';const subject=`Kết quả khảo sát lãnh đạo - ${record.cau_tra_loi.ma_tenant||record.submission_id}`;const body=`Mã hồ sơ: ${record.submission_id}\nHoàn thành: ${record.hoan_thanh_luc}\n\n${summary(record.cau_tra_loi)}`;location.href=`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}

const submitBtn=document.getElementById('submitBtn');
const submitStatus=document.getElementById('submitStatus');
submitBtn.addEventListener('click',async()=>{
  const record=payload();const method=form.querySelector('[name="submission_method"]:checked')?.value||'database';
  submitBtn.disabled=true;submitBtn.textContent='Đang xử lý...';submitStatus.textContent='';
  try{
    await saveLocal(record,'pending');
    if(method==='email'){
      await saveLocal(record,'email_draft_opened');sendEmail(record);submitStatus.textContent=`Đã lưu bản sao trên thiết bị. Email nháp đã được mở. Mã hồ sơ: ${record.submission_id}`;submitBtn.textContent='Đã tạo email';return;
    }
    const api=endpoint();
    if(!api)throw new Error('Chưa cấu hình API database công khai');
    // Apps Script redirects POST responses to googleusercontent.com. no-cors avoids
    // browsers treating that redirect as a failed cross-origin response.
    await fetch(api,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(record)});
    const result={ok:true,id:record.submission_id,saved_at:new Date().toISOString(),transport:'apps-script-no-cors'};
    await saveLocal({...record,server_result:result},'sent');localStorage.setItem(`${storageKey}-submission`,JSON.stringify(result));submitStatus.textContent=`Đã gửi đến database dự án và lưu bản sao trên thiết bị. Mã hồ sơ: ${record.submission_id}`;submitBtn.textContent='Đã gửi dữ liệu';
  }catch(e){
    await saveLocal(record,'pending').catch(()=>{});submitStatus.textContent=`Đã lưu an toàn trên thiết bị nhưng chưa gửi được: ${e.message}. Có thể chọn gửi qua email hoặc thử lại sau.`;submitBtn.disabled=false;submitBtn.textContent='Gửi lại dữ liệu khảo sát';
  }
});
document.getElementById('downloadBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(payload(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`khao-sat-lanh-dao-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)});
document.getElementById('copyBtn').addEventListener('click',async()=>{await navigator.clipboard.writeText(summary());const b=document.getElementById('copyBtn');b.textContent='Đã sao chép';setTimeout(()=>b.textContent='Sao chép bản tóm tắt',1800)});
document.getElementById('clearBtn').addEventListener('click',()=>{if(confirm('Xóa câu trả lời đang nhập trên thiết bị này? Các hồ sơ đã gửi/lưu trong database không bị xóa.')){localStorage.removeItem(storageKey);localStorage.removeItem('ceo-survey-v1');form.reset();submitBtn.disabled=false;submitBtn.textContent='Gửi dữ liệu khảo sát';submitStatus.textContent='';current=0;render()}});
restore();render();
