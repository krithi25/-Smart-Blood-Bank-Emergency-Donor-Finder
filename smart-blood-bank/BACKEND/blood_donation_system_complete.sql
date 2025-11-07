-- ============================================================================
-- BLOOD DONATION SYSTEM - COMPREHENSIVE SQL QUERIES
-- ============================================================================
-- This file contains all SQL components required for the blood donation system
-- including tables, triggers, procedures, functions, nested queries, joins, and aggregates
-- ============================================================================

-- ============================================================================
-- 1. DATABASE CREATION AND TABLE DEFINITIONS
-- ============================================================================

CREATE DATABASE IF NOT EXISTS blood_system;
USE blood_system;

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS bloodtest;
DROP TABLE IF EXISTS donationrecord;
DROP TABLE IF EXISTS emergencyrequest;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS donor;
DROP TABLE IF EXISTS hospital;
DROP TABLE IF EXISTS bloodbank;

-- Create Donor Table
CREATE TABLE donor (
    Donor_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Age INT CHECK (Age >= 18 AND Age <= 65),
    Gender ENUM('Male', 'Female', 'Other') NOT NULL,
    BloodGroup VARCHAR(5),
    Blood_Group VARCHAR(5),
    PhoneNo VARCHAR(15),
    Phone_No VARCHAR(15),
    Password VARCHAR(255) NOT NULL,
    Address TEXT,
    LastDonationDate DATE,
    LastDonation_Date DATE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_donor_blood (Blood_Group),
    INDEX idx_donor_phone (PhoneNo)
);

-- Create Hospital Table
CREATE TABLE hospital (
    Hospital_ID INT AUTO_INCREMENT PRIMARY KEY,
    Hospital_Name VARCHAR(200) NOT NULL,
    Location TEXT NOT NULL,
    Contact_No VARCHAR(15) NOT NULL,
    Password VARCHAR(255) NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hospital_name (Hospital_Name)
);

-- Create Blood Bank Table
CREATE TABLE bloodbank (
    Bank_ID INT AUTO_INCREMENT PRIMARY KEY,
    Bank_Name VARCHAR(200) NOT NULL,
    Location TEXT NOT NULL,
    Contact_No VARCHAR(15) NOT NULL,
    Hospital_ID INT,
    BloodStock JSON,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Hospital_ID) REFERENCES hospital(Hospital_ID) ON DELETE CASCADE,
    INDEX idx_bank_location (Location(50))
);

-- Create Patient Table
CREATE TABLE patient (
    Patient_ID INT AUTO_INCREMENT PRIMARY KEY,
    Hospital_ID INT NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Age INT CHECK (Age >= 0 AND Age <= 120),
    Gender ENUM('Male', 'Female', 'Other') NOT NULL,
    Blood_Group VARCHAR(5) NOT NULL,
    Disease VARCHAR(200),
    AdmissionDate DATE DEFAULT (CURRENT_DATE),
    Status ENUM('Active', 'Discharged', 'Critical') DEFAULT 'Active',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Hospital_ID) REFERENCES hospital(Hospital_ID) ON DELETE CASCADE,
    INDEX idx_patient_blood (Blood_Group),
    INDEX idx_patient_hospital (Hospital_ID)
);

-- Create Staff Table
CREATE TABLE staff (
    Staff_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Role VARCHAR(100) NOT NULL,
    Contact_No VARCHAR(15) NOT NULL,
    Bank_ID INT,
    Hospital_ID INT,
    Qualification VARCHAR(200),
    Experience INT DEFAULT 0,
    Salary DECIMAL(10,2),
    HireDate DATE DEFAULT (CURRENT_DATE),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Bank_ID) REFERENCES bloodbank(Bank_ID) ON DELETE SET NULL,
    FOREIGN KEY (Hospital_ID) REFERENCES hospital(Hospital_ID) ON DELETE SET NULL,
    INDEX idx_staff_role (Role),
    INDEX idx_staff_bank (Bank_ID)
);

-- Create Donation Record Table
CREATE TABLE donationrecord (
    Donation_ID INT AUTO_INCREMENT PRIMARY KEY,
    Donor_ID INT NOT NULL,
    Bank_ID INT NOT NULL,
    Donation_Date DATE NOT NULL,
    Quantity_Donated INT CHECK (Quantity_Donated > 0 AND Quantity_Donated <= 5),
    Notes TEXT,
    Status ENUM('Pending', 'Completed', 'Rejected') DEFAULT 'Pending',
    CollectedBy INT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Donor_ID) REFERENCES donor(Donor_ID) ON DELETE CASCADE,
    FOREIGN KEY (Bank_ID) REFERENCES bloodbank(Bank_ID) ON DELETE CASCADE,
    FOREIGN KEY (CollectedBy) REFERENCES staff(Staff_ID) ON DELETE SET NULL,
    INDEX idx_donation_date (Donation_Date),
    INDEX idx_donation_donor (Donor_ID),
    INDEX idx_donation_bank (Bank_ID)
);

