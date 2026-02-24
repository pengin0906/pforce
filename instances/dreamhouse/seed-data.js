const { generateSeedId } = require('../../salesforce-id');

function buildIdMap(objectName, count) {
  const map = {};
  for (let i = 1; i <= count; i++) {
    map[i] = generateSeedId(objectName, i);
  }
  return map;
}

const BRK = buildIdMap('Broker__c', 8);
const PROP = buildIdMap('Property__c', 12);
const CON = buildIdMap('Contact', 5);
const USR = buildIdMap('User', 2);

const demoData = {
  Broker__c: [
    { Id: BRK[1], Name: 'Caroline Kingsley', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'caroline@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/caroline_kingsley.jpg', Broker_Id__c: 1 },
    { Id: BRK[2], Name: 'Michael Jones', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'michael@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/michael_jones.jpg', Broker_Id__c: 2 },
    { Id: BRK[3], Name: 'Jonathan Bradley', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'jonathan@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/jonathan_bradley.jpg', Broker_Id__c: 3 },
    { Id: BRK[4], Name: 'Jennifer Wu', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'jen@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/jennifer_wu.jpg', Broker_Id__c: 4 },
    { Id: BRK[5], Name: 'Olivia Green', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'olivia@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/olivia_green.jpg', Broker_Id__c: 5 },
    { Id: BRK[6], Name: 'Miriam Aupont', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'miriam@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/miriam_aupont.jpg', Broker_Id__c: 6 },
    { Id: BRK[7], Name: 'Michelle Lambert', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'michelle@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/michelle_lambert.jpg', Broker_Id__c: 7 },
    { Id: BRK[8], Name: 'Victor Ochoa', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'victor@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/victor_ochoa.jpg', Broker_Id__c: 8 }
  ],

  Property__c: [
    { Id: PROP[1], Name: 'Stunning Victorian', Address__c: '18 Henry St', City__c: 'Cambridge', State__c: 'MA', Zip__c: '01742', Price__c: 975000, Beds__c: 4, Baths__c: 3, Status__c: 'Available', Tags__c: 'victorian', Broker__c: BRK[1], Latitude__c: 42.35663, Longitude__c: -71.11095, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house01.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house01sq.jpg', Date_Listed__c: '2025-12-01', Description__c: 'This elegant Victorian home offers classic architecture with modern amenities.' },
    { Id: PROP[2], Name: 'Ultimate Sophistication', Address__c: '24 Pearl St', City__c: 'Cambridge', State__c: 'MA', Zip__c: '02420', Price__c: 1200000, Beds__c: 5, Baths__c: 4, Status__c: 'Contracted', Tags__c: 'colonial', Broker__c: BRK[2], Latitude__c: 42.359103, Longitude__c: -71.10869, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house02.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house02sq.jpg', Date_Listed__c: '2025-11-15', Date_Contracted__c: '2025-12-20', Description__c: 'Luxurious colonial with sophisticated finishes throughout.' },
    { Id: PROP[3], Name: 'Modern City Living', Address__c: '72 Francis St', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 825000, Beds__c: 5, Baths__c: 4, Status__c: 'Pre Market', Tags__c: 'contemporary', Broker__c: BRK[3], Latitude__c: 42.335435, Longitude__c: -71.106827, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house03.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house03sq.jpg', Date_Listed__c: '2025-12-10', Description__c: 'Contemporary urban living at its finest.' },
    { Id: PROP[4], Name: 'Stunning Colonial', Address__c: '32 Prince St', City__c: 'Cambridge', State__c: 'MA', Zip__c: '02420', Price__c: 930000, Beds__c: 5, Baths__c: 4, Status__c: 'Available', Tags__c: 'colonial', Broker__c: BRK[4], Latitude__c: 42.360642, Longitude__c: -71.110448, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house04.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house04sq.jpg', Date_Listed__c: '2025-11-20', Description__c: 'Beautiful colonial home with stunning details.' },
    { Id: PROP[5], Name: 'Waterfront in the City', Address__c: '110 Baxter Street', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 850000, Beds__c: 3, Baths__c: 2, Status__c: 'Closed', Tags__c: 'contemporary', Broker__c: BRK[5], Latitude__c: 42.368168, Longitude__c: -71.084454, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house05.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house05sq.jpg', Date_Listed__c: '2025-09-01', Date_Closed__c: '2025-12-15', Description__c: 'Stunning waterfront property with city views.' },
    { Id: PROP[6], Name: 'Quiet Retreat', Address__c: '448 Hanover St', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 725000, Beds__c: 4, Baths__c: 2, Status__c: 'Contracted', Tags__c: 'colonial', Broker__c: BRK[6], Latitude__c: 42.366855, Longitude__c: -71.052617, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house06.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house06sq.jpg', Date_Listed__c: '2025-10-15', Date_Contracted__c: '2025-12-05', Description__c: 'Peaceful colonial retreat in a quiet neighborhood.' },
    { Id: PROP[7], Name: 'City Living', Address__c: '127 Endicott St', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 450000, Beds__c: 3, Baths__c: 1, Status__c: 'Available', Tags__c: 'colonial', Broker__c: BRK[7], Latitude__c: 42.365003, Longitude__c: -71.057352, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house07.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house07sq.jpg', Date_Listed__c: '2025-10-20', Description__c: 'Charming city living with character.' },
    { Id: PROP[8], Name: 'Heart of Harvard Square', Address__c: '48 Brattle St', City__c: 'Cambridge', State__c: 'MA', Zip__c: '02420', Price__c: 450000, Beds__c: 5, Baths__c: 4, Status__c: 'Under Agreement', Tags__c: 'victorian', Broker__c: BRK[8], Latitude__c: 42.374117, Longitude__c: -71.121653, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house10.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house10sq.jpg', Date_Listed__c: '2025-10-01', Description__c: 'Prime location in the heart of Harvard Square.' },
    { Id: PROP[9], Name: 'Seaport District Retreat', Address__c: '121 Harborwalk', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 450000, Beds__c: 3, Baths__c: 3, Status__c: 'Available', Tags__c: 'contemporary', Broker__c: BRK[1], Latitude__c: 42.35695, Longitude__c: -71.049327, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house09.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house09sq.jpg', Date_Listed__c: '2025-11-10', Description__c: 'Modern retreat in the vibrant Seaport District.' },
    { Id: PROP[10], Name: 'Contemporary City Living', Address__c: '640 Harrison Ave', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 650000, Beds__c: 2, Baths__c: 2, Status__c: 'Available', Tags__c: 'contemporary', Broker__c: BRK[2], Latitude__c: 42.339892, Longitude__c: -71.068781, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house08.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house08sq.jpg', Date_Listed__c: '2025-12-05', Description__c: 'Stylish contemporary living in the city.' },
    { Id: PROP[11], Name: 'Architectural Details', Address__c: '95 Gloucester St', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 690000, Beds__c: 3, Baths__c: 3, Status__c: 'Available', Tags__c: 'contemporary', Broker__c: BRK[3], Latitude__c: 42.349693, Longitude__c: -71.084407, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house11.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house11sq.jpg', Date_Listed__c: '2025-11-05', Description__c: 'Exceptional architectural details throughout.' },
    { Id: PROP[12], Name: 'Contemporary Luxury', Address__c: '145 Commonwealth Ave', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 845000, Beds__c: 4, Baths__c: 3, Status__c: 'Available', Tags__c: 'contemporary', Broker__c: BRK[4], Latitude__c: 42.352466, Longitude__c: -71.075311, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house12.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/realty/house12sq.jpg', Date_Listed__c: '2025-11-25', Description__c: 'Luxury contemporary home on Commonwealth Ave.' }
  ],

  Contact: [
    { Id: CON[1], LastName: 'Holmes', FirstName: 'Brad', Phone: '617-555-0143', Email: 'bholmes@goodmail.com' },
    { Id: CON[2], LastName: 'Martin', FirstName: 'Leslie', Phone: '617-555-0112', Email: 'leslie@pentagon.com' },
    { Id: CON[3], LastName: 'Walker', FirstName: 'July', Phone: '617-555-0170', Email: 'julywalker@brain.com' },
    { Id: CON[4], LastName: 'Jones', FirstName: 'Anna', Phone: '617-555-0181', Email: 'annaj@mymail.com' },
    { Id: CON[5], LastName: 'Connor', FirstName: 'John', Phone: '617-555-0133', Email: 'jconnor@goodmail.com' }
  ],

  User: [
    { Id: USR[1], Username: 'admin@dreamhouse.demo', LastName: 'Admin', FirstName: 'DreamHouse', Email: 'admin@dreamhouse.demo', Title: 'System Administrator', IsActive: true, ProfileId: 'System_Admin', Alias: 'admin' },
    { Id: USR[2], Username: 'broker@dreamhouse.demo', LastName: 'Broker', FirstName: 'Demo', Email: 'broker@dreamhouse.demo', Title: 'Broker', IsActive: true, ProfileId: 'Broker', Alias: 'broker' }
  ]
};

module.exports = { demoData };
