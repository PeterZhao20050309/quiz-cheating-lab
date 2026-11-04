(function(){
  'use strict';
  // Explanations only. This module never reads or changes the exam model.
  const terms={
  "mode": {
    "title": "Mode",
    "short": "The most frequent option in a set of answers. There can be more than one.",
    "example": "Neighbors choose A, A, B: A appears twice and B once, so A is the mode.\nNeighbors choose A, B, blank: ignore the blank. A and B each appear once, so both are modes.",
    "related": [
      "tie",
      "match"
    ]
  },
  "mean": {
    "title": "Reference average",
    "short": "The mean match count of the reference students. Add their match counts, then divide by the number of reference students.",
    "example": "Suppose five reference students have 19, 18, 19, 14, and 13 matches.\nAdd them: 19 + 18 + 19 + 14 + 13 = 83.\nDivide by five students: 83 ÷ 5 = 16.6 matches.",
    "related": [
      "sample",
      "match",
      "gap"
    ]
  },
  "sample": {
    "title": "Sample",
    "alias": "Here: the reference students’ answers",
    "short": "The answer sheets used for comparison. They come from just a few students and may not represent everyone.",
    "example": "A 3 × 3 classroom has nine students. For the middle student, exclude that student and the three visible neighbors:\n9 − 1 − 3 = 5.\nThe five remaining answer sheets form the reference sample.",
    "related": [
      "mean",
      "gap"
    ]
  },
  "tie": {
    "title": "Tied modes",
    "short": "Two or more options share the highest count. Each is a mode.",
    "example": "A, B, blank: ignore the blank. A and B appear once each, so A and B are tied modes.\nA, B, C: each appears once, so all three are tied modes.\nA, A, B: A appears twice and is the only mode; there is no tie.",
    "related": [
      "mode",
      "match"
    ]
  },
  "match": {
    "title": "Match count",
    "alias": "A match need not be correct",
    "short": "Count one match whenever the student chooses one of the visible neighbors’ modes.",
    "example": "Neighbors choose A, A, B, so the mode is A.\nThe student chooses A → one match.\nThe student chooses B → no match.\nIf A and B tie, either choice counts as one match.",
    "related": [
      "mode",
      "mean",
      "wrong"
    ]
  },
  "wrong": {
    "title": "Matching wrong answers",
    "short": "Questions where the student chooses one of the visible neighbors’ modes, and that choice is wrong.",
    "example": "The correct answer is C. Neighbors choose B, B, A, so the mode is B.\nThe student chooses B → one matching wrong answer.\nThe student chooses A → wrong, but not a mode, so it does not count here.\nIf the neighbors choose A, B, C, all three are tied modes. Choosing A or B counts as a matching wrong answer; choosing C is a correct match.",
    "related": [
      "match",
      "sample"
    ]
  },
  "gap": {
    "title": "Difference",
    "short": "Subtract the reference average from this student’s match count.",
    "example": "The student has 22 matches; the reference average is 16.6.\n22 − 16.6 = 5.4.\nThe page shows “5.4 more.” A lower match count is shown as “fewer.”",
    "related": [
      "mean",
      "sample",
      "wrong"
    ]
  }
};
  const $=id=>document.getElementById(id),dialog=$('term-dialog'),closeButton=$('term-back');
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Labels and popup titles share one vocabulary; inline prose only changes casing.
  const label=(key,inline=false)=>{
    if(!terms[key])throw Error('Unknown explanation: '+key);
    return inline?terms[key].title.toLowerCase():terms[key].title;
  };
  const link=(key,inline=false)=>`<a class="term-link" href="#term/${key}" data-term="${key}" aria-haspopup="dialog">${escape(label(key,inline))}</a>`;
  document.querySelectorAll('a[data-term]').forEach(anchor=>{
    anchor.textContent=label(anchor.dataset.term,anchor.hasAttribute('data-term-inline'));
  });
  const route=()=>{const key=location.hash.slice(6);return location.hash.startsWith('#term/')&&Object.hasOwn(terms,key)?key:null;};
  const session='term-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  let currentKey=null,returnFocus=null,returnPosition=null,returnURL=location.pathname+location.search,returnState=null,closing=false,ownsEntry=false;

  function capture(trigger){
    returnFocus=trigger||document.activeElement;
    returnPosition={x:window.scrollX,y:window.scrollY};
  }
  function render(key){
    const term=terms[key];currentKey=key;
    $('term-title').textContent=term.title;$('term-alias').textContent=term.alias||'';$('term-alias').hidden=!term.alias;
    $('term-short').textContent=term.short;$('term-example').textContent=term.example;

    $('term-reading').scrollTop=0;$('term-layout').scrollTop=0;
  }
  function show(key){
    const wasOpen=dialog.open;
    if(currentKey!==key||!wasOpen)render(key);
    if(!wasOpen){document.documentElement.classList.add('term-open');dialog.showModal();}
    $('term-title').focus({preventScroll:true});
  }
  function hide(){
    if(!dialog.open)return;
    dialog.close();document.documentElement.classList.remove('term-open');currentKey=null;closing=false;ownsEntry=false;
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    if(returnPosition)window.scrollTo({left:returnPosition.x,top:returnPosition.y,behavior:'instant'});
  }
  function open(key,trigger){
    if(!Object.hasOwn(terms,key)||closing)return;
    const alreadyOpen=dialog.open;
    if(!alreadyOpen){capture(trigger);returnURL=location.pathname+location.search+location.hash;returnState=history.state;}
    if(alreadyOpen)history.replaceState(history.state,'','#term/'+key);
    else {
      const state={...(history.state&&typeof history.state==='object'?history.state:{}),answerLabTerm:session};
      history.pushState(state,'','#term/'+key);ownsEntry=true;
    }
    show(key);
  }
  function sync(){
    const key=route();
    if(key){ownsEntry=history.state?.answerLabTerm===session;if(!dialog.open)capture(null);show(key);}else hide();
  }
  function close(){
    if(!dialog.open||closing)return;
    closing=true;
    if(ownsEntry&&history.state?.answerLabTerm===session)history.back();
    else {history.replaceState(returnState,'',returnURL);hide();}
  }
  document.addEventListener('click',event=>{
    const trigger=event.target.closest?.('a[data-term]');
    if(!trigger||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    if(!Object.hasOwn(terms,trigger.dataset.term))return;
    event.preventDefault();open(trigger.dataset.term,trigger);
  });
  closeButton.addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);
  window.TermHelp={link};
  if(route()){capture(null);show(route());}
})();
