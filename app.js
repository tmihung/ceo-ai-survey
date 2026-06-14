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
function save(){localStorage.setItem('ceo-survey-v1',JSON.stringify(answers()))}
function restore(){
  const saved=JSON.parse(localStorage.getItem('ceo-survey-v1')||'{}');
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
  nextBtn.textContent=current===0?'Bat dau':current===steps.length-2?'Hoan thanh':'Tiep tuc';
  error.classList.remove('show');window.scrollTo({top:0,behavior:'smooth'});
}
function validStep(){
  const required=[...steps[current].querySelectorAll('fieldset[data-required=true]')];
  const missing=required.find(f=>!f.querySelector('input:checked'));
  if(missing){error.textContent='Vui long chon cau tra loi truoc khi tiep tuc.';error.classList.add('show');missing.scrollIntoView({behavior:'smooth',block:'center'});return false}
  return true;
}
form.addEventListener('change',e=>{
  if(e.target.type==='checkbox'&&e.target.dataset.max){
    const checked=form.querySelectorAll(`input[name="${e.target.name}"]:checked`);
    if(checked.length>Number(e.target.dataset.max)){e.target.checked=false;alert(`Chi duoc chon toi da ${e.target.dataset.max} phuong an.`)}
  }
  save();
});
form.addEventListener('input',save);
nextBtn.addEventListener('click',()=>{if(current>0&&!validStep())return;save();current++;render()});
backBtn.addEventListener('click',()=>{current=Math.max(0,current-1);render()});
function summary(){const data=answers();return Object.entries(data).map(([k,v])=>`${k}: ${[].concat(v).join('; ')}`).join('\n')}
document.getElementById('downloadBtn').addEventListener('click',()=>{
  const payload={ten_khao_sat:'Khao sat phong cach lam viec cua CEO',hoan_thanh_luc:new Date().toISOString(),cau_tra_loi:answers()};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`khao-sat-ceo-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
});
document.getElementById('copyBtn').addEventListener('click',async()=>{await navigator.clipboard.writeText(summary());const b=document.getElementById('copyBtn');b.textContent='Da sao che';setTimeout(()=>b.textContent='Sao che ban tom tat',1800)});
document.getElementById('clearBtn').addEventListener('click',()=>{if(confirm('Xoa toan bo cau tra loi tren thiet bi nay?')){localStorage.removeItem('ceo-survey-v1');form.reset();current=0;render()}});
restore();render();