-- Create Blood Test Table
CREATE TABLE bloodtest (
    Test_ID INT AUTO_INCREMENT PRIMARY KEY,
    Donation_ID INT NOT NULL,
    Donor_ID INT NOT NULL,
    Test_Date DATE NOT NULL,
    Test_Result VARCHAR(200),
    Status ENUM('Pending', 'Passed', 'Failed') DEFAULT 'Pending',
    TestedBy INT,
    TestDetails JSON,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Donation_ID) REFERENCES donationrecord(Donation_ID) ON DELETE CASCADE,
    FOREIGN KEY (Donor_ID) REFERENCES donor(Donor_ID) ON DELETE CASCADE,
    FOREIGN KEY (TestedBy) REFERENCES staff(Staff_ID) ON DELETE SET NULL,
    INDEX idx_test_status (Status),
    INDEX idx_test_date (Test_Date)
);

-- Create Emergency Request Table
CREATE TABLE emergencyrequest (
    Request_ID INT AUTO_INCREMENT PRIMARY KEY,
    Patient_ID INT NOT NULL,
    Hospital_ID INT NOT NULL,
    Bank_ID INT,
    BloodGroup_Required VARCHAR(5) NOT NULL,
    Quantity_Needed INT CHECK (Quantity_Needed > 0),
    Request_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Required_By DATETIME,
    Status ENUM('Pending', 'Allocated', 'Dispatched', 'Completed', 'Cancelled') DEFAULT 'Pending',
    Priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    FulfilledBy INT,
    Notes TEXT,
    FOREIGN KEY (Patient_ID) REFERENCES patient(Patient_ID) ON DELETE CASCADE,
    FOREIGN KEY (Hospital_ID) REFERENCES hospital(Hospital_ID) ON DELETE CASCADE,
    FOREIGN KEY (Bank_ID) REFERENCES bloodbank(Bank_ID) ON DELETE SET NULL,
    FOREIGN KEY (FulfilledBy) REFERENCES staff(Staff_ID) ON DELETE SET NULL,
    INDEX idx_request_status (Status),
    INDEX idx_request_blood (BloodGroup_Required),
    INDEX idx_request_priority (Priority)
);

-- ============================================================================
-- 2. INSERT SAMPLE DATA
-- ============================================================================

-- Insert Donors
INSERT INTO donor (Name, Age, Gender, Blood_Group, PhoneNo, Password, Address, LastDonationDate) VALUES
('Ravi Kumar', 28, 'Male', 'A+', '9876543210', 'ravi123', 'Indiranagar, Bangalore', '2025-11-07'),
('Anita Reddy', 34, 'Female', 'B+', '9988776655', 'anita456', 'Mysuru', '2025-05-12'),
('Suresh Naik', 45, 'Male', 'O+', '9000001111', 'suresh789', 'Bangalore', '2025-06-18'),
('Deepa Sharma', 26, 'Female', 'AB+', '9786452310', 'deepa321', 'Hubli', '2025-04-25'),
('Rahul Verma', 30, 'Male', 'A-', '9123456789', 'rahul654', 'Mangalore', '2025-07-01'),
('Kavya Nair', 27, 'Female', 'O-', '9876000111', 'kavya999', 'Bangalore', '2025-08-10');

-- Insert Hospitals
INSERT INTO hospital (Hospital_Name, Location, Contact_No, Password) VALUES
('Apollo Hospital', 'Indiranagar, Bangalore', '080-44445555', 'apollo@123'),
('Fortis Hospital', 'Whitefield, Bangalore', '080-55667788', 'fortis@123'),
('Manipal Hospital', 'Malleshwaram, Bangalore', '080-99887766', 'manipal@123'),
('Narayana Health', 'Electronic City, Bangalore', '080-12345678', 'narayana@123'),
('Columbia Asia', 'Yeshwanthpur, Bangalore', '080-33445522', 'columbia@123');

-- Insert Blood Banks
INSERT INTO bloodbank (Bank_Name, Location, Contact_No, Hospital_ID) VALUES
('Red Cross', 'MG Road, Bangalore', '080-22223333', 1),
('Life Saver Bank', 'Koramangala, Bangalore', '080-33445566', 2),
('Hope Blood Bank', 'JP Nagar, Mysuru', '0821-2244667', 3),
('City Blood Bank', 'Vijayanagar, Bangalore', '080-55667799', 4),
('Universal Blood Centre', 'Hebbal, Bangalore', '080-11223344', 5);

