const { generateSeedId } = require('../../salesforce-id');

function buildIdMap(objectName, count) {
  const map = {};
  for (let i = 1; i <= count; i++) {
    map[i] = generateSeedId(objectName, i);
  }
  return map;
}

// Standard objects
const ACCT = buildIdMap('Account', 25);
const CTCT = buildIdMap('Contact', 50);
const OPP = buildIdMap('Opportunity', 80);
const LEAD = buildIdMap('Lead', 15);
const CAMP = buildIdMap('Campaign', 10);
const CMEM = buildIdMap('CampaignMember', 30);
const TASK = buildIdMap('Task', 20);
const EVNT = buildIdMap('Event', 10);
const USR = buildIdMap('User', 5);

// Custom objects
const PMT = buildIdMap('Payment__c', 60);
const RD = buildIdMap('Recurring_Donation__c', 20);
const GAU = buildIdMap('General_Accounting_Unit__c', 8);
const ALLOC = buildIdMap('Allocation__c', 30);
const ADDR = buildIdMap('Address__c', 25);
const EPT = buildIdMap('Engagement_Plan_Template__c', 5);
const EP = buildIdMap('Engagement_Plan__c', 10);
const EPTK = buildIdMap('Engagement_Plan_Task__c', 20);
const LVL = buildIdMap('Level__c', 5);
const AFF = buildIdMap('Affiliation__c', 15);
const REL = buildIdMap('Relationship__c', 20);
const ASC = buildIdMap('Account_Soft_Credit__c', 10);
const PSC = buildIdMap('Partial_Soft_Credit__c', 8);
const HH = buildIdMap('Household__c', 15);
const ERR = buildIdMap('Error__c', 3);
const FUND = buildIdMap('Fund__c', 6);

