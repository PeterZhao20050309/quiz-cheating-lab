(function(root){
  'use strict';
  // Descriptive, leave-target-and-visible-sources-out sample estimates.
  // Inputs are actual options A-D or null. No generator probabilities or labels.
  function analyze(answers,i,sources){
    const excluded=new Set([i,...sources]),references=answers.map((_,j)=>j).filter(j=>!excluded.has(j));
    const items=answers[i].map((own,q)=>{
      const counts={A:0,B:0,C:0,D:0};
      for(const j of sources){const choice=answers[j][q];if(choice)counts[choice]++;}
      const max=Math.max(...Object.values(counts)),modes=max?Object.keys(counts).filter(x=>counts[x]===max):[];
      const referenceCounts={A:0,B:0,C:0,D:0,blank:0};
      const referenceAnswers=references.map(j=>({i:j,choice:answers[j][q]}));
      for(const {choice} of referenceAnswers)referenceCounts[choice||'blank']++;
      const eligible=modes.length>0,matchedReferences=referenceAnswers.filter(x=>modes.includes(x.choice)).length;
      return {q:q+1,own,modes,eligible,match:eligible&&modes.includes(own),referenceAnswers,referenceCounts,matchedReferences,
        referenceCount:references.length,estimate:eligible&&references.length?matchedReferences/references.length:null};
    });
    const eligible=items.filter(q=>q.eligible).length,matches=items.filter(q=>q.match).length;
    // Count each reference against THE SAME fixed modal sets, not its own neighbors.
    const referenceTotals=references.map(j=>({i:j,matches:items.filter(q=>q.eligible&&q.modes.includes(answers[j][q.q-1])).length}));
    const expected=references.length&&eligible?referenceTotals.reduce((s,r)=>s+r.matches,0)/references.length:null;
    const excess=expected===null?null:matches-expected;
    const leaveOneOutMeans=references.length>1&&expected!==null?referenceTotals.map(r=>(expected*references.length-r.matches)/(references.length-1)):[];
    return {i,sources:[...sources],references,items,eligible,matches,expected,excess,excessRate:excess===null?null:excess/eligible,
      referenceTotals,referenceRange:expected===null?null:[Math.min(...referenceTotals.map(r=>r.matches)),Math.max(...referenceTotals.map(r=>r.matches))],
      sensitivity:leaveOneOutMeans.length?[Math.min(...leaveOneOutMeans),Math.max(...leaveOneOutMeans)]:null};
  }
  const api={analyze};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ExamSampleReference=api;
})(typeof globalThis!=='undefined'?globalThis:this);