-- Insert Patients
INSERT INTO patient (Hospital_ID, Name, Age, Gender, Blood_Group, Disease) VALUES
(1, 'Kiran', 45, 'Male', 'A+', 'Heart Surgery'),
(2, 'Priya', 32, 'Female', 'B+', 'Accident'),
(3, 'Rahul', 27, 'Male', 'O+', 'Dengue'),
(4, 'Sneha', 50, 'Female', 'AB+', 'Cancer'),
(5, 'Varun', 38, 'Male', 'A-', 'Kidney Failure');

-- Insert Staff
INSERT INTO staff (Name, Role, Contact_No, Bank_ID, Hospital_ID, Qualification, Experience, Salary) VALUES
('Dr. Meera', 'Lab Technician', '9845012345', 1, 1, 'BSc Biotech', 5, 45000.00),
('John Mathew', 'Nurse', '9876541230', 2, 2, 'GNM', 3, 35000.00),
('Priya Shetty', 'Manager', '9765432189', 3, 3, 'MBA Hospital Admin', 7, 65000.00),
('Arun Nair', 'Phlebotomist', '9098765432', 4, 4, 'BSc Nursing', 4, 40000.00),
('Sneha Rao', 'Receptionist', '9988771122', 5, 5, 'BCom', 2, 25000.00);

-- Insert Donation Records
INSERT INTO donationrecord (Donor_ID, Bank_ID, Donation_Date, Quantity_Donated, Notes, Status, CollectedBy) VALUES
(1, 1, '2025-06-20', 2, 'Routine donation', 'Completed', 1),
(2, 2, '2025-07-05', 1, 'Replacement donation', 'Completed', 2),
(3, 3, '2025-07-10', 3, 'Camp donation', 'Completed', 3),
(4, 4, '2025-07-22', 2, 'Emergency stock', 'Completed', 4),
(5, 5, '2025-08-02', 1, 'Regular donor', 'Completed', 5),
(1, 1, '2025-11-07', 2, 'Added through procedure', 'Pending', 1);

-- Insert Blood Tests
INSERT INTO bloodtest (Donation_ID, Donor_ID, Test_Date, Test_Result, Status, TestedBy) VALUES
(1, 1, '2025-06-21', 'HIV-Negative', 'Passed', 1),
(2, 2, '2025-07-06', 'Hepatitis-Negative', 'Passed', 1),
(3, 3, '2025-07-11', 'Malaria-Negative', 'Passed', 1),
(4, 4, '2025-07-23', 'Syphilis-Negative', 'Passed', 1),
(5, 5, '2025-08-03', 'HIV-Negative', 'Passed', 1);

-- Insert Emergency Requests
INSERT INTO emergencyrequest (Patient_ID, Hospital_ID, Bank_ID, BloodGroup_Required, Quantity_Needed, Required_By, Status, Priority) VALUES
(1, 1, 1, 'A+', 2, '2025-08-02 10:00:00', 'Pending', 'High'),
(2, 2, 2, 'B+', 1, '2025-08-03 15:30:00', 'Allocated', 'Critical'),
(3, 3, 3, 'O+', 2, '2025-08-04 12:00:00', 'Dispatched', 'Medium'),
(4, 4, 4, 'AB+', 1, '2025-08-05 09:00:00', 'Completed', 'High'),
(5, 5, '2025-08-06 14:00:00', 'A-', 3, 'Pending', 'Critical');

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

-- Trigger 1: Update donor's last donation date after successful donation
DELIMITER //
CREATE TRIGGER update_last_donation_date
    AFTER INSERT ON donationrecord
    FOR EACH ROW
BEGIN
    UPDATE donor 
    SET LastDonationDate = NEW.Donation_Date,
        LastDonation_Date = NEW.Donation_Date
    WHERE Donor_ID = NEW.Donor_ID;
END//
DELIMITER ;

-- Trigger 2: Automatically create blood test record when donation is made
DELIMITER //
CREATE TRIGGER create_blood_test_on_donation
    AFTER INSERT ON donationrecord
    FOR EACH ROW
BEGIN
    INSERT INTO bloodtest (Donation_ID, Donor_ID, Test_Date, Test_Result, Status)
    VALUES (NEW.Donation_ID, NEW.Donor_ID, NEW.Donation_Date, 'Pending', 'Pending');
END//
DELIMITER ;

-- Trigger 3: Update donation status when blood test is completed
DELIMITER //
CREATE TRIGGER update_donation_status_on_test
    AFTER UPDATE ON bloodtest
    FOR EACH ROW
BEGIN
    IF NEW.Status = 'Passed' THEN
        UPDATE donationrecord 
        SET Status = 'Completed' 
        WHERE Donation_ID = NEW.Donation_ID;
    ELSEIF NEW.Status = 'Failed' THEN
        UPDATE donationrecord 
        SET Status = 'Rejected' 
        WHERE Donation_ID = NEW.Donation_ID;
    END IF;
