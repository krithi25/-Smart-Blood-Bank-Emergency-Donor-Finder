(async ()=>{
  try{
    const url = process.env.TEST_URL || 'http://localhost:4004/api/login'
    const body = { role: 'donor', username: 'Ravi Kumar', password: 'ravi123' }
    console.log('Posting to', url)
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) })
    const text = await res.text()
    console.log('Status:', res.status)
    console.log('Body:', text)
  }catch(e){ console.error('Request error', e.message) }
})();
