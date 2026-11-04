(function(){
  'use strict';
  const E=AnswerLab,$=id=>document.getElementById(id);
  const draftKey='answer-lab-workbench-v1';
  let data,result,selectedSeat=4,currentSeed=2026,submitted=null,isWorkbench=false,workbenchSeat=0;
  const c=i=>E.coord(i,data.cols),escape=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const term=(key,inline=false)=>TermHelp.link(key,inline);
  const count=(n,singular,plural=singular+'s')=>`${n} ${n===1?singular:plural}`;
  const optionText=x=>E.option(x)?.toUpperCase()||'Blank';
  const difference=x=>Math.abs(x)<1e-9?'The same':`${Math.abs(x).toFixed(Math.abs(x)<.05?2:1)} ${x>0?'more':'fewer'}`;
  const scenarioHelp={
    majority:'One student answers independently when they know the answer. When stuck, they copy the most frequent option among visible neighbors, choosing randomly if options tie and ignoring blanks whenever possible.',
    independent:'No copying is added. Students answer correctly when they know the answer. Otherwise, they may rule out some wrong options and guess from the rest.',
    copy:'Some students copy their fixed favorite neighbor on questions they cannot solve.',
    high:'No copying is added. Students know many answers, so they often get the same questions right.',
    blank:'No copying is added. Nobody reaches questions 17–24, so those answers are blank. Shared blanks do not count as matches.'
  };
  const analyzeObserved=next=>E.analyze({rows:next.rows,cols:next.cols,answers:next.answers});
  function choose(kind,seed=currentSeed,viewer=4,start=1,end=24){
    if(kind==='custom'){enterWorkbench();return;}
    isWorkbench=false;
    const next=kind==='majority'?E.sample(kind,seed,viewer,start,end):E.sample(kind,seed);
    let analysis;try{analysis=analyzeObserved(next);}catch(e){data=next;invalid(e.message);return;}data=next;result=analysis;selectedSeat=result.consensus[0]?.i??0;render();saveDraft();
  }
  function controls(){
    const model=!!data?.generation;$('scenario').value=isWorkbench?'custom':data.kind;
    $('workbench-view').hidden=!isWorkbench;$('scenario-help').hidden=isWorkbench;
    $('scenario-help').textContent=isWorkbench?'':scenarioHelp[data.kind]||'';
    $('regenerate').hidden=isWorkbench;$('regenerate').disabled=isWorkbench||!model;$('export').disabled=!result;
    if(!isWorkbench&&model)currentSeed=data.seed;
  }
  function invalid(message){result=null;controls();$('summary').classList.add('alert');$('summary').innerHTML=`<div><h2>Check the answers first</h2><p>${escape(message)}</p></div>`;for(const id of ['seats','consensus','selected-result','vote-grid','vote-evidence','sample-evidence'])$(id).innerHTML='';for(const id of ['seat-count','seat-description','vote-summary'])$(id).textContent='';$('vote-title').textContent='3. Question by question · Check your input';if($('truth-panel'))$('truth-panel').hidden=true;$('export').disabled=true;}
  function render(){controls();if(isWorkbench)$('input-error').textContent='';$('control-error').textContent='';$('export').disabled=false;$('analysis-results').hidden=false;
    $('summary').classList.remove('alert');$('summary').innerHTML=`<div><h2>Comparing ${count(data.answers.length,'student')} · ${count(result.questions,'question')}</h2></div>`;
    $('seat-count').textContent=`${count(data.rows,'row')} × ${count(data.cols,'seat')}`;renderSeats();renderConsensus();renderVotes();renderTruth();
  }
  function selectSeat(i){selectedSeat=i;renderSeats();renderConsensus();renderVotes();renderTruth();if(isWorkbench){workbenchSeat=i;saveDraft();}}
  function renderSeats(){const sources=E.visible(selectedSeat,data.rows,data.cols),el=$('seats');el.style.gridTemplateColumns=`repeat(${data.cols},minmax(0,1fr))`;el.innerHTML=data.answers.map((_,i)=>`<button class="seat ${i===selectedSeat?'active':sources.includes(i)?'source':'reference-seat'}" data-seat="${i}" aria-pressed="${i===selectedSeat}" aria-label="Student ${c(i)}, ${result.scores[i]} correct"><strong>${c(i)}</strong><small>${result.scores[i]} correct</small></button>`).join('');el.querySelectorAll('[data-seat]').forEach(b=>b.addEventListener('click',()=>selectSeat(Number(b.dataset.seat))));$('seat-description').textContent=`${c(selectedSeat)} can see: ${sources.length?sources.map(c).join(', '):'no neighbors'}.`;}
  function renderConsensus(){$('consensus').innerHTML=result.consensus.map(r=>`<tr class="${r.i===selectedSeat?'chosen':''}"><td><button class="link-button" data-vote="${r.i}">${c(r.i)}</button></td><td><b>${r.matches} / ${r.eligible}</b><span class="tiny">${r.wrongMatches} of these ${r.wrongMatches===1?'is':'are'} wrong</span></td><td>${r.sample.expected===null?'Unavailable':r.sample.expected.toFixed(1)+' matches'}<span class="tiny">${count(r.sample.references.length,'reference student')}</span></td><td>${r.sample.expected===null?'—':difference(r.sample.excess)}</td></tr>`).join('');$('consensus').querySelectorAll('[data-vote]').forEach(b=>b.addEventListener('click',()=>selectSeat(Number(b.dataset.vote))));}
  function renderSelected(r){const s=r.sample;
    $('selected-result').innerHTML=`<p class="result-caption">Student <b>${c(r.i)}</b> · ${count(r.eligible,'question')} available for comparison</p><div class="result-numbers" data-term-context><div><span>${term('match')}</span><strong>${r.matches}<small> ${r.matches===1?'match':'matches'}</small></strong></div><div><span>${term('mean')}</span><strong>${s.expected===null?'—':s.expected.toFixed(1)}<small>${s.expected===null?'':' matches'}</small></strong></div><div><span>${term('gap')}</span><strong class="difference-value">${s.expected===null?'Unavailable':difference(s.excess)}</strong></div></div><p class="result-explanation">${s.expected===null?'No reference average is available: there are no reference students or no questions to compare.':`Using the same neighbors’ modes, compare this student’s answers with a ${term('sample',true)} of ${count(s.references.length,'reference answer sheet')}.`}</p>`;
  }
  function renderVotes(){const r=result.consensus.find(r=>r.i===selectedSeat);renderSelected(r);
    $('vote-title').textContent=`3. Question by question · Student ${c(r.i)}`;
    $('vote-summary').textContent=`Visible neighbors answered ${count(r.eligible,'question')}; this student matches their modes on ${r.matches}. Skipped: ${count(result.questions-r.eligible,'question')} with no available neighbor answers.`;
    $('vote-grid').innerHTML=`<p class="small muted">Neighbors are listed in this order: ${r.sources.map(c).join(', ')||'no neighbors'}. A slash separates tied modes; choosing any one counts as a match.</p><table><thead><tr><th>Question</th><th>Neighbors’ answers</th><th>${term('mode')}</th><th>Student’s answer</th><th>Result</th></tr></thead><tbody>${r.items.map(it=>`<tr><td>${it.q}</td><td>${r.sources.map(j=>optionText(data.answers[j][it.q-1])).join(' · ')||'—'}</td><td><b>${it.modes.join(' / ').toUpperCase()||'—'}</b></td><td>${optionText(it.raw)}<span class="tiny">${it.raw==='0'?'Not answered':/[1-4]/.test(it.raw)?'Wrong':'Correct'}</span></td><td><span class="answer-state ${!it.available?'blank':it.wrong?'wrong':it.match?'correct':'different'}">${!it.available?'Skipped':it.match?'Match':'No match'}</span></td></tr>`).join('')}</tbody></table>`;
    $('vote-evidence').innerHTML=`<div data-term-context><strong>${term('wrong')}: ${r.wrongMatches}</strong><p>Expand the table below to see which questions.</p></div><div data-term-context><strong>${term('tie')} on ${count(r.ties,'question')}</strong><p>Choosing any tied mode counts as a match.</p></div>`;
    renderSample(r);
  }
  function renderSample(r){const s=r.sample;
    if(!s.references.length||!s.eligible){$('sample-evidence').innerHTML='<p>No average can be calculated: there are no reference students or no questions to compare.</p>';return;}
    const total=s.referenceTotals.reduce((sum,x)=>sum+x.matches,0);
    $('sample-evidence').innerHTML=`<h3>Step 1: Choose the reference students</h3><p>Exclude student ${c(r.i)} and their ${count(r.sources.length,'visible neighbor')}. This leaves ${count(s.references.length,'student')}: ${s.references.map(c).join(', ')}. These answer sheets form the ${term('sample',true)}.</p><h3>Step 2: Compare everyone against the same modes</h3><p>For student ${c(r.i)}, keep using the modes from ${c(r.i)}’s neighbors. <b>Do not switch to each reference student’s own neighbors.</b></p><div class="table-scroll"><table><thead><tr><th>Reference student</th><th>Matches with these modes</th></tr></thead><tbody>${s.referenceTotals.map(x=>`<tr><td>${c(x.i)}</td><td>${x.matches}</td></tr>`).join('')}</tbody></table></div><h3>Step 3: Add the counts, then divide</h3><p class="calculation">(${s.referenceTotals.map(x=>x.matches).join(' + ')}) ÷ ${s.references.length} = ${total} ÷ ${s.references.length} ≈ <b>${s.expected.toFixed(1)} matches</b></p><p>This is the reference average. Student ${c(r.i)} has ${count(r.matches,'match','matches')}: ${Math.abs(s.excess)<1e-9?'the same as the average':difference(s.excess)+' than the average'}. The decimal comes from averaging; nobody answered half a question.</p><details class="compact-details"><summary>Another view: how many students match on each question?</summary><p>If the mode is A and two of five reference students choose A, the proportion is 2 ÷ 5 = 40%. If A and B tie, count students choosing either. Answers below follow the reference-student order above.</p><div class="table-scroll"><table><thead><tr><th>Question</th><th>${term('mode')}</th><th>Reference answers</th><th>Option counts</th><th>Matching proportion</th></tr></thead><tbody>${s.items.map(q=>`<tr><td>${q.q}</td><td>${q.modes.join(' / ')||'—'}</td><td>${q.referenceAnswers.map(x=>x.choice||'Blank').join(' · ')}</td><td>A:${q.referenceCounts.A} B:${q.referenceCounts.B} C:${q.referenceCounts.C} D:${q.referenceCounts.D} Blank:${q.referenceCounts.blank}</td><td>${q.estimate===null?'Neighbors all blank; skipped':`${q.matchedReferences} ÷ ${q.referenceCount} ≈ ${(q.estimate*100).toFixed(0)}%`}</td></tr>`).join('')}</tbody></table></div><p>Adding these proportions gives the same average match count. A blank reference answer does not match, but that student still counts in the total.</p><p>0% means none of these students chose a mode; 100% means all of them did. Neither tells us what another student must or cannot choose.</p></details><details class="compact-details"><summary>With so few reference students, could one person change the result?</summary><p>${s.sensitivity?`Leave out one reference student at a time and recalculate. The averages range from about ${s.sensitivity[0].toFixed(1)} to ${s.sensitivity[1].toFixed(1)} matches.`:'At least two reference students are needed to try leaving one out.'}</p><p>This checks how much one person affects the average. The range does not guarantee where the true value lies. A narrow range does not prove that the reference students have similar ability or worked independently.</p></details>`;
  }
  function renderTruth(){
    if(!$('truth-panel'))return;
    $('truth-panel').hidden=!data.generation;if(!data.generation)return;
    const records=data.generation.records[selectedSeat],known=records.filter(r=>r.knows===true).length,guessed=records.filter(r=>r.action==='guess').length,copied=records.filter(r=>r.action.endsWith('-copy')).length,unreached=records.filter(r=>r.action==='unreached').length;
    const names={known:'Knew → answered correctly',guess:'Did not know → guessed from remaining options',unreached:'Not reached','majority-copy':'Did not know → copied a mode','single-copy':'Did not know → copied one student'};
    let html='<p>This is how the example was generated. The comparison uses only seats and submitted answers; it does not read the records below.</p>';
    if(!data.truth.length)html+='<p>No copying was added to this example.</p>';
    for(const t of data.truth){if(t.type==='majority')html+=`<p>On questions ${t.start}–${t.end}, student ${c(t.viewer)} checks the original answers of ${t.sources.map(c).join(', ')} only when unsure. They ignore blanks and copy the most frequent option, choosing randomly among tied modes. Questions copied: ${t.copied.join(', ')||'none'}. Known answers stay correct. If all neighbors leave a question blank, the student keeps their original guess.</p>`;else if(t.type==='copy')html+=`<p>On questions ${t.start}–${t.end}, student ${c(t.viewer)} copies ${c(t.source)} when unsure, unless that student left the answer blank. Questions copied: ${t.copied.join(', ')||'none'}. Copying happens in sequence here, so a later student may copy an answer that an earlier student has just copied.</p>`;}
    if(data.kind==='high')html+='<p>“Most questions are known”: each student has a 90% chance of being assigned knowledge of each answer. Known answers are always correct. The final score can exceed 90% because guesses can also be correct.</p>';
    if(data.kind==='blank')html+='<p>“Leave the last questions blank”: questions 17–24 are left blank without checking whether the student knows the answer. The other variations do not add random blanks.</p>';
    html+=`<h3>How student ${c(selectedSeat)} answered each question</h3><p>Knew and answered correctly: ${known}. Guessed independently: ${guessed}. Copied: ${copied}. Not reached: ${unreached}.</p><p class="muted small">Select a different seat above to switch students. Compare “Original answer” with “Submitted answer” to see what changed. All letters here indicate the chosen option.</p><div class="table-scroll"><table><thead><tr><th>Question</th><th>Correct answer</th><th>Knew it?</th><th>Wrong options ruled out</th><th>Remaining options</th><th>Original answer</th><th>Submitted answer</th><th>Process</th></tr></thead><tbody>${records.map(r=>`<tr><td>${r.q}</td><td>${r.correct.toUpperCase()}</td><td>${r.knows===null?'Not reached':r.knows?'Yes':'No'}</td><td>${r.knows!==false?'—':r.eliminated.join('/').toUpperCase()||'None'}</td><td>${r.knows!==false?'—':r.remaining.join('/').toUpperCase()}</td><td>${E.option(r.originalAnswer)?.toUpperCase()||'Blank'}</td><td>${E.option(r.finalAnswer)?.toUpperCase()||'Blank'}</td><td>${names[r.action]}</td></tr>`).join('')}</tbody></table></div>`;
    html+=`<details><summary>Reproduce the example: all generator settings</summary><p>Each student gets an ability value and each question a difficulty value. Higher ability or lower difficulty makes the student more likely to be assigned knowledge of the answer. Known answers are always correct; careless mistakes are excluded. The formula below generates examples only. It is never used to compare answer sheets.</p><p>Probability of knowing the answer = 1 ÷ (1 + exp(difficulty − ability)), limited to 5%–95%. Here exp(x) means e raised to the power x, with e ≈ 2.718. These are generator settings, not measured student abilities.</p><p>Ability values in seat order: ${data.generation.abilities.join(', ')}. Difficulty values in question order: ${data.generation.difficulty.map(x=>x.toFixed(3)).join(', ')}.</p><p>When the answer is unknown, ruling out 0, 1, or 2 wrong options each has a one-third chance. The wrong options to exclude are chosen randomly; the correct option is always kept. The student then guesses uniformly among the 4, 3, or 2 remaining options. Careless mistakes and mistakenly ruling out the correct answer are excluded.</p><p>“Most questions are known” sets the probability of knowing each answer to 90%. Unreached questions stay blank. With the same answer-set ID, “Work independently” and “When stuck, copy the mode” start from the same original answer sheets. Mode copying reads neighbors’ original, unchanged answers.</p></details>`;
    $('truth').innerHTML=html;
  }
  function readDraft(){return {answers:$('answers').value,rows:$('rows').value,cols:$('cols').value};}
  function fillDraft(draft){$('answers').value=draft.answers;$('rows').value=draft.rows;$('cols').value=draft.cols;updateSeatTotal();}
  function saveDraft(){try{sessionStorage.setItem(draftKey,JSON.stringify({draft:readDraft(),submitted,selectedSeat:workbenchSeat,active:isWorkbench}));return true;}catch{return false;}}
  function updateSeatTotal(){
    const rows=Number($('rows').value),cols=Number($('cols').value),lines=$('answers').value.split(/\r?\n/).filter(line=>line.trim()).length;
    $('seat-total').textContent=Number.isInteger(rows)&&Number.isInteger(cols)&&rows>=1&&rows<=6&&cols>=1&&cols<=6?`${count(rows*cols,'seat')} · ${count(lines,'answer sheet')}`:'Use 1–6 rows and 1–6 seats per row.';
  }
  function editDraft(message='Answers changed. Compare again to update the results.'){
    submitted=null;result=null;$('analysis-results').hidden=true;$('export').disabled=true;$('input-error').textContent='';
    updateSeatTotal();saveDraft();$('draft-status').textContent=message;
  }
  function loadText(text,rows,cols){
    const next=E.parse(text,rows,cols),analysis=analyzeObserved(next);isWorkbench=true;data=next;result=analysis;selectedSeat=result.consensus[0]?.i??0;workbenchSeat=selectedSeat;
    render();submitted=readDraft();$('analysis-results').hidden=false;$('draft-status').textContent='Results updated.';updateSeatTotal();saveDraft();
  }
  function showResults(){$('summary').scrollIntoView({behavior:'smooth',block:'start'});$('summary').focus({preventScroll:true});}
  function enterWorkbench(){
    isWorkbench=true;result=null;controls();$('analysis-results').hidden=true;$('control-error').textContent='';
    if(submitted){
      const seat=workbenchSeat;
      try{loadText(submitted.answers,Number(submitted.rows),Number(submitted.cols));if(seat>=0&&seat<data.answers.length)selectSeat(seat);}
      catch{editDraft('Check your draft, then compare again.');}
    }
    saveDraft();
  }
  function setupWorkbench(){
    $('input-panel').addEventListener('submit',event=>{
      event.preventDefault();
      try{loadText($('answers').value,Number($('rows').value),Number($('cols').value));showResults();}
      catch(e){editDraft('');$('input-error').textContent=e.message;}
    });
    for(const id of ['answers','rows','cols'])$(id).addEventListener('input',()=>editDraft());
    $('load-example').addEventListener('click',()=>{
      const example=E.sample('majority',2026);
      fillDraft({answers:example.answers.join('\n'),rows:String(example.rows),cols:String(example.cols)});
      editDraft('Example loaded. Edit it or compare.');
    });
    let saved;try{saved=JSON.parse(sessionStorage.getItem(draftKey));}catch{}
    const validDraft=draft=>draft&&['answers','rows','cols'].every(key=>typeof draft[key]==='string');
    if(validDraft(saved?.draft)){
      fillDraft(saved.draft);$('draft-status').textContent='Draft restored.';
      if(validDraft(saved.submitted)&&['answers','rows','cols'].every(key=>saved.draft[key]===saved.submitted[key])){
        submitted=saved.submitted;workbenchSeat=Number.isInteger(saved.selectedSeat)?saved.selectedSeat:0;
      }
    }else{$('draft-status').textContent='Paste your answer sheets, or load an example.';updateSeatTotal();}
    return saved?.active===true;
  }
  function regenerate(){try{choose($('scenario').value,currentSeed);}catch(e){$('control-error').textContent=e.message;}}
  $('export').addEventListener('click',()=>{if(!result)return;const report={version:'3.5-workbench',generatedAt:new Date().toISOString(),data,analysis:result,interpretation:'The comparison uses only seats and submitted answers. It excludes the selected student and their visible neighbors, then uses the remaining students to calculate an average match count and a difference. Reference students may differ in ability or may have copied, so this difference is not a probability of copying. Generator records are used only for the reveal, never for the comparison.'};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='answer-analysis-v3.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  const reopenWorkbench=setupWorkbench();
  $('scenario').addEventListener('change',regenerate);
  $('regenerate').addEventListener('click',()=>{currentSeed=(currentSeed+1)>>>0;regenerate();});
  choose(reopenWorkbench?'custom':'majority',2026);
  const ctx=document.modelContext;if(ctx?.registerTool){try{Promise.resolve(ctx.registerTool({name:'analyze_exam_answers',title:'Compare classroom answers',description:'Load seats and answer sheets, count matches with visible neighbors’ modes, and compare with the reference average. Inspect individual questions; the results do not establish copying.',inputSchema:{type:'object',properties:{answers:{type:'string'},rows:{type:'integer',minimum:1,maximum:6},cols:{type:'integer',minimum:1,maximum:6}},required:['answers','rows','cols'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||typeof input.answers!=='string'||!Number.isInteger(input.rows)||!Number.isInteger(input.cols))throw Error('Enter answer text and whole numbers for rows and seats per row.');isWorkbench=true;controls();fillDraft({answers:input.answers,rows:String(input.rows),cols:String(input.cols)});editDraft('');loadText(input.answers,input.rows,input.cols);showResults();return {students:data.answers.length,questions:result.questions,hasModel:false,topConsensus:result.consensus.slice(0,3).map(r=>({student:c(r.i),matches:r.matches,eligible:r.eligible}))};}})).catch(()=>{});}catch{}}
})();