const demoData = {
  User: [
    { Id: USR[1], Username: 'admin@npsp.demo', LastName: 'Admin', FirstName: 'System', Email: 'admin@npsp.demo', Title: 'System Administrator', IsActive: true, ProfileId: 'System_Admin', Alias: 'admin' },
    { Id: USR[2], Username: 'sarah.chen@npsp.demo', LastName: 'Chen', FirstName: 'Sarah', Email: 'sarah.chen@npsp.demo', Title: 'Development Director', IsActive: true, ProfileId: 'Development_Director', Alias: 'schen' },
    { Id: USR[3], Username: 'marcus.johnson@npsp.demo', LastName: 'Johnson', FirstName: 'Marcus', Email: 'marcus.johnson@npsp.demo', Title: 'Major Gifts Officer', IsActive: true, ProfileId: 'Fundraiser', Alias: 'mjohns' },
    { Id: USR[4], Username: 'elena.rodriguez@npsp.demo', LastName: 'Rodriguez', FirstName: 'Elena', Email: 'elena.rodriguez@npsp.demo', Title: 'Volunteer Coordinator', IsActive: true, ProfileId: 'Volunteer_Coordinator', Alias: 'erodri' },
    { Id: USR[5], Username: 'david.kim@npsp.demo', LastName: 'Kim', FirstName: 'David', Email: 'david.kim@npsp.demo', Title: 'Database Manager', IsActive: true, ProfileId: 'System_Admin', Alias: 'dkim' },
  ],

  Account: [
    // Household accounts
    { Id: ACCT[1], Name: 'Martinez Household', Phone: '617-555-0101', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '123 Oak Street', BillingCity: 'Boston', BillingState: 'MA', BillingPostalCode: '02101', BillingCountry: 'US' },
    { Id: ACCT[2], Name: 'Patel Household', Phone: '617-555-0102', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '456 Elm Avenue', BillingCity: 'Cambridge', BillingState: 'MA', BillingPostalCode: '02139', BillingCountry: 'US' },
    { Id: ACCT[3], Name: 'Thompson Household', Phone: '212-555-0103', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '789 Pine Road', BillingCity: 'New York', BillingState: 'NY', BillingPostalCode: '10001', BillingCountry: 'US' },
    { Id: ACCT[4], Name: 'Nakamura Household', Phone: '415-555-0104', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '321 Cherry Lane', BillingCity: 'San Francisco', BillingState: 'CA', BillingPostalCode: '94102', BillingCountry: 'US' },
    { Id: ACCT[5], Name: 'Williams Household', Phone: '312-555-0105', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '654 Maple Drive', BillingCity: 'Chicago', BillingState: 'IL', BillingPostalCode: '60601', BillingCountry: 'US' },
    { Id: ACCT[6], Name: 'Garcia Household', Phone: '305-555-0106', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '987 Birch Court', BillingCity: 'Miami', BillingState: 'FL', BillingPostalCode: '33101', BillingCountry: 'US' },
    { Id: ACCT[7], Name: 'Lee Household', Phone: '206-555-0107', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '111 Cedar Blvd', BillingCity: 'Seattle', BillingState: 'WA', BillingPostalCode: '98101', BillingCountry: 'US' },
    { Id: ACCT[8], Name: 'Brown Household', Phone: '617-555-0108', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '222 Spruce Way', BillingCity: 'Boston', BillingState: 'MA', BillingPostalCode: '02102', BillingCountry: 'US' },
    { Id: ACCT[9], Name: 'Kim-Park Household', Phone: '213-555-0109', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '333 Willow Street', BillingCity: 'Los Angeles', BillingState: 'CA', BillingPostalCode: '90001', BillingCountry: 'US' },
    { Id: ACCT[10], Name: 'Johnson Household', Phone: '404-555-0110', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingStreet: '444 Aspen Circle', BillingCity: 'Atlanta', BillingState: 'GA', BillingPostalCode: '30301', BillingCountry: 'US' },
    // Organization accounts
    { Id: ACCT[11], Name: 'Greenfield Foundation', Phone: '617-555-1001', Website: 'https://greenfieldfoundation.org', Type: 'Foundation', Industry: 'Nonprofit', npe01__SYSTEM_AccountType__c: 'Organization', AnnualRevenue: 5000000, NumberOfEmployees: 25, BillingCity: 'Boston', BillingState: 'MA', BillingPostalCode: '02110' },
    { Id: ACCT[12], Name: 'TechForward Inc.', Phone: '650-555-2002', Website: 'https://techforward.com', Type: 'Organization', Industry: 'Technology', npe01__SYSTEM_AccountType__c: 'Organization', AnnualRevenue: 50000000, NumberOfEmployees: 200, BillingCity: 'Palo Alto', BillingState: 'CA', BillingPostalCode: '94301' },
    { Id: ACCT[13], Name: 'Community Health Alliance', Phone: '312-555-3003', Website: 'https://communityhealthalliance.org', Type: 'Organization', Industry: 'Healthcare', npe01__SYSTEM_AccountType__c: 'Organization', AnnualRevenue: 8000000, NumberOfEmployees: 45, BillingCity: 'Chicago', BillingState: 'IL', BillingPostalCode: '60610' },
    { Id: ACCT[14], Name: 'Sunrise Education Trust', Phone: '202-555-4004', Website: 'https://sunriseedu.org', Type: 'Foundation', Industry: 'Education', npe01__SYSTEM_AccountType__c: 'Organization', AnnualRevenue: 3000000, NumberOfEmployees: 15, BillingCity: 'Washington', BillingState: 'DC', BillingPostalCode: '20001' },
    { Id: ACCT[15], Name: 'Pacific Ventures Capital', Phone: '415-555-5005', Website: 'https://pacificventures.com', Type: 'Organization', Industry: 'Finance', npe01__SYSTEM_AccountType__c: 'Organization', AnnualRevenue: 100000000, NumberOfEmployees: 80, BillingCity: 'San Francisco', BillingState: 'CA', BillingPostalCode: '94105' },
    { Id: ACCT[16], Name: 'Riverside Church', Phone: '212-555-6006', Type: 'Organization', Industry: 'Other', npe01__SYSTEM_AccountType__c: 'Organization', BillingCity: 'New York', BillingState: 'NY', BillingPostalCode: '10027' },
    { Id: ACCT[17], Name: 'Metro United Way', Phone: '502-555-7007', Website: 'https://metrouw.org', Type: 'Organization', Industry: 'Nonprofit', npe01__SYSTEM_AccountType__c: 'Organization', AnnualRevenue: 20000000, NumberOfEmployees: 100, BillingCity: 'Louisville', BillingState: 'KY', BillingPostalCode: '40202' },
    { Id: ACCT[18], Name: 'Davis Family Trust', Phone: '617-555-8008', Type: 'Foundation', Industry: 'Finance', npe01__SYSTEM_AccountType__c: 'Organization', AnnualRevenue: 15000000, BillingCity: 'Boston', BillingState: 'MA', BillingPostalCode: '02116' },
    { Id: ACCT[19], Name: 'Global Impact Partners', Phone: '310-555-9009', Website: 'https://globalimpact.org', Type: 'Organization', Industry: 'Nonprofit', npe01__SYSTEM_AccountType__c: 'Organization', AnnualRevenue: 12000000, NumberOfEmployees: 60, BillingCity: 'Los Angeles', BillingState: 'CA', BillingPostalCode: '90015' },
    { Id: ACCT[20], Name: 'Chen Family Foundation', Phone: '415-555-1010', Type: 'Foundation', Industry: 'Nonprofit', npe01__SYSTEM_AccountType__c: 'Organization', AnnualRevenue: 7000000, BillingCity: 'San Francisco', BillingState: 'CA', BillingPostalCode: '94108' },
    { Id: ACCT[21], Name: 'Meridian Government Agency', Phone: '202-555-1111', Type: 'Government', Industry: 'Government', npe01__SYSTEM_AccountType__c: 'Organization', BillingCity: 'Washington', BillingState: 'DC', BillingPostalCode: '20003' },
    { Id: ACCT[22], Name: 'Nguyen Household', Phone: '713-555-1212', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingCity: 'Houston', BillingState: 'TX', BillingPostalCode: '77001' },
    { Id: ACCT[23], Name: 'Walker Household', Phone: '503-555-1313', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingCity: 'Portland', BillingState: 'OR', BillingPostalCode: '97201' },
    { Id: ACCT[24], Name: 'Robinson Household', Phone: '615-555-1414', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingCity: 'Nashville', BillingState: 'TN', BillingPostalCode: '37201' },
    { Id: ACCT[25], Name: 'Okafor Household', Phone: '470-555-1515', Type: 'Household', npe01__SYSTEM_AccountType__c: 'Household', npe01__SYSTEMIsIndividual__c: true, BillingCity: 'Atlanta', BillingState: 'GA', BillingPostalCode: '30303' },
  ],

  Contact: [
    { Id: CTCT[1], FirstName: 'Maria', LastName: 'Martinez', Email: 'maria.martinez@email.com', Phone: '617-555-0101', Title: 'Board Chair', AccountId: ACCT[1], MailingCity: 'Boston', MailingState: 'MA', MailingPostalCode: '02101' },
    { Id: CTCT[2], FirstName: 'Carlos', LastName: 'Martinez', Email: 'carlos.martinez@email.com', Phone: '617-555-0102', AccountId: ACCT[1], MailingCity: 'Boston', MailingState: 'MA' },
    { Id: CTCT[3], FirstName: 'Priya', LastName: 'Patel', Email: 'priya.patel@email.com', Phone: '617-555-0201', Title: 'Major Donor', AccountId: ACCT[2], MailingCity: 'Cambridge', MailingState: 'MA' },
    { Id: CTCT[4], FirstName: 'Raj', LastName: 'Patel', Email: 'raj.patel@email.com', Phone: '617-555-0202', AccountId: ACCT[2], MailingCity: 'Cambridge', MailingState: 'MA' },
    { Id: CTCT[5], FirstName: 'James', LastName: 'Thompson', Email: 'james.thompson@email.com', Phone: '212-555-0301', Title: 'Volunteer', AccountId: ACCT[3], MailingCity: 'New York', MailingState: 'NY' },
    { Id: CTCT[6], FirstName: 'Sarah', LastName: 'Thompson', Email: 'sarah.thompson@email.com', Phone: '212-555-0302', AccountId: ACCT[3], MailingCity: 'New York', MailingState: 'NY' },
    { Id: CTCT[7], FirstName: 'Yuki', LastName: 'Nakamura', Email: 'yuki.nakamura@email.com', Phone: '415-555-0401', Title: 'Board Member', AccountId: ACCT[4], MailingCity: 'San Francisco', MailingState: 'CA' },
    { Id: CTCT[8], FirstName: 'Kenji', LastName: 'Nakamura', Email: 'kenji.nakamura@email.com', Phone: '415-555-0402', AccountId: ACCT[4], MailingCity: 'San Francisco', MailingState: 'CA' },
    { Id: CTCT[9], FirstName: 'Andre', LastName: 'Williams', Email: 'andre.williams@email.com', Phone: '312-555-0501', Title: 'Monthly Donor', AccountId: ACCT[5], MailingCity: 'Chicago', MailingState: 'IL' },
    { Id: CTCT[10], FirstName: 'Lisa', LastName: 'Williams', Email: 'lisa.williams@email.com', Phone: '312-555-0502', AccountId: ACCT[5], MailingCity: 'Chicago', MailingState: 'IL' },
    { Id: CTCT[11], FirstName: 'Sofia', LastName: 'Garcia', Email: 'sofia.garcia@email.com', Phone: '305-555-0601', Title: 'Event Sponsor', AccountId: ACCT[6], MailingCity: 'Miami', MailingState: 'FL' },
    { Id: CTCT[12], FirstName: 'Miguel', LastName: 'Garcia', Email: 'miguel.garcia@email.com', Phone: '305-555-0602', AccountId: ACCT[6], MailingCity: 'Miami', MailingState: 'FL' },
    { Id: CTCT[13], FirstName: 'Grace', LastName: 'Lee', Email: 'grace.lee@email.com', Phone: '206-555-0701', Title: 'Recurring Donor', AccountId: ACCT[7], MailingCity: 'Seattle', MailingState: 'WA' },
    { Id: CTCT[14], FirstName: 'Daniel', LastName: 'Brown', Email: 'daniel.brown@email.com', Phone: '617-555-0801', AccountId: ACCT[8], MailingCity: 'Boston', MailingState: 'MA' },
    { Id: CTCT[15], FirstName: 'Jennifer', LastName: 'Brown', Email: 'jennifer.brown@email.com', Phone: '617-555-0802', AccountId: ACCT[8], MailingCity: 'Boston', MailingState: 'MA' },
    { Id: CTCT[16], FirstName: 'Soo-Jin', LastName: 'Kim', Email: 'soojin.kim@email.com', Phone: '213-555-0901', Title: 'Planned Giving', AccountId: ACCT[9], MailingCity: 'Los Angeles', MailingState: 'CA' },
    { Id: CTCT[17], FirstName: 'Marcus', LastName: 'Johnson', Email: 'marcus.j@email.com', Phone: '404-555-1001', AccountId: ACCT[10], MailingCity: 'Atlanta', MailingState: 'GA' },
    { Id: CTCT[18], FirstName: 'Patricia', LastName: 'Johnson', Email: 'patricia.j@email.com', Phone: '404-555-1002', AccountId: ACCT[10], MailingCity: 'Atlanta', MailingState: 'GA' },
    { Id: CTCT[19], FirstName: 'Robert', LastName: 'Greenfield', Email: 'robert@greenfieldfdn.org', Phone: '617-555-1101', Title: 'Foundation Director', AccountId: ACCT[11], MailingCity: 'Boston', MailingState: 'MA' },
    { Id: CTCT[20], FirstName: 'Amanda', LastName: 'Chen', Email: 'amanda.chen@techforward.com', Phone: '650-555-2001', Title: 'CSR Director', AccountId: ACCT[12], MailingCity: 'Palo Alto', MailingState: 'CA' },
    { Id: CTCT[21], FirstName: 'Dr. Michael', LastName: 'Rivera', Email: 'michael.r@commhealth.org', Phone: '312-555-3001', Title: 'Executive Director', AccountId: ACCT[13], MailingCity: 'Chicago', MailingState: 'IL' },
    { Id: CTCT[22], FirstName: 'Janet', LastName: 'Okonkwo', Email: 'janet.o@sunriseedu.org', Phone: '202-555-4001', Title: 'Program Manager', AccountId: ACCT[14], MailingCity: 'Washington', MailingState: 'DC' },
    { Id: CTCT[23], FirstName: 'Thomas', LastName: 'Fischer', Email: 'thomas.f@pacificvc.com', Phone: '415-555-5001', Title: 'Partner', AccountId: ACCT[15], MailingCity: 'San Francisco', MailingState: 'CA' },
    { Id: CTCT[24], FirstName: 'Helen', LastName: 'Davis', Email: 'helen.davis@email.com', Phone: '617-555-8001', Title: 'Trustee', AccountId: ACCT[18], MailingCity: 'Boston', MailingState: 'MA' },
    { Id: CTCT[25], FirstName: 'Wei', LastName: 'Chen', Email: 'wei.chen@chenfdn.org', Phone: '415-555-1011', Title: 'Foundation President', AccountId: ACCT[20], MailingCity: 'San Francisco', MailingState: 'CA' },
    { Id: CTCT[26], FirstName: 'Aisha', LastName: 'Nguyen', Email: 'aisha.nguyen@email.com', Phone: '713-555-1201', Title: 'Volunteer', AccountId: ACCT[22], MailingCity: 'Houston', MailingState: 'TX' },
    { Id: CTCT[27], FirstName: 'David', LastName: 'Walker', Email: 'david.walker@email.com', Phone: '503-555-1301', AccountId: ACCT[23], MailingCity: 'Portland', MailingState: 'OR' },
    { Id: CTCT[28], FirstName: 'Tanya', LastName: 'Robinson', Email: 'tanya.robinson@email.com', Phone: '615-555-1401', Title: 'Donor', AccountId: ACCT[24], MailingCity: 'Nashville', MailingState: 'TN' },
    { Id: CTCT[29], FirstName: 'Chidi', LastName: 'Okafor', Email: 'chidi.okafor@email.com', Phone: '470-555-1501', Title: 'Monthly Donor', AccountId: ACCT[25], MailingCity: 'Atlanta', MailingState: 'GA' },
    { Id: CTCT[30], FirstName: 'Emily', LastName: 'Watanabe', Email: 'emily.w@email.com', Phone: '510-555-3001', MailingCity: 'Berkeley', MailingState: 'CA' },
    { Id: CTCT[31], FirstName: 'Robert', LastName: 'Anderson', Email: 'rob.anderson@email.com', Phone: '617-555-3101', MailingCity: 'Boston', MailingState: 'MA' },
    { Id: CTCT[32], FirstName: 'Fatima', LastName: 'Hassan', Email: 'fatima.h@email.com', Phone: '612-555-3201', Title: 'Board Advisor', MailingCity: 'Minneapolis', MailingState: 'MN' },
    { Id: CTCT[33], FirstName: 'Kevin', LastName: 'OBrien', Email: 'kevin.ob@email.com', Phone: '617-555-3301', MailingCity: 'Boston', MailingState: 'MA' },
    { Id: CTCT[34], FirstName: 'Laura', LastName: 'Schwartz', Email: 'laura.s@email.com', Phone: '212-555-3401', MailingCity: 'New York', MailingState: 'NY' },
    { Id: CTCT[35], FirstName: 'Darius', LastName: 'Washington', Email: 'darius.w@email.com', Phone: '202-555-3501', MailingCity: 'Washington', MailingState: 'DC' },
    { Id: CTCT[36], FirstName: 'Hannah', LastName: 'Goldstein', Email: 'hannah.g@email.com', Phone: '215-555-3601', MailingCity: 'Philadelphia', MailingState: 'PA' },
    { Id: CTCT[37], FirstName: 'Jackson', LastName: 'Moore', Email: 'jackson.m@email.com', Phone: '303-555-3701', Title: 'Major Donor', MailingCity: 'Denver', MailingState: 'CO' },
    { Id: CTCT[38], FirstName: 'Lily', LastName: 'Zhang', Email: 'lily.z@email.com', Phone: '617-555-3801', MailingCity: 'Boston', MailingState: 'MA' },
    { Id: CTCT[39], FirstName: 'Nathan', LastName: 'Clark', Email: 'nathan.c@email.com', Phone: '512-555-3901', MailingCity: 'Austin', MailingState: 'TX' },
    { Id: CTCT[40], FirstName: 'Olivia', LastName: 'Bennett', Email: 'olivia.b@email.com', Phone: '704-555-4001', MailingCity: 'Charlotte', MailingState: 'NC' },
    { Id: CTCT[41], FirstName: 'Samuel', LastName: 'Morales', Email: 'samuel.m@email.com', Phone: '602-555-4101', MailingCity: 'Phoenix', MailingState: 'AZ' },
    { Id: CTCT[42], FirstName: 'Victoria', LastName: 'Singh', Email: 'victoria.s@email.com', Phone: '408-555-4201', Title: 'Event Chair', MailingCity: 'San Jose', MailingState: 'CA' },
    { Id: CTCT[43], FirstName: 'Christopher', LastName: 'Taylor', Email: 'chris.t@email.com', Phone: '614-555-4301', MailingCity: 'Columbus', MailingState: 'OH' },
    { Id: CTCT[44], FirstName: 'Diana', LastName: 'Lopez', Email: 'diana.l@email.com', Phone: '210-555-4401', MailingCity: 'San Antonio', MailingState: 'TX' },
    { Id: CTCT[45], FirstName: 'Alexander', LastName: 'White', Email: 'alex.w@email.com', Phone: '617-555-4501', Title: 'Legacy Society', MailingCity: 'Boston', MailingState: 'MA' },
    { Id: CTCT[46], FirstName: 'Rachel', LastName: 'Adams', Email: 'rachel.a@email.com', Phone: '503-555-4601', MailingCity: 'Portland', MailingState: 'OR' },
    { Id: CTCT[47], FirstName: 'Oscar', LastName: 'Ramirez', Email: 'oscar.r@email.com', Phone: '305-555-4701', MailingCity: 'Miami', MailingState: 'FL' },
    { Id: CTCT[48], FirstName: 'Megan', LastName: 'Cooper', Email: 'megan.c@email.com', Phone: '206-555-4801', MailingCity: 'Seattle', MailingState: 'WA' },
    { Id: CTCT[49], FirstName: 'Isaac', LastName: 'Hernandez', Email: 'isaac.h@email.com', Phone: '713-555-4901', MailingCity: 'Houston', MailingState: 'TX' },
    { Id: CTCT[50], FirstName: 'Sophia', LastName: 'Mitchell', Email: 'sophia.m@email.com', Phone: '404-555-5001', Title: 'Gala Committee', MailingCity: 'Atlanta', MailingState: 'GA' },
  ],

  Campaign: [
    { Id: CAMP[1], Name: '2025 Annual Fund', Type: 'Direct Mail', Status: 'In Progress', StartDate: '2025-01-01', EndDate: '2025-12-31', BudgetedCost: 50000, ActualCost: 32000, ExpectedRevenue: 500000, IsActive: true, NumberOfContacts: 200, NumberOfResponses: 85, Description: 'Annual fundraising campaign targeting all donors' },
    { Id: CAMP[2], Name: 'Spring Gala 2025', Type: 'Event', Status: 'Completed', StartDate: '2025-04-15', EndDate: '2025-04-15', BudgetedCost: 75000, ActualCost: 68000, ExpectedRevenue: 250000, IsActive: false, NumberOfContacts: 150, NumberOfResponses: 120, Description: 'Annual spring fundraising gala dinner' },
    { Id: CAMP[3], Name: 'Year-End Giving 2024', Type: 'Email', Status: 'Completed', StartDate: '2024-11-15', EndDate: '2024-12-31', BudgetedCost: 15000, ActualCost: 12500, ExpectedRevenue: 200000, IsActive: false, NumberOfContacts: 500, NumberOfResponses: 180 },
    { Id: CAMP[4], Name: 'Walk for Hope 2025', Type: 'Event', Status: 'Planned', StartDate: '2025-09-20', EndDate: '2025-09-20', BudgetedCost: 25000, ExpectedRevenue: 100000, IsActive: true, NumberOfContacts: 0, Description: 'Annual charity walk/run event' },
    { Id: CAMP[5], Name: 'Major Gifts Initiative', Type: 'Other', Status: 'In Progress', StartDate: '2025-01-01', EndDate: '2025-12-31', BudgetedCost: 10000, ActualCost: 5000, ExpectedRevenue: 1000000, IsActive: true, NumberOfContacts: 25, NumberOfResponses: 8 },
    { Id: CAMP[6], Name: 'Social Media Drive', Type: 'Social Media', Status: 'In Progress', StartDate: '2025-03-01', EndDate: '2025-06-30', BudgetedCost: 5000, ActualCost: 3200, ExpectedRevenue: 30000, IsActive: true, NumberOfContacts: 1000, NumberOfResponses: 45 },
    { Id: CAMP[7], Name: 'Corporate Partnership Program', Type: 'Other', Status: 'In Progress', StartDate: '2025-01-01', EndDate: '2025-12-31', BudgetedCost: 20000, ExpectedRevenue: 500000, IsActive: true, NumberOfContacts: 30, NumberOfResponses: 12 },
    { Id: CAMP[8], Name: 'Scholarship Fund Drive', Type: 'Direct Mail', Status: 'Planned', StartDate: '2025-08-01', EndDate: '2025-10-31', BudgetedCost: 8000, ExpectedRevenue: 75000, IsActive: true, Description: 'Fundraising for student scholarships' },
    { Id: CAMP[9], Name: 'GivingTuesday 2024', Type: 'Email', Status: 'Completed', StartDate: '2024-12-03', EndDate: '2024-12-03', BudgetedCost: 2000, ActualCost: 1800, ExpectedRevenue: 50000, IsActive: false, NumberOfContacts: 800, NumberOfResponses: 95 },
    { Id: CAMP[10], Name: 'Volunteer Appreciation', Type: 'Event', Status: 'Completed', StartDate: '2025-04-20', EndDate: '2025-04-20', BudgetedCost: 5000, ActualCost: 4500, IsActive: false, NumberOfContacts: 60, NumberOfResponses: 45 },
  ],

  Opportunity: (() => {
    const stages = ['Prospecting', 'Pledged', 'Received', 'Thanked', 'Closed Won', 'Closed Lost'];
    const types = ['Individual', 'Corporate', 'Foundation', 'Government', 'Major Gift', 'Matching Gift', 'In-Kind'];
    const opps = [];
    const amounts = [25, 50, 100, 150, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000];
    const contacts = [CTCT[1], CTCT[3], CTCT[5], CTCT[7], CTCT[9], CTCT[11], CTCT[13], CTCT[14], CTCT[16], CTCT[17], CTCT[19], CTCT[20], CTCT[21], CTCT[22], CTCT[23], CTCT[24], CTCT[25], CTCT[26], CTCT[27], CTCT[28], CTCT[29], CTCT[30], CTCT[31], CTCT[32], CTCT[33], CTCT[34], CTCT[35], CTCT[36], CTCT[37], CTCT[38], CTCT[39], CTCT[40], CTCT[41], CTCT[42], CTCT[43], CTCT[44], CTCT[45], CTCT[46], CTCT[47], CTCT[48], CTCT[49], CTCT[50]];
    const accounts = [ACCT[1], ACCT[2], ACCT[3], ACCT[4], ACCT[5], ACCT[6], ACCT[7], ACCT[8], ACCT[9], ACCT[10], ACCT[11], ACCT[12], ACCT[13], ACCT[14], ACCT[15], ACCT[16], ACCT[17], ACCT[18], ACCT[19], ACCT[20]];
    const campaigns = [CAMP[1], CAMP[2], CAMP[3], CAMP[5], CAMP[6], CAMP[7], CAMP[9]];
    const names = ['Annual Gift', 'Spring Gala Donation', 'Year-End Gift', 'Monthly Donation', 'Major Gift', 'Corporate Sponsorship', 'Foundation Grant', 'Memorial Gift', 'Matching Gift', 'Scholarship Fund', 'General Donation', 'Event Sponsorship', 'Capital Campaign', 'Planned Gift', 'In-Kind Donation'];

    for (let i = 1; i <= 80; i++) {
      const stageIdx = i <= 45 ? 4 : i <= 55 ? 3 : i <= 65 ? 2 : i <= 72 ? 1 : i <= 77 ? 0 : 5;
      const month = ((i - 1) % 12) + 1;
      const year = i <= 40 ? 2024 : 2025;
      const day = Math.min(((i * 3) % 28) + 1, 28);
      const amt = amounts[i % amounts.length] + (i * 13 % 500);
      opps.push({
        Id: OPP[i],
        Name: names[i % names.length] + ' - ' + String(i).padStart(3, '0'),
        Amount: amt,
        CloseDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        StageName: stages[stageIdx],
        Probability: stageIdx === 4 ? 100 : stageIdx === 5 ? 0 : [10, 25, 50, 75][stageIdx],
        AccountId: accounts[i % accounts.length],
        Type: types[i % types.length],
        LeadSource: ['Web', 'Phone Inquiry', 'Partner Referral', 'Event', 'Other'][i % 5],
        CampaignId: campaigns[i % campaigns.length],
        Primary_Contact__c: contacts[i % contacts.length],
        npsp__Acknowledgment_Status__c: stageIdx >= 3 ? 'Acknowledged' : stageIdx >= 2 ? 'To Be Acknowledged' : '',
      });
    }
    return opps;
  })(),

  Lead: [
    { Id: LEAD[1], FirstName: 'Benjamin', LastName: 'Foster', Company: 'Foster LLC', Email: 'ben.foster@foster.com', Phone: '617-555-7001', Status: 'Open', LeadSource: 'Web', City: 'Boston', State: 'MA' },
    { Id: LEAD[2], FirstName: 'Catherine', LastName: 'Wright', Company: 'Wright Consulting', Email: 'cwright@wrightco.com', Phone: '212-555-7002', Status: 'Contacted', LeadSource: 'Event', City: 'New York', State: 'NY' },
    { Id: LEAD[3], FirstName: 'Derek', LastName: 'Stone', Company: 'Stone Industries', Email: 'derek@stone-ind.com', Phone: '312-555-7003', Status: 'Qualified', LeadSource: 'Partner Referral', City: 'Chicago', State: 'IL' },
    { Id: LEAD[4], FirstName: 'Elena', LastName: 'Voronova', Company: 'Voronova Art Gallery', Email: 'elena@voronova.art', Phone: '415-555-7004', Status: 'Open', LeadSource: 'Web', City: 'San Francisco', State: 'CA' },
    { Id: LEAD[5], FirstName: 'Franklin', LastName: 'Mills', Company: 'Mills Family Trust', Email: 'frank@millsfamily.com', Phone: '305-555-7005', Status: 'Contacted', LeadSource: 'Phone Inquiry', City: 'Miami', State: 'FL' },
    { Id: LEAD[6], FirstName: 'Gloria', LastName: 'Santos', Company: 'Santos Foundation', Email: 'gloria@santosfdn.org', Phone: '213-555-7006', Status: 'Qualified', LeadSource: 'Event', City: 'Los Angeles', State: 'CA' },
    { Id: LEAD[7], FirstName: 'Henry', LastName: 'Liu', Company: 'Liu Technologies', Email: 'henry@liutech.com', Phone: '206-555-7007', Status: 'Open', LeadSource: 'Web', City: 'Seattle', State: 'WA' },
    { Id: LEAD[8], FirstName: 'Irene', LastName: 'Dupont', Company: 'Dupont Ventures', Email: 'irene@dupontvc.com', Phone: '617-555-7008', Status: 'Unqualified', LeadSource: 'Other', City: 'Boston', State: 'MA' },
    { Id: LEAD[9], FirstName: 'James', LastName: 'Osei', Company: 'Osei Enterprises', Email: 'james@osei.biz', Phone: '404-555-7009', Status: 'Open', LeadSource: 'Partner Referral', City: 'Atlanta', State: 'GA' },
    { Id: LEAD[10], FirstName: 'Karen', LastName: 'Hoffman', Company: 'Hoffman Philanthropy', Email: 'karen@hoffman.org', Phone: '202-555-7010', Status: 'Contacted', LeadSource: 'Event', City: 'Washington', State: 'DC' },
    { Id: LEAD[11], FirstName: 'Luis', LastName: 'Medina', Email: 'luis.medina@email.com', Phone: '512-555-7011', Status: 'Open', LeadSource: 'Web', City: 'Austin', State: 'TX' },
    { Id: LEAD[12], FirstName: 'Monica', LastName: 'Chang', Company: 'Chang & Associates', Email: 'monica@changlaw.com', Phone: '415-555-7012', Status: 'Qualified', LeadSource: 'Phone Inquiry', City: 'San Francisco', State: 'CA' },
    { Id: LEAD[13], FirstName: 'Nathan', LastName: 'Brooks', Company: 'Brooks Real Estate', Email: 'nathan@brookshomes.com', Phone: '702-555-7013', Status: 'Contacted', LeadSource: 'Web', City: 'Las Vegas', State: 'NV' },
    { Id: LEAD[14], FirstName: 'Olivia', LastName: 'Park', Email: 'olivia.park@email.com', Phone: '773-555-7014', Status: 'Open', LeadSource: 'Other', City: 'Chicago', State: 'IL' },
    { Id: LEAD[15], FirstName: 'Patrick', LastName: 'Reilly', Company: 'Reilly Capital', Email: 'patrick@reillycap.com', Phone: '617-555-7015', Status: 'Qualified', LeadSource: 'Partner Referral', City: 'Boston', State: 'MA' },
  ],

  Payment__c: (() => {
    const payments = [];
    const methods = ['Credit Card', 'Check', 'Cash', 'ACH'];
    for (let i = 1; i <= 60; i++) {
      const oppIdx = ((i - 1) % 45) + 1; // Link to first 45 (Closed Won) opportunities
      const month = ((i - 1) % 12) + 1;
      const year = i <= 30 ? 2024 : 2025;
      const day = Math.min(((i * 7) % 28) + 1, 28);
      const method = methods[i % methods.length];
      payments.push({
        Id: PMT[i],
        Name: `PMT-${String(i).padStart(6, '0')}`,
        Opportunity__c: OPP[oppIdx],
        Payment_Acknowledged_Date__c: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        Payment_Acknowledgment_Status__c: i <= 40 ? 'Acknowledged' : 'To Be Acknowledged',
        Type__c: method === 'Credit Card' ? 'Card' : method,
        Card_Network__c: method === 'Credit Card' ? ['Visa', 'Mastercard', 'Amex'][i % 3] : '',
        Card_Last_4__c: method === 'Credit Card' ? String(1000 + i * 37 % 9000) : '',
      });
    }
    return payments;
  })(),

  Recurring_Donation__c: (() => {
    const rds = [];
    const periods = ['Monthly', 'Monthly', 'Monthly', 'Quarterly', 'Yearly'];
    const statuses = ['Active', 'Active', 'Active', 'Active', 'Lapsed', 'Closed'];
    for (let i = 1; i <= 20; i++) {
      const contactIdx = ((i - 1) * 2) + 1;
      rds.push({
        Id: RD[i],
        Name: `RD-${String(i).padStart(6, '0')}`,
        Contact__c: CTCT[contactIdx <= 50 ? contactIdx : 1],
        Amount__c: [25, 50, 100, 150, 250, 500, 1000][i % 7],
        npe03__Date_Established__c: i <= 10 ? '2024-01-15' : '2025-01-01',
        InstallmentPeriod__c: periods[i % periods.length],
        Status__c: statuses[i % statuses.length],
        Day_of_Month__c: String(((i * 5) % 28) + 1),
        RecurringType__c: 'Open',
        InstallmentFrequency__c: 1,
      });
    }
    return rds;
  })(),

  General_Accounting_Unit__c: [
    { Id: GAU[1], Name: 'Unrestricted General Fund', Active__c: true, Description__c: 'General operating expenses and overhead', Total_Allocations__c: 450000, Number_of_Allocations__c: 120 },
    { Id: GAU[2], Name: 'Education Programs', Active__c: true, Description__c: 'K-12 and adult education initiatives', Total_Allocations__c: 180000, Number_of_Allocations__c: 45 },
    { Id: GAU[3], Name: 'Health & Wellness', Active__c: true, Description__c: 'Community health programs and wellness services', Total_Allocations__c: 120000, Number_of_Allocations__c: 30 },
    { Id: GAU[4], Name: 'Youth Development', Active__c: true, Description__c: 'After-school programs and mentorship', Total_Allocations__c: 95000, Number_of_Allocations__c: 25 },
    { Id: GAU[5], Name: 'Emergency Assistance', Active__c: true, Description__c: 'Emergency food, shelter, and financial aid', Total_Allocations__c: 75000, Number_of_Allocations__c: 40 },
    { Id: GAU[6], Name: 'Capital Campaign', Active__c: true, Description__c: 'Building renovation and expansion', Total_Allocations__c: 350000, Number_of_Allocations__c: 15 },
    { Id: GAU[7], Name: 'Scholarship Fund', Active__c: true, Description__c: 'Student scholarships and tuition assistance', Total_Allocations__c: 85000, Number_of_Allocations__c: 20 },
    { Id: GAU[8], Name: 'Technology Infrastructure', Active__c: false, Description__c: 'IT systems and digital transformation', Total_Allocations__c: 45000, Number_of_Allocations__c: 8 },
  ],

  Allocation__c: (() => {
    const allocs = [];
    for (let i = 1; i <= 30; i++) {
      const oppIdx = ((i - 1) % 45) + 1;
      const gauIdx = (i % 8) + 1;
      allocs.push({
        Id: ALLOC[i],
        Name: `ALL-${i}`,
        Amount__c: 500 + (i * 100),
        Opportunity__c: OPP[oppIdx],
        General_Accounting_Unit__c: GAU[gauIdx],
        Percent__c: [100, 50, 75, 25, 60, 40, 80, 33][i % 8],
      });
    }
    return allocs;
  })(),

  Address__c: (() => {
    const addrs = [];
    const cities = ['Boston', 'Cambridge', 'New York', 'San Francisco', 'Chicago', 'Miami', 'Seattle', 'Los Angeles', 'Washington', 'Atlanta', 'Houston', 'Portland', 'Nashville', 'Denver', 'Philadelphia'];
    const states = ['MA', 'MA', 'NY', 'CA', 'IL', 'FL', 'WA', 'CA', 'DC', 'GA', 'TX', 'OR', 'TN', 'CO', 'PA'];
    const zips = ['02101', '02139', '10001', '94102', '60601', '33101', '98101', '90001', '20001', '30301', '77001', '97201', '37201', '80201', '19101'];
    for (let i = 1; i <= 25; i++) {
      const cityIdx = (i - 1) % 15;
      addrs.push({
        Id: ADDR[i],
        Name: `ADDR-${String(i).padStart(5, '0')}`,
        MailingStreet__c: `${100 + i * 10} Main Street`,
        MailingCity__c: cities[cityIdx],
        MailingState__c: states[cityIdx],
        MailingZip__c: zips[cityIdx],
        MailingCountry__c: 'US',
        Address_Type__c: i % 3 === 0 ? 'Work' : 'Home',
        Default_Address__c: i <= 15,
        Verified__c: i <= 18,
      });
    }
    return addrs;
  })(),

  Engagement_Plan_Template__c: [
    { Id: EPT[1], Name: 'New Major Donor Welcome', Description__c: 'Welcome sequence for new major gift donors ($10K+)' },
    { Id: EPT[2], Name: 'Annual Fund Follow-up', Description__c: 'Post-donation stewardship for annual fund donors' },
    { Id: EPT[3], Name: 'Lapsed Donor Reactivation', Description__c: 'Outreach plan for donors who missed their last gift' },
    { Id: EPT[4], Name: 'New Board Member Onboarding', Description__c: 'Orientation plan for new board members' },
    { Id: EPT[5], Name: 'Grant Application Process', Description__c: 'Steps for foundation grant application and follow-up' },
  ],

  Engagement_Plan__c: (() => {
    const plans = [];
    for (let i = 1; i <= 10; i++) {
      plans.push({
        Id: EP[i],
        Name: `EP-${String(i).padStart(4, '0')}`,
        Engagement_Plan_Template__c: EPT[((i - 1) % 5) + 1],
        Contact__c: CTCT[i],
        Completed__c: i <= 4,
      });
    }
    return plans;
  })(),

  Engagement_Plan_Task__c: (() => {
    const tasks = [];
    const taskNames = ['Send welcome letter', 'Schedule intro call', 'Add to newsletter', 'Send annual report', 'Schedule site visit', 'Thank you phone call', 'Send impact report', 'Invite to next event', 'Follow up email', 'Quarterly check-in'];
    for (let i = 1; i <= 20; i++) {
      tasks.push({
        Id: EPTK[i],
        Name: taskNames[(i - 1) % taskNames.length],
        Engagement_Plan__c: EP[((i - 1) % 10) + 1],
        Priority__c: i % 3 === 0 ? 'High' : 'Normal',
        Status__c: i <= 12 ? 'Completed' : i <= 16 ? 'In Progress' : 'Not Started',
        Days_After__c: (i % 7) * 5,
        Type__c: ['Call', 'Email', 'Meeting', 'Other'][i % 4],
        Comments__c: `Step ${(i - 1) % 10 + 1} of engagement plan`,
      });
    }
    return tasks;
  })(),

  Level__c: [
    { Id: LVL[1], Name: 'Bronze', Active__c: true, Minimum_Amount__c: 0, Maximum_Amount__c: 249, Source_Object__c: 'Contact', Target__c: 'npo02__Total_Household_Gifts__c', Level_Field__c: 'npo02__LastMembershipLevel__c' },
    { Id: LVL[2], Name: 'Silver', Active__c: true, Minimum_Amount__c: 250, Maximum_Amount__c: 999, Source_Object__c: 'Contact', Target__c: 'npo02__Total_Household_Gifts__c', Level_Field__c: 'npo02__LastMembershipLevel__c' },
    { Id: LVL[3], Name: 'Gold', Active__c: true, Minimum_Amount__c: 1000, Maximum_Amount__c: 4999, Source_Object__c: 'Contact', Target__c: 'npo02__Total_Household_Gifts__c', Level_Field__c: 'npo02__LastMembershipLevel__c' },
    { Id: LVL[4], Name: 'Platinum', Active__c: true, Minimum_Amount__c: 5000, Maximum_Amount__c: 24999, Source_Object__c: 'Contact', Target__c: 'npo02__Total_Household_Gifts__c', Level_Field__c: 'npo02__LastMembershipLevel__c' },
    { Id: LVL[5], Name: 'Diamond', Active__c: true, Minimum_Amount__c: 25000, Maximum_Amount__c: 999999, Source_Object__c: 'Contact', Target__c: 'npo02__Total_Household_Gifts__c', Level_Field__c: 'npo02__LastMembershipLevel__c' },
  ],

  Affiliation__c: (() => {
    const affs = [];
    const orgAccounts = [ACCT[11], ACCT[12], ACCT[13], ACCT[14], ACCT[15], ACCT[16], ACCT[17], ACCT[18], ACCT[19], ACCT[20]];
    for (let i = 1; i <= 15; i++) {
      affs.push({
        Id: AFF[i],
        Name: `AFF-${String(i).padStart(5, '0')}`,
        Contact__c: CTCT[((i - 1) * 3) % 50 + 1],
        Organization__c: orgAccounts[(i - 1) % orgAccounts.length],
        Role__c: ['Employee', 'Board Member', 'Volunteer', 'Donor', 'Advisor'][i % 5],
        Status__c: i <= 12 ? 'Current' : 'Former',
        StartDate__c: i <= 8 ? '2023-01-01' : '2024-06-01',
        Primary__c: i <= 10,
        Related_Opportunity_Contact_Role__c: i % 3 === 0 ? 'Soft Credit' : 'Solicitor',
      });
    }
    return affs;
  })(),

  Relationship__c: (() => {
    const rels = [];
    const types = ['Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Friend', 'Colleague', 'Mentor', 'Board Colleague', 'Neighbor'];
    for (let i = 1; i <= 20; i++) {
      rels.push({
        Id: REL[i],
        Name: `REL-${String(i).padStart(5, '0')}`,
        Contact__c: CTCT[((i - 1) * 2) % 50 + 1],
        RelatedContact__c: CTCT[((i - 1) * 2 + 1) % 50 + 1],
        Type__c: types[(i - 1) % types.length],
        Status__c: i <= 17 ? 'Current' : 'Former',
        Related_Opportunity_Contact_Role__c: i % 4 === 0 ? 'Tribute' : i % 3 === 0 ? 'Soft Credit' : 'Solicitor',
      });
    }
    return rels;
  })(),

  Account_Soft_Credit__c: (() => {
    const scs = [];
    for (let i = 1; i <= 10; i++) {
      scs.push({
        Id: ASC[i],
        Name: `ASC-${String(i).padStart(5, '0')}`,
        Account__c: ACCT[10 + (i % 10) + 1],
        Opportunity__c: OPP[i],
        Amount__c: 1000 + i * 500,
        Role__c: i % 2 === 0 ? 'Matching Gift Provider' : 'Employer',
      });
    }
    return scs;
  })(),

  Partial_Soft_Credit__c: (() => {
    const psc = [];
    for (let i = 1; i <= 8; i++) {
      psc.push({
        Id: PSC[i],
        Name: `PSC-${String(i).padStart(5, '0')}`,
        Contact__c: CTCT[i + 5],
        Opportunity__c: OPP[i + 10],
        Amount__c: 250 + i * 100,
        Contact_Role_ID__c: `OCR-${String(i).padStart(5, '0')}`,
        Role_Name__c: ['Household Member', 'Soft Credit', 'Solicitor', 'Influencer'][i % 4],
      });
    }
    return psc;
  })(),

  Household__c: (() => {
    const hhs = [];
    const names = ['Martinez', 'Patel', 'Thompson', 'Nakamura', 'Williams', 'Garcia', 'Lee', 'Brown', 'Kim-Park', 'Johnson', 'Nguyen', 'Walker', 'Robinson', 'Okafor', 'Watanabe'];
    for (let i = 1; i <= 15; i++) {
      hhs.push({
        Id: HH[i],
        Name: `${names[i - 1]} Household`,
        Formal_Greeting__c: `The ${names[i - 1]} Family`,
        Informal_Greeting__c: names[i - 1] + 's',
        Number_of_Household_Members__c: i <= 10 ? 2 : 1,
      });
    }
    return hhs;
  })(),

  CampaignMember: (() => {
    const members = [];
    for (let i = 1; i <= 30; i++) {
      members.push({
        Id: CMEM[i],
        CampaignId: CAMP[((i - 1) % 10) + 1],
        ContactId: CTCT[((i - 1) % 50) + 1],
        Status: i <= 20 ? 'Responded' : i <= 25 ? 'Sent' : 'Attended',
        FirstRespondedDate: i <= 20 ? '2025-03-15' : null,
      });
    }
    return members;
  })(),

  Task: (() => {
    const tasks = [];
    const subjects = ['Call', 'Email', 'Send Letter', 'Send Quote', 'Other'];
    const taskNames = ['Thank you call', 'Follow up on pledge', 'Schedule meeting', 'Send tax receipt', 'Update donor record', 'Confirm event attendance', 'Send impact report', 'Review grant application', 'Prepare presentation', 'Update database', 'Call about recurring donation', 'Email newsletter preview', 'Schedule board meeting', 'Send volunteer welcome', 'Review financial report', 'Prepare annual report', 'Update website', 'Social media post', 'Event planning meeting', 'Donor appreciation call'];
    for (let i = 1; i <= 20; i++) {
      const month = ((i - 1) % 6) + 1;
      tasks.push({
        Id: TASK[i],
        Subject: subjects[i % subjects.length],
        Description: taskNames[i - 1],
        Status: i <= 10 ? 'Completed' : i <= 15 ? 'In Progress' : 'Not Started',
        Priority: i % 4 === 0 ? 'High' : 'Normal',
        ActivityDate: `2025-${String(month).padStart(2, '0')}-${String(Math.min((i * 3) % 28 + 1, 28)).padStart(2, '0')}`,
        WhoId: CTCT[((i - 1) % 30) + 1],
        WhatId: ACCT[((i - 1) % 20) + 1],
        OwnerId: USR[((i - 1) % 5) + 1],
      });
    }
    return tasks;
  })(),

  Event: [
    { Id: EVNT[1], Subject: 'Spring Gala Planning Meeting', StartDateTime: '2025-03-10T14:00:00Z', EndDateTime: '2025-03-10T16:00:00Z', Location: 'Main Office Conference Room', WhoId: CTCT[1], WhatId: ACCT[11], OwnerId: USR[2] },
    { Id: EVNT[2], Subject: 'Major Donor Luncheon', StartDateTime: '2025-04-05T12:00:00Z', EndDateTime: '2025-04-05T14:00:00Z', Location: 'The Capital Grille', WhoId: CTCT[3], WhatId: ACCT[15], OwnerId: USR[3] },
    { Id: EVNT[3], Subject: 'Board Meeting Q2', StartDateTime: '2025-04-15T10:00:00Z', EndDateTime: '2025-04-15T12:00:00Z', Location: 'Board Room', WhoId: CTCT[7], OwnerId: USR[1] },
    { Id: EVNT[4], Subject: 'Volunteer Orientation', StartDateTime: '2025-05-01T09:00:00Z', EndDateTime: '2025-05-01T11:00:00Z', Location: 'Community Center', WhoId: CTCT[5], OwnerId: USR[4] },
    { Id: EVNT[5], Subject: 'Grant Review Committee', StartDateTime: '2025-05-10T15:00:00Z', EndDateTime: '2025-05-10T17:00:00Z', Location: 'Virtual - Zoom', WhoId: CTCT[19], WhatId: ACCT[14], OwnerId: USR[2] },
    { Id: EVNT[6], Subject: 'Annual Fund Kickoff', StartDateTime: '2025-06-01T13:00:00Z', EndDateTime: '2025-06-01T15:00:00Z', Location: 'Main Office', OwnerId: USR[2] },
    { Id: EVNT[7], Subject: 'Donor Recognition Ceremony', StartDateTime: '2025-06-15T18:00:00Z', EndDateTime: '2025-06-15T21:00:00Z', Location: 'Grand Ballroom, Hilton Hotel', WhoId: CTCT[45], OwnerId: USR[3] },
    { Id: EVNT[8], Subject: 'Corporate Partnership Meeting', StartDateTime: '2025-07-01T10:00:00Z', EndDateTime: '2025-07-01T11:30:00Z', Location: 'TechForward HQ', WhoId: CTCT[20], WhatId: ACCT[12], OwnerId: USR[3] },
    { Id: EVNT[9], Subject: 'Walk for Hope Setup', StartDateTime: '2025-09-19T08:00:00Z', EndDateTime: '2025-09-19T17:00:00Z', Location: 'Esplanade Park', OwnerId: USR[4] },
    { Id: EVNT[10], Subject: 'Year-End Campaign Strategy', StartDateTime: '2025-10-01T14:00:00Z', EndDateTime: '2025-10-01T16:00:00Z', Location: 'Main Office', OwnerId: USR[2] },
  ],

  Fund__c: [
    { Id: FUND[1], Name: 'General Operating Fund' },
    { Id: FUND[2], Name: 'Education Endowment' },
    { Id: FUND[3], Name: 'Emergency Relief Fund' },
    { Id: FUND[4], Name: 'Capital Building Fund' },
    { Id: FUND[5], Name: 'Youth Programs Fund' },
    { Id: FUND[6], Name: 'Technology Innovation Fund' },
  ],

  Error__c: [
    { Id: ERR[1], Name: 'ERR-001', Error_Type__c: 'Batch Processing', Full_Message__c: 'Duplicate record found during import batch 2024-Q4', Datetime__c: '2024-12-15T10:30:00Z', Context_Type__c: 'DataImport', Object_Type__c: 'Contact', Record_URL__c: '/003xxxxxxxxxxxx', Retry_Pending__c: false },
    { Id: ERR[2], Name: 'ERR-002', Error_Type__c: 'Allocation', Full_Message__c: 'Allocation percentages exceed 100% for opportunity', Datetime__c: '2025-01-10T14:22:00Z', Context_Type__c: 'Allocation', Object_Type__c: 'Allocation__c', Retry_Pending__c: true },
    { Id: ERR[3], Name: 'ERR-003', Error_Type__c: 'Recurring Donation', Full_Message__c: 'Failed to create installment opportunity for RD-000015', Datetime__c: '2025-02-01T09:15:00Z', Context_Type__c: 'RD', Object_Type__c: 'Recurring_Donation__c', Retry_Pending__c: true },
  ],
};

module.exports = { demoData };
