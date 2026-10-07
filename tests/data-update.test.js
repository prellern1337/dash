import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { invokeUpdate } from '../api/data-update.js';

test('adapter forwards update and fails on HTTP error', async () => {
  assert.deepEqual(await invokeUpdate(async(req,res)=>{
    assert.equal(req.query.action,'update');res.status(200).json({status:'partial'});
  }),{status:'partial'});
  await assert.rejects(invokeUpdate(async(req,res)=>res.status(500).json({status:'error'})));
});
test('endpoint rejects unauthorized/unknown requests before database access', async () => {
  const old=process.env.CRON_SECRET;
  process.env.CRON_SECRET='test-secret';
  try {
    const response={setHeader(){},status(code){this.code=code;return this;},json(payload){this.payload=payload;}};
    await handler({url:'/api/data-update?dataset=news',headers:{}},response);
    assert.equal(response.code,401);
    await handler({url:'/api/data-update?dataset=invalid',headers:{authorization:'Bearer test-secret'}},response);
    assert.equal(response.code,400);
  } finally { if(old===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old; }
});