END//
DELIMITER ;

-- Trigger 4: Log emergency request priority escalation
DELIMITER //
CREATE TRIGGER escalate_emergency_priority
    BEFORE UPDATE ON emergencyrequest
    FOR EACH ROW
BEGIN
    IF OLD.Required_By < NOW() AND NEW.Status = 'Pending' THEN
        SET NEW.Priority = 'Critical';
    END IF;
END//
DELIMITER ;

-- ============================================================================
-- 4. STORED PROCEDURES
-- ============================================================================

-- Procedure 1: Register new donor with validation
DELIMITER //
CREATE PROCEDURE RegisterDonor(
    IN p_name VARCHAR(100),
    IN p_age INT,
    IN p_gender VARCHAR(10),
    IN p_blood_group VARCHAR(5),
    IN p_phone VARCHAR(15),
    IN p_password VARCHAR(255),
    IN p_address TEXT,
    OUT p_donor_id INT,
    OUT p_message VARCHAR(200)
)
BEGIN
    DECLARE donor_count INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = 'Error occurred during donor registration';
        SET p_donor_id = -1;
    END;
    
    START TRANSACTION;
    
    -- Validate age
    IF p_age < 18 OR p_age > 65 THEN
        SET p_message = 'Donor age must be between 18 and 65';
        SET p_donor_id = -1;
        ROLLBACK;
    ELSE
        -- Check if donor already exists
        SELECT COUNT(*) INTO donor_count 
        FROM donor 
        WHERE PhoneNo = p_phone;
        
        IF donor_count > 0 THEN
            SET p_message = 'Donor with this phone number already exists';
            SET p_donor_id = -1;
            ROLLBACK;
        ELSE
            -- Insert new donor
            INSERT INTO donor (Name, Age, Gender, Blood_Group, PhoneNo, Password, Address)
            VALUES (p_name, p_age, p_gender, p_blood_group, p_phone, p_password, p_address);
            
            SET p_donor_id = LAST_INSERT_ID();
            SET p_message = 'Donor registered successfully';
            COMMIT;
        END IF;
    END IF;
END//
DELIMITER ;

-- Procedure 2: Process blood donation
DELIMITER //
CREATE PROCEDURE ProcessDonation(
    IN p_donor_id INT,
    IN p_bank_id INT,
    IN p_quantity INT,
    IN p_collected_by INT,
    OUT p_donation_id INT,
    OUT p_message VARCHAR(200)
)
BEGIN
    DECLARE last_donation DATE DEFAULT NULL;
    DECLARE days_since_last INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = 'Error occurred during donation processing';
        SET p_donation_id = -1;
    END;
    
    START TRANSACTION;
    
    -- Check donor's last donation date
    SELECT LastDonationDate INTO last_donation 
    FROM donor 
    WHERE Donor_ID = p_donor_id;
    
    IF last_donation IS NOT NULL THEN
        SET days_since_last = DATEDIFF(CURDATE(), last_donation);
        IF days_since_last < 56 THEN -- 8 weeks gap required
            SET p_message = CONCAT('Donor must wait ', (56 - days_since_last), ' more days before next donation');
            SET p_donation_id = -1;
            ROLLBACK;
        ELSE
            -- Process donation
            INSERT INTO donationrecord (Donor_ID, Bank_ID, Donation_Date, Quantity_Donated, CollectedBy, Status)
            VALUES (p_donor_id, p_bank_id, CURDATE(), p_quantity, p_collected_by, 'Completed');
            
            SET p_donation_id = LAST_INSERT_ID();
            SET p_message = 'Donation processed successfully';
            COMMIT;
        END IF;
    ELSE
        -- First time donor
        INSERT INTO donationrecord (Donor_ID, Bank_ID, Donation_Date, Quantity_Donated, CollectedBy, Status)
        VALUES (p_donor_id, p_bank_id, CURDATE(), p_quantity, p_collected_by, 'Completed');
        
        SET p_donation_id = LAST_INSERT_ID();
        SET p_message = 'First donation processed successfully';
        COMMIT;
    END IF;
END//
DELIMITER ;

