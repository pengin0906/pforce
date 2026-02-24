'use strict';

/**
 * Report Routes - /api/reports/sales-summary, pipeline, kpi, activity
 */

function createReportRoutes(app, ctx) {
  const { ensureAuthenticated, canUserAccessObject, pgService, fsCollection } = ctx;

  app.get('/api/reports/sales-summary', ensureAuthenticated, async (req, res) => {
    if (!canUserAccessObject(req.user, 'Pharma_Opportunity__c', 'read')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const coll = fsCollection('Pharma_Opportunity__c');

      // Use SQL aggregation instead of loading all records
      const [byPhaseRows, byOwnerRows, totalsRows] = await Promise.all([
        pgService.aggregate(coll, {
          groupBy: ['Phase__c'],
          aggregates: [
            { func: 'COUNT', alias: 'cnt' },
            { func: 'SUM', field: 'Amount__c', alias: 'total' }
          ]
        }),
        pgService.aggregate(coll, {
          groupBy: ['Owner_Name__c'],
          aggregates: [
            { func: 'SUM', field: 'Amount__c', alias: 'total' }
          ]
        }),
        pgService.aggregate(coll, {
          aggregates: [
            { func: 'COUNT', alias: 'cnt' },
            { func: 'SUM', field: 'Amount__c', alias: 'total' }
          ]
        })
      ]);

      const byPhase = {};
      let wonAmount = 0, wonCount = 0, lostCount = 0;
      for (const row of byPhaseRows) {
        const phase = row.Phase__c || 'Unknown';
        byPhase[phase] = Number(row.total) || 0;
        if (phase === '成約') { wonAmount = Number(row.total) || 0; wonCount = Number(row.cnt) || 0; }
        if (phase === '失注') { lostCount = Number(row.cnt) || 0; }
      }

      const byOwner = {};
      for (const row of byOwnerRows) {
        byOwner[row.Owner_Name__c || 'Unknown'] = Number(row.total) || 0;
      }

      const totalAmount = Number(totalsRows[0]?.total) || 0;
      const totalCount = Number(totalsRows[0]?.cnt) || 0;

      res.json({
        totalPipeline: totalAmount,
        wonAmount,
        wonCount,
        lostCount,
        winRate: totalCount > 0 ? (wonCount / totalCount * 100).toFixed(2) : 0,
        byPhase,
        byOwner,
        averageDealSize: totalCount > 0 ? (totalAmount / totalCount).toFixed(0) : 0
      });
    } catch (error) {
      console.error('[ERROR] sales-summary report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  app.get('/api/reports/pipeline', ensureAuthenticated, async (req, res) => {
    if (!canUserAccessObject(req.user, 'Pharma_Opportunity__c', 'read')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const rows = await pgService.aggregate(fsCollection('Pharma_Opportunity__c'), {
        groupBy: ['Phase__c'],
        aggregates: [
          { func: 'COUNT', alias: 'cnt' },
          { func: 'SUM', field: 'Amount__c', alias: 'total' },
          { func: 'AVG', field: 'Amount__c', alias: 'avg_amount' }
        ]
      });

      const pipelineByPhase = {};
      for (const row of rows) {
        const phase = row.Phase__c || 'Unknown';
        pipelineByPhase[phase] = {
          count: Number(row.cnt) || 0,
          amount: Number(row.total) || 0,
          avgAmount: Number(row.avg_amount) || 0
        };
      }

      res.json(pipelineByPhase);
    } catch (error) {
      console.error('[ERROR] pipeline report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  app.get('/api/reports/kpi', ensureAuthenticated, async (req, res) => {
    try {
      const [
        totalDoctors,
        kolCount,
        totalSpecimens,
        processingSpecimens,
        activeLabs,
        oppAgg,
        wonCount
      ] = await Promise.all([
        pgService.count(fsCollection('Doctor__c')),
        pgService.count(fsCollection('Doctor__c'), { where: [{ field: 'Is_KOL__c', op: '==', value: 'true' }] }),
        pgService.count(fsCollection('Specimen__c')),
        pgService.count(fsCollection('Specimen__c'), {
          where: [{ field: 'Specimen_Status__c', op: 'IN', value: ['解析中', 'QC中', '受領待ち', '受領済', 'QC合格'] }]
        }),
        pgService.count(fsCollection('Lab__c'), { where: [{ field: 'Operation_Status__c', op: '==', value: '通常稼働' }] }),
        pgService.aggregate(fsCollection('Pharma_Opportunity__c'), {
          aggregates: [
            { func: 'COUNT', alias: 'cnt' },
            { func: 'SUM', field: 'Amount__c', alias: 'total' }
          ]
        }),
        pgService.count(fsCollection('Pharma_Opportunity__c'), { where: [{ field: 'Phase__c', op: '==', value: '成約' }] })
      ]);

      const totalOpps = Number(oppAgg[0]?.cnt) || 0;
      const pipelineValue = Number(oppAgg[0]?.total) || 0;

      res.json({
        totalDoctors,
        kolCount,
        totalSpecimens,
        processingSpecimens,
        activeLabs,
        pipelineValue,
        wonOpportunities: wonCount,
        winRate: totalOpps > 0 ? ((wonCount / totalOpps) * 100).toFixed(2) : 0
      });
    } catch (error) {
      console.error('[ERROR] kpi report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  app.get('/api/reports/activity', ensureAuthenticated, async (req, res) => {
    try {
      const [visitCount, maCount, seminarCount, recentVisits, recentMA, recentSeminars] = await Promise.all([
        pgService.count(fsCollection('Visit_Record__c')),
        pgService.count(fsCollection('MA_Activity__c')),
        pgService.count(fsCollection('Seminar__c')),
        pgService.query(fsCollection('Visit_Record__c'), {
          orderBy: [{ field: 'Visit_Date__c', direction: 'DESC' }],
          limit: 10
        }),
        pgService.query(fsCollection('MA_Activity__c'), {
          orderBy: [{ field: 'Activity_Date__c', direction: 'DESC' }],
          limit: 10
        }),
        pgService.query(fsCollection('Seminar__c'), {
          orderBy: [{ field: 'Event_Date__c', direction: 'DESC' }],
          limit: 10
        })
      ]);

      const activityTimeline = [
        ...recentVisits.map(v => ({ type: 'Visit', date: v.Visit_Date__c, title: `訪問: ${v.Name}` })),
        ...recentMA.map(m => ({ type: 'MA Activity', date: m.Activity_Date__c, title: `MA活動: ${m.Name}` })),
        ...recentSeminars.map(s => ({ type: 'Seminar', date: s.Event_Date__c, title: `セミナー: ${s.Name}` }))
      ].filter(a => a.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

      res.json({
        activityByType: { visits: visitCount, maActivities: maCount, seminars: seminarCount },
        recentActivities: activityTimeline
      });
    } catch (error) {
      console.error('[ERROR] activity report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });
}

module.exports = { createReportRoutes };
