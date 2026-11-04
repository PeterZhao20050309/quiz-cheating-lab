(function(root) {
  'use strict';
  const OPTIONS = 'abcd';
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  function rng(seed) { let x=seed>>>0; return () => { x+=0x6D2B79F5; let t=x; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
  const coord = (i,cols) => `(${Math.floor(i/cols)+1}, ${i%cols+1})`;
  const option = ch => ch==='0' ? null : OPTIONS.includes(ch) ? ch : OPTIONS[Number(ch)-1];
  const canSee = (i,j,cols) => (Math.floor(i/cols)===Math.floor(j/cols)&&Math.abs(i-j)===1)||j===i-cols;
  const visible = (i,rows,cols) => Array.from({length:rows*cols},(_,j)=>j).filter(j=>canSee(i,j,cols));
  function pairs(rows,cols,all=false) { const out=[]; for(let i=0;i<rows*cols;i++)for(let j=i+1;j<rows*cols;j++)if(all||canSee(i,j,cols)||canSee(j,i,cols))out.push([i,j]); return out; }
  // A tie is uniform over the distinct modal OPTIONS, never over blank answers.
  function modal(answers) { const counts={a:0,b:0,c:0,d:0}; for(const ch of answers){const o=option(ch); if(o)counts[o]++;} const max=Math.max(...Object.values(counts)); const modes=max?OPTIONS.split('').filter(o=>counts[o]===max):[]; return {counts,modes,max,nonblank:Object.values(counts).reduce((a,b)=>a+b,0)}; }
  function chooseModal(answers,own,random) { const m=modal(answers); return {selected:m.modes.length?m.modes[Math.floor(random()*m.modes.length)]:option(own),...m}; }
  function metrics(a,b) { let same=0,overlap=0,run=0,longest=0,start=null; const wrong=[],cells=[];
    for(let q=0;q<a.length;q++){const match=a[q]===b[q]&&a[q]!=='0',both=a[q]!=='0'&&b[q]!=='0',bad=match&&/[1-4]/.test(a[q]); if(both)overlap++; if(match){same++;run++;if(run>longest){longest=run;start=q-run+2;}}else run=0; if(bad)wrong.push(q+1);cells.push(bad?'wrong':match?'correct':!both?'blank':'different');}
    return {same,overlap,rate:overlap?same/overlap:0,wrong,wrongCount:wrong.length,longest,start,end:start===null?null:start+longest-1,cells};
  }
  function countTail(ps,k) { if(k<=0)return 1; if(k>ps.length)return 0; const d=Array(ps.length+1).fill(0);d[0]=1;for(let n=0;n<ps.length;n++)for(let j=n+1;j>=0;j--)d[j]=(d[j]||0)*(1-ps[n])+(j?d[j-1]*ps[n]:0);return clamp(d.slice(k).reduce((a,b)=>a+b,0),0,1); }
  function runTail(ps,k) { if(k<=0)return 1;if(k>ps.length)return 0;let d=Array(k).fill(0),hit=0;d[0]=1;for(const p of ps){const next=Array(k).fill(0);next[0]=d.reduce((a,b)=>a+b,0)*(1-p);for(let r=1;r<k;r++)next[r]=d[r-1]*p;hit+=d[k-1]*p;d=next;}return clamp(hit,0,1); }
  function holm(values) { const sorted=values.map((p,i)=>({p,i})).sort((a,b)=>a.p-b.p),out=[];let last=0;sorted.forEach(({p,i},k)=>{last=Math.max(last,Math.min(1,p*(values.length-k)));out[i]=last;});return out; }
  function conditionalSetup(ps,score) { const dp=Array.from({length:ps.length+1},()=>Array(score+1).fill(0));dp[ps.length][0]=1;for(let q=ps.length-1;q>=0;q--)for(let k=0;k<=score;k++)dp[q][k]=(1-ps[q])*dp[q+1][k]+(k?ps[q]*dp[q+1][k-1]:0);return dp; }
  function conditionalDraw(ps,score,dp,random) { let remain=score;return ps.map((p,q)=>{const prob=remain>0&&dp[q][remain]>0?p*dp[q+1][remain-1]/dp[q][remain]:0;const x=random()<prob?1:0;remain-=x;return x;}); }
  function personFit(ps,observed,seed,replications=4999) { const score=observed.reduce((a,b)=>a+b,0),dp=conditionalSetup(ps,score),w=ps.map(p=>p===0||p===1?0:Math.log((1-p)/p));const stat=x=>x.reduce((s,v,q)=>s+v*w[q],0),actual=stat(observed);const easyWrong=[],hardCorrect=[];ps.forEach((p,q)=>{if(p>=.65&&!observed[q])easyWrong.push(q+1);if(p<=.35&&observed[q])hardCorrect.push(q+1);});if(!dp[0][score])return {score,p:0,easyWrong,hardCorrect,replications};let exceed=0;const random=rng(seed);for(let b=0;b<replications;b++)if(stat(conditionalDraw(ps,score,dp,random))>=actual-1e-10)exceed++;return {score,p:(1+exceed)/(1+replications),easyWrong,hardCorrect,replications}; }
  function validate(data) {
    if(!Number.isInteger(data.rows)||!Number.isInteger(data.cols)||data.rows<1||data.cols<1||data.rows>6||data.cols>6)throw Error('Rows and seats per row must be whole numbers from 1 to 6.');
    if(!Array.isArray(data.answers)||data.answers.length!==data.rows*data.cols)throw Error(`Enter ${data.rows*data.cols} lines of answers, one per seat.`);
    const questions=data.answers[0]?.length;if(!questions||questions>200)throw Error('Each answer sheet must contain 1–200 questions.');if(data.answers.some(s=>typeof s!=='string'||s.length!==questions))throw Error('Every student must have the same number of questions.');if(data.answers.some(s=>!/^[abcd0-4]+$/.test(s)))throw Error('Use only lowercase a–d, digits 1–4, and 0.');
    const key=[],errors=[];for(let q=0;q<questions;q++){const keys=[...new Set(data.answers.map(s=>s[q]).filter(ch=>OPTIONS.includes(ch)))];if(keys.length>1)errors.push(`Question ${q+1} marks multiple options as correct: ${keys.join('/')}`);key[q]=keys[0]||null;if(keys.length===1&&data.answers.some(s=>s[q]===String(OPTIONS.indexOf(key[q])+1)))errors.push(`Question ${q+1} also codes the correct option as wrong`);}if(errors.length)throw Error(errors.join('; ')+'. Please check the original answers.');
    if(data.model){const {probs,key:mk}=data.model;if(!Array.isArray(probs)||probs.length!==data.answers.length||!Array.isArray(mk)||mk.length!==questions||mk.some(k=>!Number.isInteger(k)||k<0||k>3))throw Error('Invalid probability model dimensions or answer key.');for(let i=0;i<probs.length;i++){if(probs[i].length!==questions)throw Error('The probability model has the wrong number of questions.');for(let q=0;q<questions;q++){const p=probs[i][q];if(p.length!==5||p.some(v=>!Number.isFinite(v)||v<0||v>1)||Math.abs(p.reduce((a,b)=>a+b,0)-1)>1e-9)throw Error('Invalid probability model.');if(key[q]&&key[q]!==OPTIONS[mk[q]])throw Error('The probability model conflicts with the answer key.');}}}
    return {questions,key};
  }
  function consensus(data,i) {
    const sources=visible(i,data.rows,data.cols),items=[];let matches=0,eligible=0,wrongMatches=0,ties=0;
    for(let q=0;q<data.answers[i].length;q++){const m=modal(sources.map(j=>data.answers[j][q])),own=option(data.answers[i][q]),available=m.modes.length>0,match=available&&m.modes.includes(own),wrong=match&&/[1-4]/.test(data.answers[i][q]);if(available){eligible++;if(m.modes.length>1)ties++;}if(match)matches++;if(wrong)wrongMatches++;
      items.push({q:q+1,sources:sources.map(j=>({i:j,answer:data.answers[j][q],option:option(data.answers[j][q])})),own,raw:data.answers[i][q],...m,available,match,wrong,nullMatchProbability:null});
    }
    return {i,sources,items,matches,eligible,wrongMatches,ties,rate:eligible?matches/eligible:0,p:null,expected:null};
  }
  function analyze(input) {
    // Explicit allowlist: never read model, generation, mastery, seed, or truth.
    // Even a legacy useKnownModel argument cannot enable generator access.
    const data={rows:input.rows,cols:input.cols,answers:input.answers};
    const meta=validate(data),consensusResults=data.answers.map((_,i)=>consensus(data,i));const results=pairs(data.rows,data.cols).map(([i,j])=>{
      const m=metrics(data.answers[i],data.answers[j]),directions=[];if(canSee(i,j,data.cols))directions.push([i,j]);if(canSee(j,i,data.cols))directions.push([j,i]);const r={i,j,...m,directions};
      return r;
    });
    results.sort((a,b)=>b.longest-a.longest||b.wrongCount-a.wrongCount);
    const outside=pairs(data.rows,data.cols,true).filter(([i,j])=>!canSee(i,j,data.cols)&&!canSee(j,i,data.cols)).map(([i,j])=>({i,j,...metrics(data.answers[i],data.answers[j])})).sort((a,b)=>b.longest-a.longest);
    const R=typeof module!=='undefined'&&module.exports?require('./sample-reference.js'):root.ExamSampleReference;
    const decoded=data.answers.map(s=>[...s].map(ch=>option(ch)?.toUpperCase()||null));
    consensusResults.forEach(r=>r.sample=R.analyze(decoded,r.i,r.sources));
    consensusResults.sort((a,b)=>(b.sample.excessRate??-Infinity)-(a.sample.excessRate??-Infinity)||b.matches-a.matches);
    return {...meta,results,consensus:consensusResults,individuals:[],outside,scores:data.answers.map(s=>[...s].filter(ch=>OPTIONS.includes(ch)).length),hasModel:false,testCount:0,mode:'sample-exploration'};
  }
  function parse(text,rows,cols) { if(typeof text!=='string')throw Error('Enter the answers as text.');const answers=text.trim().split(/\r?\n/).filter(s=>s.trim()).map(s=>s.replace(/\s*坐标.*$/u,'').replace(/\s+/g,'').toLowerCase());const data={rows,cols,answers,name:'Your answers',kind:'custom',model:null,truth:null};validate(data);return data; }
  function independentAttempt(key,knows,random,protectedWrong=null){
    const correct=OPTIONS[key];
    if(knows)return {knows:true,correct,eliminated:[],remaining:[correct],originalOption:correct,originalAnswer:correct,finalAnswer:correct,action:'known'};
    // Unknown items: eliminate 0/1/2 wrong options, each count with probability 1/3.
    // The correct option is retained; no careless or mistaken-elimination event.
    const count=Math.floor(random()*3),candidates=[...OPTIONS].filter(o=>o!==correct&&o!==protectedWrong);
    for(let j=candidates.length-1;j>0;j--){const k=Math.floor(random()*(j+1));[candidates[j],candidates[k]]=[candidates[k],candidates[j]];}
    const eliminated=candidates.slice(0,count).sort(),remaining=[...OPTIONS].filter(o=>!eliminated.includes(o));
    const chosen=remaining[Math.floor(random()*remaining.length)],answer=chosen===correct?chosen:String(OPTIONS.indexOf(chosen)+1);
    return {knows:false,correct,eliminated,remaining,originalOption:chosen,originalAnswer:answer,finalAnswer:answer,action:'guess'};
  }
  function sample(kind='majority',seed=2026,viewer=4,start=1,end=24) {
    if(!['majority','copy','independent','high','distractor','blank'].includes(kind))throw Error('Unknown variation.');if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('The answer-set ID must be a whole number from 0 to 4294967295.');if(!Number.isInteger(viewer)||viewer<0||viewer>8||!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>24||start>end)throw Error('Invalid copying student or question range.');
    const random=rng(seed),rows=3,cols=3,n=24,key=Array.from({length:n},()=>Math.floor(random()*4)),abilities=[.25,.55,-.15,.7,-.6,-.1,.5,-.4,.05],difficulty=Array.from({length:n},(_,q)=>-1.8+q*.16+(random()-.5)*.4),dominant=key.map(k=>(k+1+Math.floor(random()*3))%4);
    const knowledgeChances=abilities.map(a=>key.map((_,q)=>kind==='high'?.9:kind==='distractor'?.15:clamp(1/(1+Math.exp(difficulty[q]-a)),.05,.95)));
    const masteryRandom=rng(seed^0x73af912b),answerRandom=rng(seed^0x46bd29f1);
    const mastery=knowledgeChances.map(ps=>ps.map(p=>masteryRandom()<p)),truth=[];
    const records=mastery.map((items,i)=>items.map((knows,q)=>{
      // The blank scenario models items not reached, not mistakes on known items.
      if(kind==='blank'&&q>=16)return {q:q+1,knows:null,correct:OPTIONS[key[q]],eliminated:[],remaining:[],originalOption:null,originalAnswer:'0',finalAnswer:'0',action:'unreached'};
      return {q:q+1,...independentAttempt(key[q],knows,answerRandom,kind==='distractor'?OPTIONS[dominant[q]]:null)};
    }));
    const originalAnswers=records.map(items=>items.map(r=>r.originalAnswer).join('')),answers=originalAnswers.slice();
    const encode=(o,q)=>o===OPTIONS[key[q]]?o:String(OPTIONS.indexOf(o)+1);
    if(kind==='majority'){const sources=visible(viewer,rows,cols),copyRandom=rng(seed^0xa3bf29a5),own=answers[viewer].split(''),copied=[];for(let q=start-1;q<end;q++){
      const record=records[viewer][q];if(record.knows!==false)continue;
      const pick=chooseModal(sources.map(j=>originalAnswers[j][q]),own[q],copyRandom);
      if(pick.modes.length){own[q]=encode(pick.selected,q);record.finalAnswer=own[q];record.action='majority-copy';copied.push(q+1);}
    }answers[viewer]=own.join('');truth.push({type:'majority',viewer,sources,start,end,copied});}
    if(kind==='copy')for(const [v,s,a,b]of [[5,2,8,21],[8,5,8,21]]){const own=answers[v].split(''),copied=[];for(let q=a-1;q<b;q++)if(records[v][q].knows===false&&answers[s][q]!=='0'){own[q]=answers[s][q];records[v][q].finalAnswer=own[q];records[v][q].action='single-copy';copied.push(q+1);}answers[v]=own.join('');truth.push({type:'copy',viewer:v,source:s,start:a,end:b,copied});}
    const names={majority:'When stuck, copy the mode',copy:'When stuck, copy one student',independent:'Work independently',high:'Most questions are known',distractor:'A common wrong choice',blank:'Leave the last questions blank'};
    return {rows,cols,answers,name:names[kind],kind,seed,viewer,start,end,truth,generation:{version:'mastery-elimination-v1',key,abilities,difficulty,knowledgeChances,dominant,records,originalAnswers}};
  }
  const api={rng,coord,option,canSee,visible,pairs,modal,chooseModal,metrics,countTail,runTail,holm,conditionalSetup,conditionalDraw,personFit,validate,consensus,analyze,parse,independentAttempt,sample};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.AnswerLab=api;
})(typeof globalThis!=='undefined'?globalThis:this);