-- Procedure 3: Handle emergency blood request
DELIMITER //
CREATE PROCEDURE HandleEmergencyRequest(
    IN p_patient_id INT,
    IN p_blood_group VARCHAR(5),
    IN p_quantity INT,
    IN p_priority VARCHAR(10),
    OUT p_request_id INT,
    OUT p_message VARCHAR(200)
)
BEGIN
    DECLARE p_hospital_id INT;
    DECLARE compatible_banks_count INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = 'Error occurred during emergency request processing';
        SET p_request_id = -1;
    END;
    
    START TRANSACTION;
    
    -- Get patient's hospital
    SELECT Hospital_ID INTO p_hospital_id 
    FROM patient 
    WHERE Patient_ID = p_patient_id;
    
    -- Check for available blood banks with compatible blood
    SELECT COUNT(*) INTO compatible_banks_count
    FROM bloodbank bb
    WHERE bb.Hospital_ID = p_hospital_id;
    
    IF compatible_banks_count = 0 THEN
        SET p_message = 'No compatible blood banks available';
        SET p_request_id = -1;
        ROLLBACK;
    ELSE
        -- Create emergency request
        INSERT INTO emergencyrequest (Patient_ID, Hospital_ID, BloodGroup_Required, Quantity_Needed, Priority, Required_By)
        VALUES (p_patient_id, p_hospital_id, p_blood_group, p_quantity, p_priority, DATE_ADD(NOW(), INTERVAL 4 HOUR));
        
        SET p_request_id = LAST_INSERT_ID();
        SET p_message = 'Emergency request created successfully';
        COMMIT;
    END IF;
END//
DELIMITER ;

-- ============================================================================
-- 5. FUNCTIONS
-- ============================================================================

-- Function 1: Calculate donor eligibility based on last donation
DELIMITER //
CREATE FUNCTION GetDonorEligibility(donor_id INT) 
RETURNS VARCHAR(50)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE last_donation DATE DEFAULT NULL;
    DECLARE days_since_last INT DEFAULT 0;
    DECLARE result VARCHAR(50);
    
    SELECT LastDonationDate INTO last_donation 
    FROM donor 
    WHERE Donor_ID = donor_id;
    
    IF last_donation IS NULL THEN
        SET result = 'Eligible (First Time)';
    ELSE
        SET days_since_last = DATEDIFF(CURDATE(), last_donation);
        IF days_since_last >= 56 THEN
            SET result = 'Eligible';
        ELSE
            SET result = CONCAT('Not Eligible (', (56 - days_since_last), ' days remaining)');
        END IF;
    END IF;
    
    RETURN result;
END//
DELIMITER ;

-- Function 2: Get blood compatibility for transfusion
DELIMITER //
CREATE FUNCTION GetBloodCompatibility(recipient_blood VARCHAR(5))
RETURNS TEXT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE compatible_donors TEXT DEFAULT '';
    
    CASE recipient_blood
        WHEN 'A+' THEN SET compatible_donors = 'A+, A-, O+, O-';
        WHEN 'A-' THEN SET compatible_donors = 'A-, O-';
        WHEN 'B+' THEN SET compatible_donors = 'B+, B-, O+, O-';
        WHEN 'B-' THEN SET compatible_donors = 'B-, O-';
        WHEN 'AB+' THEN SET compatible_donors = 'A+, A-, B+, B-, AB+, AB-, O+, O-';
        WHEN 'AB-' THEN SET compatible_donors = 'A-, B-, AB-, O-';
        WHEN 'O+' THEN SET compatible_donors = 'O+, O-';
        WHEN 'O-' THEN SET compatible_donors = 'O-';
        ELSE SET compatible_donors = 'Unknown blood type';
    END CASE;
    
    RETURN compatible_donors;
END//
DELIMITER ;

