const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Test creating a donor
    console.log('Testing donor creation...');
    const donorResponse = await fetch('http://localhost:4000/api/donor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Donor API',
        birth_date: '1995-01-01',
        gender: 'male',
        address: 'Test Address',
        ph_no: '9876543210',
        blood_type: 'B+',
        password: 'TestPass1'
      })
    });
    
    if (donorResponse.ok) {
      const donor = await donorResponse.json();
      console.log('Donor created:', donor);
    } else {
      console.log('Donor creation failed:', await donorResponse.text());
    }

    // Test creating a hospital
    console.log('\nTesting hospital creation...');
    const hospitalResponse = await fetch('http://localhost:4000/api/banks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospital_name: 'Test Hospital API',
        location: 'Test Location',
        contact_no: '9876543210',
        password: 'TestPass1'
      })
    });
    
    if (hospitalResponse.ok) {
      const hospital = await hospitalResponse.json();
      console.log('Hospital created:', hospital);
    } else {
      console.log('Hospital creation failed:', await hospitalResponse.text());
    }

    // Test creating a patient
    console.log('\nTesting patient creation...');
    const patientResponse = await fetch('http://localhost:4000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospital_id: 1,
        name: 'Test Patient API',
        age: 30,
        gender: 'male',
        blood_group: 'A+',
        disease: 'Test Disease'
      })
    });
    
    if (patientResponse.ok) {
      const patient = await patientResponse.json();
      console.log('Patient created:', patient);
    } else {
      console.log('Patient creation failed:', await patientResponse.text());
    }

  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

testAPI();