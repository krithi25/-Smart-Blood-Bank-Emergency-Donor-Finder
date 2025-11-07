PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS donors (
  donor_id TEXT PRIMARY KEY,
  name TEXT,
  birth_date TEXT,
  gender TEXT,
  age INTEGER,
  address TEXT,
  ph_no TEXT,
  blood_type TEXT
);

CREATE TABLE IF NOT EXISTS banks (
  bank_id TEXT PRIMARY KEY,
  hospital_name TEXT,
  location TEXT,
  contact_no TEXT
);

CREATE TABLE IF NOT EXISTS donations (
  donation_id TEXT PRIMARY KEY,
  donor_id TEXT,
  bank_id TEXT,
  quantity INTEGER,
  donation_date TEXT,
  FOREIGN KEY(donor_id) REFERENCES donors(donor_id),
  FOREIGN KEY(bank_id) REFERENCES banks(bank_id)
);

CREATE TABLE IF NOT EXISTS tests (
  test_id TEXT PRIMARY KEY,
  donor_id TEXT,
  donation_id TEXT,
  test_result TEXT,
  status TEXT,
  test_detail TEXT,
  test_date TEXT,
  FOREIGN KEY(donor_id) REFERENCES donors(donor_id),
  FOREIGN KEY(donation_id) REFERENCES donations(donation_id)
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id TEXT PRIMARY KEY,
  hospital_id TEXT,
  name TEXT,
  age INTEGER,
  gender TEXT,
  blood_group TEXT,
  disease TEXT,
  FOREIGN KEY(hospital_id) REFERENCES banks(bank_id)
);

CREATE TABLE IF NOT EXISTS requests (
  request_id TEXT PRIMARY KEY,
  patient_id TEXT,
  bank_id TEXT,
  hospital_id TEXT,
  blood_group_required TEXT,
  quantity_needed INTEGER,
  request_date TEXT,
  status TEXT,
  FOREIGN KEY(patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY(bank_id) REFERENCES banks(bank_id),
  FOREIGN KEY(hospital_id) REFERENCES banks(bank_id)
);

CREATE TABLE IF NOT EXISTS staffs (
  staff_id TEXT PRIMARY KEY,
  bank_id TEXT,
  contact TEXT,
  name TEXT,
  experience TEXT,
  qualification TEXT,
  FOREIGN KEY(bank_id) REFERENCES banks(bank_id)
);