-- Function 3: Calculate total donations by a donor
DELIMITER //
CREATE FUNCTION GetTotalDonations(donor_id INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_donations INT DEFAULT 0;
    
    SELECT COUNT(*) INTO total_donations
    FROM donationrecord
    WHERE Donor_ID = donor_id AND Status = 'Completed';
    
    RETURN total_donations;
END//
DELIMITER ;

-- ============================================================================
-- 6. NESTED QUERIES
-- ============================================================================

-- Nested Query 1: Find donors who have donated more than the average donation count
SELECT d.Name, d.Blood_Group, COUNT(dr.Donation_ID) as Total_Donations
FROM donor d
JOIN donationrecord dr ON d.Donor_ID = dr.Donor_ID
WHERE dr.Status = 'Completed'
GROUP BY d.Donor_ID, d.Name, d.Blood_Group
HAVING COUNT(dr.Donation_ID) > (
    SELECT AVG(donation_count) 
    FROM (
        SELECT COUNT(*) as donation_count
        FROM donationrecord 
        WHERE Status = 'Completed'
        GROUP BY Donor_ID
    ) as avg_donations
);

-- Nested Query 2: Find hospitals with emergency requests for blood types that are in high demand
SELECT h.Hospital_Name, er.BloodGroup_Required, COUNT(*) as Request_Count
FROM hospital h
JOIN emergencyrequest er ON h.Hospital_ID = er.Hospital_ID
WHERE er.BloodGroup_Required IN (
    SELECT BloodGroup_Required
    FROM emergencyrequest
    WHERE Status IN ('Pending', 'Critical')
    GROUP BY BloodGroup_Required
    HAVING COUNT(*) >= 2
)
AND er.Status = 'Pending'
GROUP BY h.Hospital_ID, h.Hospital_Name, er.BloodGroup_Required;

-- Nested Query 3: Find blood banks that have received donations from donors with rare blood types
SELECT bb.Bank_Name, bb.Location
FROM bloodbank bb
WHERE bb.Bank_ID IN (
    SELECT DISTINCT dr.Bank_ID
    FROM donationrecord dr
    JOIN donor d ON dr.Donor_ID = d.Donor_ID
    WHERE d.Blood_Group IN (
        SELECT Blood_Group
        FROM donor
        GROUP BY Blood_Group
        HAVING COUNT(*) <= 2  -- Rare blood types (less than or equal to 2 donors)
    )
    AND dr.Status = 'Completed'
);

-- ============================================================================
-- 7. JOIN QUERIES
-- ============================================================================

-- Join Query 1: Complete donation history with donor, bank, and test details
SELECT 
    d.Name as Donor_Name,
    d.Blood_Group,
    d.PhoneNo,
    dr.Donation_Date,
    dr.Quantity_Donated,
    bb.Bank_Name,
    bb.Location as Bank_Location,
    bt.Test_Result,
    bt.Status as Test_Status,
    s.Name as Collected_By
FROM donor d
INNER JOIN donationrecord dr ON d.Donor_ID = dr.Donor_ID
INNER JOIN bloodbank bb ON dr.Bank_ID = bb.Bank_ID
LEFT JOIN bloodtest bt ON dr.Donation_ID = bt.Donation_ID
LEFT JOIN staff s ON dr.CollectedBy = s.Staff_ID
WHERE dr.Status = 'Completed'
ORDER BY dr.Donation_Date DESC;

-- Join Query 2: Emergency requests with patient and hospital details
SELECT 
    p.Name as Patient_Name,
    p.Age,
    p.Gender,
    p.Blood_Group as Patient_Blood_Group,
    p.Disease,
    h.Hospital_Name,
    h.Location as Hospital_Location,
    er.BloodGroup_Required,
    er.Quantity_Needed,
    er.Request_Date,
    er.Required_By,
    er.Status,
    er.Priority,
    bb.Bank_Name as Assigned_Bank
FROM patient p
INNER JOIN emergencyrequest er ON p.Patient_ID = er.Patient_ID
INNER JOIN hospital h ON p.Hospital_ID = h.Hospital_ID
LEFT JOIN bloodbank bb ON er.Bank_ID = bb.Bank_ID
ORDER BY er.Priority DESC, er.Request_Date ASC;

-- Join Query 3: Staff assignments across hospitals and blood banks
SELECT 
    s.Name as Staff_Name,
    s.Role,
    s.Qualification,
    s.Experience,
    h.Hospital_Name,
    h.Location as Hospital_Location,
    bb.Bank_Name,
    bb.Location as Bank_Location,
    COUNT(dr.Donation_ID) as Collections_Handled
FROM staff s
LEFT JOIN hospital h ON s.Hospital_ID = h.Hospital_ID
LEFT JOIN bloodbank bb ON s.Bank_ID = bb.Bank_ID
LEFT JOIN donationrecord dr ON s.Staff_ID = dr.CollectedBy
GROUP BY s.Staff_ID, s.Name, s.Role, s.Qualification, s.Experience, h.Hospital_Name, h.Location, bb.Bank_Name, bb.Location
ORDER BY Collections_Handled DESC;

-- ============================================================================
-- 8. AGGREGATE QUERIES
-- ============================================================================

-- Aggregate Query 1: Blood type distribution and donation statistics
SELECT 
    d.Blood_Group,
    COUNT(DISTINCT d.Donor_ID) as Total_Donors,
    COUNT(dr.Donation_ID) as Total_Donations,
    SUM(dr.Quantity_Donated) as Total_Units_Donated,
    AVG(dr.Quantity_Donated) as Avg_Units_Per_Donation,
    MAX(dr.Donation_Date) as Latest_Donation,
    MIN(dr.Donation_Date) as First_Donation
FROM donor d
LEFT JOIN donationrecord dr ON d.Donor_ID = dr.Donor_ID AND dr.Status = 'Completed'
GROUP BY d.Blood_Group
ORDER BY Total_Units_Donated DESC;

-- Aggregate Query 2: Hospital performance metrics
SELECT 
    h.Hospital_Name,
    COUNT(DISTINCT p.Patient_ID) as Total_Patients,
    COUNT(DISTINCT er.Request_ID) as Total_Emergency_Requests,
    COUNT(CASE WHEN er.Status = 'Completed' THEN 1 END) as Completed_Requests,
    COUNT(CASE WHEN er.Status = 'Pending' THEN 1 END) as Pending_Requests,
    ROUND(
        (COUNT(CASE WHEN er.Status = 'Completed' THEN 1 END) * 100.0 / 
         NULLIF(COUNT(er.Request_ID), 0)), 2
    ) as Completion_Rate_Percent,
    COUNT(DISTINCT s.Staff_ID) as Total_Staff,
    AVG(s.Salary) as Avg_Staff_Salary
FROM hospital h
LEFT JOIN patient p ON h.Hospital_ID = p.Hospital_ID
LEFT JOIN emergencyrequest er ON h.Hospital_ID = er.Hospital_ID
LEFT JOIN staff s ON h.Hospital_ID = s.Hospital_ID
GROUP BY h.Hospital_ID, h.Hospital_Name
ORDER BY Completion_Rate_Percent DESC;

-- Aggregate Query 3: Monthly donation trends
SELECT 
    YEAR(dr.Donation_Date) as Year,
    MONTH(dr.Donation_Date) as Month,
    MONTHNAME(dr.Donation_Date) as Month_Name,
    COUNT(dr.Donation_ID) as Total_Donations,
    COUNT(DISTINCT dr.Donor_ID) as Unique_Donors,
    SUM(dr.Quantity_Donated) as Total_Units,
    AVG(dr.Quantity_Donated) as Avg_Units_Per_Donation,
    COUNT(CASE WHEN bt.Status = 'Passed' THEN 1 END) as Passed_Tests,
    COUNT(CASE WHEN bt.Status = 'Failed' THEN 1 END) as Failed_Tests,
    ROUND(
        (COUNT(CASE WHEN bt.Status = 'Passed' THEN 1 END) * 100.0 / 
         NULLIF(COUNT(bt.Test_ID), 0)), 2
    ) as Test_Pass_Rate_Percent
FROM donationrecord dr
LEFT JOIN bloodtest bt ON dr.Donation_ID = bt.Donation_ID
WHERE dr.Status = 'Completed'
GROUP BY YEAR(dr.Donation_Date), MONTH(dr.Donation_Date), MONTHNAME(dr.Donation_Date)
ORDER BY Year DESC, Month DESC;

-- Aggregate Query 4: Blood bank inventory and demand analysis
SELECT 
    bb.Bank_Name,
    bb.Location,
    COUNT(DISTINCT dr.Donation_ID) as Total_Donations_Received,
    SUM(dr.Quantity_Donated) as Total_Units_Received,
    COUNT(DISTINCT er.Request_ID) as Total_Requests,
    SUM(er.Quantity_Needed) as Total_Units_Requested,
    (SUM(dr.Quantity_Donated) - SUM(er.Quantity_Needed)) as Net_Balance,
    ROUND(AVG(DATEDIFF(dr.Donation_Date, d.LastDonationDate)), 2) as Avg_Days_Between_Donations
FROM bloodbank bb
LEFT JOIN donationrecord dr ON bb.Bank_ID = dr.Bank_ID AND dr.Status = 'Completed'
LEFT JOIN donor d ON dr.Donor_ID = d.Donor_ID
LEFT JOIN emergencyrequest er ON bb.Bank_ID = er.Bank_ID
GROUP BY bb.Bank_ID, bb.Bank_Name, bb.Location
ORDER BY Net_Balance DESC;

-- ============================================================================
-- 9. CODE SNIPPETS FOR INVOKING PROCEDURES/FUNCTIONS/TRIGGERS
-- ============================================================================

-- Invoking Stored Procedures:

-- Example 1: Register a new donor
SET @donor_id = 0;
SET @message = '';
CALL RegisterDonor('John Doe', 25, 'Male', 'O+', '9999999999', 'password123', 'Bangalore', @donor_id, @message);
SELECT @donor_id as Donor_ID, @message as Message;

-- Example 2: Process a donation
SET @donation_id = 0;
SET @message = '';
CALL ProcessDonation(1, 1, 2, 1, @donation_id, @message);
SELECT @donation_id as Donation_ID, @message as Message;

-- Example 3: Handle emergency request
SET @request_id = 0;
SET @message = '';
CALL HandleEmergencyRequest(1, 'A+', 3, 'Critical', @request_id, @message);
SELECT @request_id as Request_ID, @message as Message;

-- Invoking Functions:

-- Example 1: Check donor eligibility
SELECT 
    d.Name,
    d.Blood_Group,
    d.LastDonationDate,
    GetDonorEligibility(d.Donor_ID) as Eligibility_Status
FROM donor d
WHERE d.Donor_ID IN (1, 2, 3);

-- Example 2: Get blood compatibility
SELECT 
    p.Name as Patient_Name,
    p.Blood_Group,
    GetBloodCompatibility(p.Blood_Group) as Compatible_Donors
FROM patient p;

-- Example 3: Get total donations by donor
SELECT 
    d.Name,
    d.Blood_Group,
    GetTotalDonations(d.Donor_ID) as Total_Donations,
    GetDonorEligibility(d.Donor_ID) as Eligibility_Status
FROM donor d
ORDER BY GetTotalDonations(d.Donor_ID) DESC;

-- Testing Triggers:

-- Example 1: Insert a donation to see trigger effects
INSERT INTO donationrecord (Donor_ID, Bank_ID, Donation_Date, Quantity_Donated, CollectedBy, Status)
VALUES (2, 2, CURDATE(), 1, 2, 'Completed');

-- Check if LastDonationDate was updated
SELECT Name, LastDonationDate FROM donor WHERE Donor_ID = 2;

-- Check if blood test was automatically created
SELECT * FROM bloodtest WHERE Donor_ID = 2 ORDER BY Test_ID DESC LIMIT 1;

-- Example 2: Update blood test status to see donation status change
UPDATE bloodtest SET Status = 'Passed', Test_Result = 'All Clear' WHERE Test_ID = LAST_INSERT_ID();

-- Check if donation status was updated
SELECT Status FROM donationrecord WHERE Donor_ID = 2 ORDER BY Donation_ID DESC LIMIT 1;

-- ============================================================================
-- 10. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View 1: Active donor summary
CREATE VIEW ActiveDonorSummary AS
SELECT 
    d.Donor_ID,
    d.Name,
    d.Blood_Group,
    d.PhoneNo,
    d.LastDonationDate,
    GetTotalDonations(d.Donor_ID) as Total_Donations,
    GetDonorEligibility(d.Donor_ID) as Eligibility_Status,
    CASE 
        WHEN d.LastDonationDate IS NULL THEN 'New Donor'
        WHEN DATEDIFF(CURDATE(), d.LastDonationDate) <= 90 THEN 'Active'
        WHEN DATEDIFF(CURDATE(), d.LastDonationDate) <= 365 THEN 'Inactive'
        ELSE 'Dormant'
    END as Donor_Category
FROM donor d;

-- View 2: Emergency request dashboard
CREATE VIEW EmergencyRequestDashboard AS
SELECT 
    er.Request_ID,
    p.Name as Patient_Name,
    p.Blood_Group as Patient_Blood_Type,
    h.Hospital_Name,
    er.BloodGroup_Required,
    er.Quantity_Needed,
    er.Priority,
    er.Status,
    er.Request_Date,
    er.Required_By,
    CASE 
        WHEN er.Required_By < NOW() AND er.Status = 'Pending' THEN 'OVERDUE'
        WHEN TIMESTAMPDIFF(HOUR, NOW(), er.Required_By) <= 2 THEN 'URGENT'
        ELSE 'NORMAL'
    END as Urgency_Level,
    GetBloodCompatibility(er.BloodGroup_Required) as Compatible_Donors
FROM emergencyrequest er
JOIN patient p ON er.Patient_ID = p.Patient_ID
JOIN hospital h ON er.Hospital_ID = h.Hospital_ID
WHERE er.Status IN ('Pending', 'Allocated');

-- ============================================================================
-- 11. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Additional indexes for better query performance
CREATE INDEX idx_donation_status ON donationrecord(Status);
CREATE INDEX idx_test_donation ON bloodtest(Donation_ID);
CREATE INDEX idx_request_date ON emergencyrequest(Request_Date);
CREATE INDEX idx_donor_last_donation ON donor(LastDonationDate);
CREATE INDEX idx_patient_blood_group ON patient(Blood_Group);

-- ============================================================================
-- 12. SAMPLE QUERIES TO TEST THE SYSTEM
-- ============================================================================

-- Test comprehensive donor information
SELECT * FROM ActiveDonorSummary ORDER BY Total_Donations DESC;

-- Test emergency dashboard
SELECT * FROM EmergencyRequestDashboard ORDER BY Urgency_Level DESC, Required_By ASC;

-- Test blood compatibility
SELECT p.Name, p.Blood_Group, GetBloodCompatibility(p.Blood_Group) as Can_Receive_From
FROM patient p WHERE p.Blood_Group IN ('AB-', 'O+', 'A-');

-- Test donor eligibility
SELECT d.Name, GetDonorEligibility(d.Donor_ID) as Status
FROM donor d ORDER BY d.LastDonationDate DESC;

-- ============================================================================
-- END OF SQL FILE
-- ============================================================================
mysql -u root -p25032006 < blood_donation_system_complete.sql