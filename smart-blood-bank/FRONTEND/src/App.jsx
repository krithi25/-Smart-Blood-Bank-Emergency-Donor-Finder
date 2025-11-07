import React, {useState, useEffect} from 'react'

// API base (Vite environment variable VITE_API_BASE can override)
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ? import.meta.env.VITE_API_BASE : 'http://localhost:4000'

// Helper: localStorage data helpers
const load = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback } catch(e){ return fallback }
}
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`

export default function App(){
  // global data stores
  const [donors, setDonors] = useState([])
  const [banks, setBanks] = useState([])
  const [donations, setDonations] = useState([])
  const [tests, setTests] = useState([])
  const [patients, setPatients] = useState([])
  const [requests, setRequests] = useState([])
  const [staffs, setStaffs] = useState([])

  // auth state
  const [user, setUser] = useState(() => load('currentUser', null))

  // Load data from backend on first render
  useEffect(()=>{
    const loadAll = async ()=>{
      try{
        const [donorsRes,banksRes,donationsRes,testsRes,patientsRes,requestsRes,staffsRes] = await Promise.all([
          fetch(`${API_BASE}/api/donor`).then(r=>r.json()),
          fetch(`${API_BASE}/api/banks`).then(r=>r.json()),
          fetch(`${API_BASE}/api/donations`).then(r=>r.json()),
          fetch(`${API_BASE}/api/tests`).then(r=>r.json()),
          fetch(`${API_BASE}/api/patients`).then(r=>r.json()),
          fetch(`${API_BASE}/api/requests`).then(r=>r.json()),
          fetch(`${API_BASE}/api/staffs`).then(r=>r.json()),
        ])
        setDonors(donorsRes||[])
        setBanks(banksRes||[])
        setDonations(donationsRes||[])
        setTests(testsRes||[])
        setPatients(patientsRes||[])
        setRequests(requestsRes||[])
        setStaffs(staffsRes||[])
      }catch(e){ console.error('Failed to load backend data', e) }
    }
    loadAll()
  },[])

  // roleChoice: null => show role selection (Donor / Hospital). 'donor'|'hospital' => show sign-in for that role
  const [roleChoice, setRoleChoice] = useState(null)
  // simple client-side page navigation: 'home' | 'addPatient' | 'addRequest' | 'addStaff'
  const [page, setPage] = useState('home')

  // Basic add handlers used by the app
  const addDonor = async (d)=>{
  try{ const res = await fetch(`${API_BASE}/api/donor`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); const created = await res.json(); setDonors(prev=>[...prev,created]); return created }catch(e){ console.error(e) }
  }
  const addBank = async (b)=>{
  try{ const res = await fetch(`${API_BASE}/api/banks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const created = await res.json(); setBanks(prev=>[...prev,created]); return created }catch(e){ console.error(e) }
  }
  const addDonation = async ({donation_id, donor_id, bank_id, quantity})=>{
    try{
  const res = await fetch(`${API_BASE}/api/donate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({donor_id, bank_id, quantity})});
      const body = await res.json();
      if(body.donation){ setDonations(prev=>[...prev, body.donation]) }
      if(body.test){ setTests(prev=>[...prev, body.test]) }
      return body
    }catch(e){ console.error(e) }
  }
  const addTest = async (t)=>{
    try{
      // update existing test via POST /api/tests/:id
  const res = await fetch(`${API_BASE}/api/tests/${t.test_id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t)});
      const updated = await res.json();
      setTests(prev=>[...prev.filter(x=>x.test_id!==updated.test_id), updated]);
      return updated
    }catch(e){ console.error(e) }
  }
  const addPatient = async (p)=>{
    try{
  const res = await fetch(`${API_BASE}/api/patients`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})
      if(!res.ok){ const err = await res.json().catch(()=>({error:'server error'})); throw new Error(err.error||'Failed to create patient') }
      const created = await res.json()
      setPatients(prev=>[...prev,created])
      return created
    }catch(e){
      console.error('Create patient failed, using local fallback', e)
      const local = { patient_id: uid('pat'), hospital_id: p.hospital_id || p.hospitalId || '', name: p.name, age: p.age, gender: p.gender, blood_group: p.blood_group || p.blood_group, disease: p.disease }
      setPatients(prev=>[...prev, local])
      return local
    }
  }

  const addRequest = async (r)=>{
    try{
  const res = await fetch(`${API_BASE}/api/requests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r)})
      if(!res.ok){ const err = await res.json().catch(()=>({error:'server error'})); throw new Error(err.error||'Failed to create request') }
      const created = await res.json()
      setRequests(prev=>[...prev,created])
      return created
    }catch(e){
      console.error('Create request failed', e)
      const local = { ...r }
      setRequests(prev=>[...prev, local])
      return local
    }
  }

  const addStaff = async (s)=>{
    try{
  const res = await fetch(`${API_BASE}/api/staffs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)})
      if(!res.ok){ const err = await res.json().catch(()=>({error:'server error'})); throw new Error(err.error||'Failed to create staff') }
      const created = await res.json()
      setStaffs(prev=>[...prev,created])
      return created
    }catch(e){
      console.error('Create staff failed, using local fallback', e)
      const local = { staff_id: uid('staff'), bank_id: s.bank_id || s.bankId || '', contact: s.contact || '', name: s.name || 'Staff', experience: s.experience || '', qualification: s.qualification || '' }
      setStaffs(prev=>[...prev, local])
      return local
    }
  }


  // Sign-in / Login UI with role selection first
  if(!user){
    // if roleChoice is null, show the two big buttons to choose Donor or Hospital
    if(!roleChoice){
      return (
        <div className="auth-stage">
          <Header compact />
          <div style={{minHeight:'70vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="landing-card" style={{maxWidth:720,display:'flex',flexDirection:'column',alignItems:'center',gap:18}}>
              <h1 style={{margin:0}}>Welcome</h1>
              <p className="muted">Please choose how you'd like to continue</p>
              <div style={{display:'flex',gap:16}}>
                <button className="btn" style={{padding:'16px 22px'}} onClick={()=>setRoleChoice('donor')}>I am a Donor</button>
                <button className="btn secondary" style={{padding:'16px 22px'}} onClick={()=>setRoleChoice('hospital')}>I am a Hospital / Bank</button>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      )
    }
    // otherwise, render SignIn for the chosen role (default to login view)
    return (
      <div className="auth-stage">
        <Header />
        <div className="auth-panel signin-panel visible">
          <div className="signin-hero">
            <div className="signin-card">
              <div className="header">
                <div className="app-title">
                  <div className="logo" aria-hidden>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C12 2 6 9 6 13.5C6 16.5376 8.46243 19 11.5 19H12.5C15.5376 19 18 16.5376 18 13.5C18 9 12 2 12 2Z" fill="#000000"/>
                      <path d="M12 2C12 2 8 7.5 8 11.5C8 14.5376 10.4624 17 13.5 17H14.5C17.5376 17 20 14.5376 20 11.5C20 7.5 16 2 12 2Z" fill="rgba(0,0,0,0.04)"/>
                    </svg>
                  </div>
                  <div>
                    <h1>Sign in</h1>
                    <p className="muted">{roleChoice==='donor' ? 'Donor login' : 'Hospital / Bank login'}</p>
                  </div>
                </div>
              </div>
              <div style={{marginTop:12}}>
                <SignIn initialRole={roleChoice} onCreate={(u)=>{ setUser(u); save('currentUser', u); setRoleChoice(null) }} onLogin={(u)=>{ setUser(u); save('currentUser', u); setRoleChoice(null) }} donors={donors} banks={banks} />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="home-hero">
      <Header />
      <div className="container">
        {/* Sidebar removed as requested. Main area will occupy the full container width. */}

        <main className="main-area">
          <div className="topbar" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
            <div>Welcome, <strong>{user.role==='donor' ? user.name : user.hospital_name}</strong></div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="muted">{new Date().toLocaleString()}</div>
              <button className="btn secondary" onClick={()=>{ setUser(null); save('currentUser', null); window.location.reload() }}>Logout</button>
            </div>
          </div>

          <div className="content">
            <HomePanel user={user} donors={donors} banks={banks} donations={donations} tests={tests} patients={patients} requests={requests} staffs={staffs}
              onAddBank={addBank} onAddDonor={addDonor} onAddDonation={addDonation} onAddTest={addTest} onAddPatient={addPatient} onAddRequest={addRequest} onAddStaff={addStaff} />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

function Header({compact=false}){
  if(compact){
    return (
      <header className="site-header">
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'18px 0'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className="logo" style={{width:44,height:44}}>BD</div>
            <div style={{textAlign:'center'}}>
              <div style={{fontWeight:700,fontSize:18}}>Blood Donation System</div>
              <div className="small muted">Community blood management</div>
            </div>
          </div>
        </div>
      </header>
    )
  }
  return (
    <header className="site-header">
      <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div className="logo" style={{width:44,height:44}}>BD</div>
          <div>
            <div style={{fontWeight:700}}>Blood Donation System</div>
            <div className="small muted">Community blood management</div>
          </div>
        </div>
        {/* Navigation links removed per design request (header kept minimal) */}
        <div />
      </div>
    </header>
  )
}

function Footer(){
  return (
    <footer className="site-footer">
      <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div className="small">© {new Date().getFullYear()} Blood Donation System</div>
        <div className="small muted">Built for demo — not for production use</div>
      </div>
    </footer>
  )
}

function SignIn({initialRole,onCreate,onLogin,donors,banks}){
  // initialRole prop comes from parent when we want a role-specific flow (donor/hospital)
  // If absent, user can choose role via radio (legacy behavior).
  const [mode, setMode] = useState('create')
  const [role, setRole] = useState('donor')
  // support incoming prop
  useEffect(()=>{ if(initialRole) setRole(initialRole) },[initialRole])

  // donor fields
  const [dname,setDname]=useState('')
  const [dbirth,setDbirth]=useState('')
  const [dgender,setDgender]=useState('male')
  const [daddress,setDaddress]=useState('')
  const [dphone,setDphone]=useState('')
  const [dblood,setDblood]=useState('A+')
  const [dpassword,setDpassword]=useState('')

  // hospital fields
  const [hname,setHname]=useState('')
  const [hloc,setHloc]=useState('')
  const [hphone,setHphone]=useState('')
  const [hpassword,setHpassword]=useState('')

  // login select
  const [loginId,setLoginId]=useState('')
  const [loginPassword,setLoginPassword]=useState('')

  const create = async ()=>{
    // validation helpers
    const phoneOk = (p)=>{ const re = /^\+?[0-9]{7,15}$/; return re.test(p) }
    const pwdOk = (p)=>{ // min 8, 1 upper, 1 lower, 1 digit
      const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; return re.test(p)
    }
    const computeAge = (birth)=>{
      if(!birth) return null
      const b = new Date(birth)
      if(Number.isNaN(b.getTime())) return null
      const today = new Date()
      let age = today.getFullYear() - b.getFullYear()
      const m = today.getMonth() - b.getMonth()
      if(m<0 || (m===0 && today.getDate() < b.getDate())) age--
      return age
    }

    if(role==='donor'){
      // client-side validations
      if(!dname) return alert('Please enter name')
      if(!dbirth) return alert('Please enter date of birth')
      const derivedAge = computeAge(dbirth)
      if(derivedAge===null || derivedAge<0 || derivedAge>120) return alert('Please enter a valid date of birth')
      if(!phoneOk(dphone)) return alert('Phone must be digits, optionally starting with +, 7–15 digits')
      if(!pwdOk(dpassword)) return alert('Password must be at least 8 characters, include upper and lower case and a number')
      const donor = { name:dname, birth_date:dbirth, gender:dgender, age:derivedAge, address:daddress, ph_no:dphone, blood_type:dblood, password: dpassword }
      try{
      const res = await fetch(`${API_BASE}/api/donor`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(donor)})
        if(!res.ok){ const err = await res.json().catch(()=>({error:'server error'})); throw new Error(err.error||'Failed to create donor') }
        const created = await res.json()
        onCreate({role:'donor', ...created}); alert('Donor created and logged in')
      }catch(e){
        console.error('Create donor failed, falling back to local-only creation', e)
        // Fallback: create a local donor object so user can continue even if backend is down
        const local = { donor_id: uid('donor'), name:dname, birth_date:dbirth, gender:dgender, age:derivedAge, address:daddress, ph_no:dphone, blood_type:dblood, password:dpassword }
        onCreate({role:'donor', ...local}); alert('Donor created locally (offline) and logged in')
      }
    } else {
      const bank = { hospital_name:hname, location:hloc, contact_no:hphone, password: hpassword }
      // validate bank fields
      const phoneOk = (p)=>{ const re = /^\+?[0-9]{7,15}$/; return re.test(p) }
      const pwdOk = (p)=>{ const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; return re.test(p) }
      if(!hname) return alert('Enter hospital name')
      if(!phoneOk(hphone)) return alert('Contact must be digits, optionally starting with +, 7–15 digits')
      if(!pwdOk(hpassword)) return alert('Password must be at least 8 characters, include upper and lower case and a number')
      try{
  const res = await fetch(`${API_BASE}/api/banks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bank)})
        if(!res.ok){ const err = await res.json().catch(()=>({error:'server error'})); throw new Error(err.error||'Failed to create bank') }
        const created = await res.json()
        onCreate({role:'hospital', ...created}); alert('Hospital/bank created and logged in')
      }catch(e){
        console.error('Create bank failed, falling back to local-only creation', e)
        const local = { bank_id: uid('bank'), hospital_name:hname, location:hloc, contact_no:hphone, password:hpassword }
        onCreate({role:'hospital', ...local}); alert('Hospital/bank created locally (offline) and logged in')
      }
    }
  }

  const login = async ()=>{
    if(!loginId) return alert('Enter your username / ID');
    if(!loginPassword) return alert('Enter password');
    try{
      const payload = { role: role, username: loginId, password: loginPassword };
      const res = await fetch(`${API_BASE}/api/login`,{
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body:JSON.stringify(payload)
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({error:'server error'}));
        throw new Error(err.error || 'Login failed');
      }
      const body = await res.json();
      onLogin(body);
      alert('Login successful');
    }catch(e){
      console.error('Login failed', e);
      alert(e.message || 'Login failed');
    }
  };

  return <div>
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <label><input type="radio" checked={mode==='create'} onChange={()=>setMode('create')} /> Create</label>
      <label><input type="radio" checked={mode==='login'} onChange={()=>setMode('login')} /> Login</label>
    </div>
    <div style={{marginTop:8}}>
      {mode==='create' ? <div>
        {/* If initialRole is provided, hide role selector and force that role */}
        {!initialRole && <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
            <label><input type="radio" checked={role==='donor'} onChange={()=>setRole('donor')} /> Donor</label>
            <label><input type="radio" checked={role==='hospital'} onChange={()=>setRole('hospital')} /> Hospital/Bank</label>
          </div>}
        {role==='donor' ? <div>
          <div className="field"><label>Name</label><input value={dname} onChange={e=>setDname(e.target.value)} /></div>
    <div className="field"><label>Birth date</label><input type="date" value={dbirth} onChange={e=>setDbirth(e.target.value)} /></div>
          <div className="field"><label>Gender</label>
            <select value={dgender} onChange={e=>setDgender(e.target.value)}><option>male</option><option>female</option><option>other</option></select>
          </div>
          {/* Age is derived from Birth date and validated automatically */}
          <div className="field"><label>Address</label><input value={daddress} onChange={e=>setDaddress(e.target.value)} /></div>
          <div className="field"><label>Phone</label><input value={dphone} onChange={e=>setDphone(e.target.value)} /></div>
          <div className="field"><label>Password</label><input type="password" value={dpassword} onChange={e=>setDpassword(e.target.value)} placeholder="Choose a password" /></div>
          <div className="field"><label>Blood Type</label>
            <select value={dblood} onChange={e=>setDblood(e.target.value)}>
              <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
            </select>
          </div>
        </div> : <div>
          <div className="field"><label>Hospital/Bank Name</label><input value={hname} onChange={e=>setHname(e.target.value)} /></div>
          <div className="field"><label>Location</label><input value={hloc} onChange={e=>setHloc(e.target.value)} /></div>
          <div className="field"><label>Contact No</label><input value={hphone} onChange={e=>setHphone(e.target.value)} /></div>
          <div className="field"><label>Password</label><input type="password" value={hpassword} onChange={e=>setHpassword(e.target.value)} placeholder="Choose a password" /></div>
        </div>}
        <div style={{marginTop:8}}><button className="btn" onClick={create}>Create & Sign-in</button></div>
      </div> : <div>
        <div className="field"><label>Username or ID</label>
          <input placeholder="donor name or donor_id / hospital name or bank_id" value={loginId} onChange={e=>setLoginId(e.target.value)} />
          <div className="small muted" style={{marginTop:6}}>You can type your name or ID (e.g. donor_demo1 or Alice Walker)</div>
        </div>
        <div className="field"><label>Password</label><input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} /></div>
        <div style={{marginTop:8, display:'flex',flexDirection:'column',gap:8}}>
          <button className="btn" onClick={login}>Login</button>
          <div className="small">Don't have an account? <a href="#" onClick={(e)=>{e.preventDefault(); setMode('create')}} className="link">Sign up</a></div>
        </div>
      </div>}
    </div>
  </div>
}

function HomePanel({user,donors,banks,donations,tests,patients,requests,staffs,onAddBank,onAddDonor,onAddDonation,onAddTest,onAddPatient,onAddRequest,onAddStaff}){
  // show different views for donor/hospital
  if(user.role==='donor') return <DonorHome user={user} banks={banks} donations={donations} tests={tests} onAddDonation={onAddDonation} onAddTest={onAddTest} />
  return <HospitalHome user={user} banks={banks} patients={patients} requests={requests} staffs={staffs} onAddPatient={onAddPatient} onAddRequest={onAddRequest} onAddStaff={onAddStaff} />
}

function DonorHome({user,banks, donations, tests, onAddDonation, onAddTest}){
  const [quantity,setQuantity]=useState(1)
  const [selectedBank,setSelectedBank]=useState(banks[0]?.bank_id || '')
  const donate = ()=>{
    if(!selectedBank) return alert('No bank selected')
    const donation = { donation_id: uid('don'), donor_id:user.donor_id, bank_id:selectedBank, quantity, donation_date: new Date().toISOString() }
    onAddDonation(donation)
    // create a blank test record and link it
    const test = { test_id: uid('test'), donor_id:user.donor_id, donation_id:donation.donation_id, test_result:'pending', status:'pending', test_detail:'', test_date: new Date().toISOString() }
    onAddTest(test)
    alert('Donation recorded. A blood test record has been created (pending).')
  }

  return <div>
    <h3>Donor Dashboard</h3>
    <div className="field"><label>Choose Bank / Hospital Blood Bank</label>
      <select value={selectedBank} onChange={e=>setSelectedBank(e.target.value)}>
        <option value="">-- Select --</option>
        {banks.map(b=> <option key={b.bank_id} value={b.bank_id}>{b.hospital_name} — {b.location}</option>)}
      </select>
    </div>
    <div className="field"><label>Quantity (units)</label><input value={quantity} onChange={e=>setQuantity(Number(e.target.value))} type="number" min={1} /></div>
    <div style={{marginTop:8}}><button className="btn" onClick={donate}>Donate Blood</button></div>
    <h4 style={{marginTop:12}}>Your Donations</h4>
    <table className="table">
      <thead><tr><th>Donation ID</th><th>Bank</th><th>Quantity</th><th>Date</th><th>Test Status</th></tr></thead>
      <tbody>
        {donations.filter(d=>d.donor_id===user.donor_id).map(d=>{
          const t = tests.find(x=>x.donation_id===d.donation_id)
          const bank = banks.find(b=>b.bank_id===d.bank_id)
          return <tr key={d.donation_id}><td>{d.donation_id}</td><td>{bank?.hospital_name}</td><td>{d.quantity}</td><td>{new Date(d.donation_date).toLocaleString()}</td><td>{t?.status || 'n/a'}</td></tr>
        })}
      </tbody>
    </table>
  </div>
}

function HospitalHome({user,banks,patients,requests,staffs,onAddPatient,onAddRequest,onAddStaff}){
  const [pname,setPname]=useState('')
  const [page,setPage]=useState('')
  const [pgender,setPgender]=useState('male')
  const [pblood,setPblood]=useState('A+')
  const [pdisease,setPdisease]=useState('')

  const [selectedPatient, setSelectedPatient] = useState('')

  // request form
  const [reqBlood,setReqBlood]=useState('A+')
  const [reqQty,setReqQty]=useState(1)

  const addPatient = ()=>{
    const p = { patient_id: uid('pat'), hospital_id:user.bank_id, name:pname, age:page, gender:pgender, blood_group:pblood, disease:pdisease }
    onAddPatient(p)
    // clear inputs and select the new patient so it's available for requests
    setPname(''); setPage(''); setPgender('male'); setPblood('A+'); setPdisease('')
    setSelectedPatient(p.patient_id)
    alert('Patient added')
  }
  const makeRequest = (patientId)=>{
    const r = { request_id: uid('req'), patient_id:patientId, bank_id:user.bank_id, hospital_id:user.bank_id, blood_group_required:reqBlood, quantity_needed:reqQty, request_date:new Date().toISOString(), status:'pending' }
    onAddRequest(r)
    alert('Emergency request created')
  }
  const addStaff = ()=>{
    const s = { staff_id: uid('staff'), bank_id:user.bank_id, contact: prompt('contact number')||'', name: prompt('staff name')||'Staff', experience: prompt('experience')||'', qualification: prompt('qualification')||'' }
    onAddStaff(s)
    alert('Staff added')
  }

  return <div>
    <h3>Hospital / Bank Dashboard</h3>
    <div className="field"><label>Add Patient</label>
      <input placeholder="Name" value={pname} onChange={e=>setPname(e.target.value)} />
      <input placeholder="Age" value={page} onChange={e=>setPage(e.target.value)} />
      <select value={pgender} onChange={e=>setPgender(e.target.value)}>
        <option>male</option><option>female</option><option>other</option>
      </select>
      <select value={pblood} onChange={e=>setPblood(e.target.value)}>
        <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
      </select>
      <input placeholder="disease" value={pdisease} onChange={e=>setPdisease(e.target.value)} />
      <div style={{marginTop:8}}><button className="btn" onClick={addPatient}>Add Patient</button></div>
    </div>

    <h4 style={{marginTop:12}}>Create Emergency Request</h4>
    <div className="field"><label>For Patient</label>
      <select value={selectedPatient} onChange={e=>setSelectedPatient(e.target.value)}>
        <option value="">-- Select --</option>
        {patients.filter(p=>p.hospital_id===user.bank_id).map(p=> <option key={p.patient_id} value={p.patient_id}>{p.name} — {p.patient_id}</option>)}
      </select>
    </div>
    <div className="field"><label>Blood group</label>
      <select value={reqBlood} onChange={e=>setReqBlood(e.target.value)}>
        <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
      </select>
    </div>
    <div className="field"><label>Quantity</label><input type="number" min={1} value={reqQty} onChange={e=>setReqQty(Number(e.target.value))} /></div>
    <div style={{marginTop:8}}>
      <button className="btn" onClick={()=>{ if(!selectedPatient) return alert('Pick a patient'); makeRequest(selectedPatient)}}>Send Emergency Request</button>
      <button className="btn secondary" style={{marginLeft:8}} onClick={addStaff}>Add Staff</button>
    </div>

    <h4 style={{marginTop:12}}>Requests</h4>
    <table className="table"><thead><tr><th>ID</th><th>Patient</th><th>Blood</th><th>Qty</th><th>Status</th></tr></thead>
      <tbody>
        {requests.filter(r=>r.hospital_id===user.bank_id).map(r=>{
          const p = patients.find(x=>x.patient_id===r.patient_id)
          return <tr key={r.request_id}><td>{r.request_id}</td><td>{p?.name}</td><td>{r.blood_group_required}</td><td>{r.quantity_needed}</td><td>{r.status}</td></tr>
        })}
      </tbody>
    </table>

    <h4 style={{marginTop:18}}>Patients</h4>
    <table className="table"><thead><tr><th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Blood Group</th><th>Disease</th></tr></thead>
      <tbody>
        {patients.filter(p=>p.hospital_id===user.bank_id).map(p=> <tr key={p.patient_id}><td>{p.patient_id}</td><td>{p.name}</td><td>{p.age}</td><td>{p.gender}</td><td>{p.blood_group}</td><td>{p.disease}</td></tr>)}
      </tbody>
    </table>

    <h4 style={{marginTop:18}}>Staff</h4>
    <table className="table"><thead><tr><th>Staff ID</th><th>Name</th><th>Contact</th><th>Experience</th><th>Qualification</th></tr></thead>
      <tbody>
        {staffs.filter(s=>s.bank_id===user.bank_id).map(s=> <tr key={s.staff_id}><td>{s.staff_id}</td><td>{s.name}</td><td>{s.contact}</td><td>{s.experience}</td><td>{s.qualification}</td></tr>)}
      </tbody>
    </table>
  </div>
}
