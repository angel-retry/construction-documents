import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QuantitySaveQueue,quantityPatch} from '../lib/quantity-save-queue.ts';

const initial=()=>({target:'10.0000',note:'原備註',days:{'2026-10-01':'2','2026-10-02':'3'}});
function harness(){
 const calls=[],acks=[];
 const queue=new QuantitySaveQueue(initial(),1,(patch,revision,remove)=>new Promise((resolve,reject)=>calls.push({patch,revision,remove,resolve,reject})),()=>{},(...args)=>acks.push(args));
 return {queue,calls,acks};
}
const edit=(queue,patch)=>queue.edit({...queue.draft,...patch});
const ok=(call,revision)=>call.resolve({ok:true,revision,message:'已儲存。'});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('untouched, numeric formatting, and reverted drafts make no requests',async()=>{
 const {queue,calls}=harness();
 await queue.submit();edit(queue,{target:'10'});await queue.submit();
 edit(queue,{note:'修改'});edit(queue,{note:'原備註'});await queue.submit();
 assert.equal(calls.length,0);assert.equal(queue.dirty,false);
});
test('patch includes only changed fields and days, including an explicit zero',()=>{
 const draft=initial();draft.days['2026-10-01']='0';draft.note='';
 assert.deepEqual(quantityPatch(initial(),draft),{note:'',days:{'2026-10-01':'0'}});
});
test('success acknowledges only the sent snapshot and preserves newer input',async()=>{
 const {queue,calls,acks}=harness();edit(queue,{target:'12'});
 const saving=queue.submit();edit(queue,{target:'15'});ok(calls[0],2);await saving;
 assert.equal(queue.draft.target,'15');assert.equal(queue.saved.target,'12');
 assert.equal(queue.dirty,true);assert.equal(queue.busy,false);assert.equal(acks[0][0].target,'12');
});
test('same item serializes and coalesces queued saves using the acknowledged revision',async()=>{
 const {queue,calls}=harness();edit(queue,{target:'12'});const saving=queue.submit();
 edit(queue,{target:'14'});void queue.submit();edit(queue,{target:'16'});void queue.submit();
 assert.equal(calls.length,1);ok(calls[0],2);await tick();
 assert.equal(calls.length,2);assert.equal(calls[1].revision,2);
 assert.deepEqual(calls[1].patch,{target:'16',days:{}});
 ok(calls[1],3);await saving;assert.equal(queue.dirty,false);assert.equal(queue.revision,3);
});
test('reverting to the original value during a save is queued after acknowledgement',async()=>{
 const {queue,calls}=harness();edit(queue,{target:'12'});const saving=queue.submit();
 edit(queue,{target:'10.0000'});void queue.submit();ok(calls[0],2);await tick();
 assert.equal(calls[1].patch.target,'10.0000');ok(calls[1],3);await saving;
 assert.equal(queue.saved.target,'10.0000');assert.equal(queue.dirty,false);
});
test('a failure retains latest input and stops the queue; retry uses the last known revision',async()=>{
 const {queue,calls,acks}=harness();edit(queue,{target:'12'});const saving=queue.submit();
 edit(queue,{target:'16'});void queue.submit();calls[0].reject(Error('offline'));await saving;
 assert.equal(queue.failed,true);assert.equal(queue.busy,false);assert.equal(queue.draft.target,'16');
 assert.equal(calls.length,1);assert.equal(acks.length,0);assert.equal(queue.revision,1);
 const retry=queue.submit();assert.equal(calls[1].revision,1);assert.equal(calls[1].patch.target,'16');
 ok(calls[1],2);await retry;assert.equal(queue.failed,false);assert.equal(queue.dirty,false);
});
test('conflicts preserve the draft and never advance the saved baseline',async()=>{
 const {queue,calls}=harness();edit(queue,{note:'我的備註'});const saving=queue.submit();
 calls[0].resolve({ok:false,message:'版本衝突'});await saving;
 assert.equal(queue.message,'版本衝突');assert.equal(queue.dirty,true);assert.equal(queue.saved.note,'原備註');assert.equal(queue.revision,1);
});
test('different items can save concurrently',async()=>{
 const a=harness(),b=harness();edit(a.queue,{target:'12'});edit(b.queue,{target:'13'});
 const savingA=a.queue.submit(),savingB=b.queue.submit();
 assert.equal(a.calls.length,1);assert.equal(b.calls.length,1);
 ok(b.calls[0],2);await savingB;assert.equal(a.queue.busy,true);
 ok(a.calls[0],2);await savingA;
});
test('duplicate submits do not repeat an acknowledged save',async()=>{
 const {queue,calls}=harness();edit(queue,{target:'12'});const saving=queue.submit();void queue.submit();
 ok(calls[0],2);await saving;assert.equal(calls.length,1);
});
test('removal waits for an earlier save and uses its new revision',async()=>{
 const {queue,calls,acks}=harness();edit(queue,{target:'12'});const saving=queue.submit();void queue.submit(true);
 ok(calls[0],2);await tick();assert.equal(calls[1].remove,true);assert.equal(calls[1].revision,2);
 ok(calls[1],3);await saving;assert.equal(queue.removed,true);assert.equal(acks[1][2],true);
});
