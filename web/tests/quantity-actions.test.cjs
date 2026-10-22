const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');

// Execute the real action with a recording database client; never touch live data.
function service({current={target_quantity:'10',note:'舊備註',revision:4},rpcError=null}={}){
 const calls=[];
 const client={
  from(table){calls.push({read:table});return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:current,error:null};}};},
  async rpc(name,args){calls.push({rpc:name,args});return {data:5,error:rpcError};}
 };
 const source=fs.readFileSync(new URL('../app/projects/[id]/quantities/actions.ts',`file://${__filename}`),'utf8');
 const code=stripTypeScriptTypes(source).replace(/^import .*$/gm,'').replace(/export async function/g,'async function');
 const module={exports:{}};
 vm.runInNewContext(code+';module.exports={saveItem};',{module,FormData,
  requireUser:async()=>({client}),uuidPattern:/^[a-f0-9-]{36}$/,
  revalidatePath(){throw Error('save must not reload month');},catalogs:{}});
 return {save:module.exports.saveItem,calls};
}
function form(patch={}){
 const data=new FormData();
 for(const [key,value] of Object.entries({site:'11111111-1111-4111-8111-111111111111',id:'22222222-2222-4222-8222-222222222222',revision:'4',site_revision:'3',...patch}))data.set(key,value);
 return data;
}
test('partial daily save reads only the target and sends only changed days without revalidation',async()=>{
 const {save,calls}=service();const result=await save({message:''},form({'day:2026-10-02':'0'}));
 assert.equal(result.ok,true);assert.equal(result.revision,5);
 assert.deepEqual(calls.map(c=>c.read||c.rpc),['item_period_targets','save_monthly_item']);
 assert.equal(calls[1].args.p_target,'10');assert.equal(calls[1].args.p_note,'舊備註');
 assert.deepEqual(Object.entries(calls[1].args.p_days),[['2026-10-02','0']]);
});
test('explicit empty note and zero quantity are preserved and need no read',async()=>{
 const {save,calls}=service();const result=await save({message:''},form({target:'0',note:''}));
 assert.equal(result.ok,true);assert.equal(calls.length,1);assert.equal(calls[0].args.p_target,'0');assert.equal(calls[0].args.p_note,'');
});
test('a changed revision blocks the RPC and preserves the submitted revision',async()=>{
 const {save,calls}=service({current:{target_quantity:'12',note:'other',revision:5}});
 const result=await save({message:'',revision:4},form({note:'mine'}));
 assert.equal(result.ok,false);assert.equal(result.revision,4);assert.equal(calls.length,1);
});
test('database conflicts and closed periods return failure',async()=>{
 for(const code of ['40001','42501']){
  const {save}=service({rpcError:{code}});const result=await save({message:'',revision:4},form({target:'10',note:'mine'}));
  assert.equal(result.ok,false);assert.equal(result.revision,4);
 }
});
test('invalid quantities are rejected before database operations',async()=>{
 for(const patch of [{target:'-1'},{'day:2026-10-02':'1.23456'},{note:'x'.repeat(2001)}]){
  const {save,calls}=service();assert.equal((await save({message:''},form(patch))).ok,false);assert.equal(calls.length,0);
 }
});
