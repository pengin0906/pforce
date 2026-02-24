'use strict';

/**
 * SF Misc Routes - limits, tabs, listviews, actions, apex REST stubs, SOAP endpoint
 */

const crypto = require('crypto');

function createSfMiscRoutes(app, ctx) {
  const { ensureAuthenticated, schemaConfig, SF_API_VERSION } = ctx;

  // API call counter
  let apiCallCount = 0;
  app.use('/services/', (req, res, next) => { apiCallCount++; next(); });

  app.get(`/services/data/v${SF_API_VERSION}/limits/`, ensureAuthenticated, (req, res) => {
    res.json({
      DailyApiRequests: { Max: 100000, Remaining: Math.max(0, 100000 - apiCallCount) },
      DailyBulkApiRequests: { Max: 10000, Remaining: 10000 },
      DailyBulkV2QueryJobs: { Max: 10000, Remaining: 10000 },
      DailyBulkV2QueryFileStorageMB: { Max: 100000, Remaining: 100000 },
      DataStorageMB: { Max: 1024, Remaining: 1024 },
      FileStorageMB: { Max: 1024, Remaining: 1024 },
      SingleEmail: { Max: 5000, Remaining: 5000 },
      MassEmail: { Max: 5000, Remaining: 5000 },
      StreamingApiConcurrentClients: { Max: 2000, Remaining: 2000 },
      DailyDurableStreamingApiEvents: { Max: 1000000, Remaining: 1000000 },
      HourlyDashboardResults: { Max: 200, Remaining: 200 },
      HourlyODataCallout: { Max: 10000, Remaining: 10000 },
      HourlyTimeBasedWorkflow: { Max: 1000, Remaining: 1000 },
      DailyWorkflowEmails: { Max: 1000000, Remaining: 1000000 },
      PermissionSets: { Max: 1500, Remaining: 1500, CreateCustom: { Max: 1000, Remaining: 1000 } }
    });
  });

  app.get(`/services/data/v${SF_API_VERSION}/tabs/`, ensureAuthenticated, (req, res) => {
    const allObjects = [...(schemaConfig.standardObjects || []), ...(schemaConfig.objects || [])];
    res.json(allObjects.map(obj => ({
      label: obj.label || obj.apiName, name: obj.apiName, sobjectName: obj.apiName,
      custom: obj.apiName.endsWith('__c'), url: `/services/data/v${SF_API_VERSION}/tabs/${obj.apiName}`,
      iconUrl: null, miniIconUrl: null, colors: [{ theme: 'theme4', color: '2196F3', context: 'primary' }]
    })));
  });

  app.get(`/services/data/v${SF_API_VERSION}/sobjects/:objectName/listviews/`, ensureAuthenticated, (req, res) => {
    const objName = req.params.objectName;
    res.json({
      done: true, listviews: [{
        id: crypto.createHash('md5').update(objName).digest('hex').slice(0, 18),
        label: 'All', developerName: 'All', soqlCompatible: true,
        describeUrl: `/services/data/v${SF_API_VERSION}/sobjects/${objName}/listviews/All/describe`,
        resultsUrl: `/services/data/v${SF_API_VERSION}/sobjects/${objName}/listviews/All/results`
      }], nextRecordsUrl: null, size: 1
    });
  });

  app.post(`/services/data/v${SF_API_VERSION}/actions/standard/:actionName`, ensureAuthenticated, (req, res) => {
    res.json([{ actionName: req.params.actionName, errors: null, isSuccess: true, outputValues: {} }]);
  });

  app.all('/services/apexrest/*', ensureAuthenticated, (req, res) => {
    res.status(404).json([{ message: `Apex REST endpoint not found: ${req.path}`, errorCode: 'NOT_FOUND' }]);
  });

  // SOAP Apex execute (sf apex run uses this)
  app.post('/services/Soap/s/:version/:orgId?', (req, res) => {
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <executeAnonymousResponse>
      <result>
        <column>-1</column>
        <compileProblem xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <compiled>true</compiled>
        <exceptionMessage xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <exceptionStackTrace xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <line>-1</line>
        <success>true</success>
      </result>
    </executeAnonymousResponse>
  </soapenv:Body>
</soapenv:Envelope>`);
  });
}

module.exports = { createSfMiscRoutes };
