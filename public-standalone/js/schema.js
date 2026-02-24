/* ============================================
   genmine CRM - Schema & Data Definitions
   遺伝子パネル検査 genmine TOP 専用SFA
   ============================================ */

// --- Salesforce Standard Objects ---
const SF_STANDARD_OBJECTS = [
  {
    apiName:'Account', label:'取引先', icon:'🏢', category:'standard',
    fields:[
      {apiName:'Name',label:'取引先名',type:'Text',required:true},
      {apiName:'Industry',label:'業種',type:'Picklist',values:['医療','製薬','バイオテック','IT','官公庁','その他']},
      {apiName:'Type',label:'種別',type:'Picklist',values:['顧客','見込客','パートナー','競合']},
      {apiName:'Phone',label:'電話番号',type:'Phone'},
      {apiName:'Website',label:'Webサイト',type:'Url'},
      {apiName:'BillingCity',label:'市区町村',type:'Text'},
      {apiName:'BillingState',label:'都道府県',type:'Text'},
      {apiName:'AnnualRevenue',label:'年間売上',type:'Currency'},
      {apiName:'Description',label:'説明',type:'LongTextArea'},
      {apiName:'OwnerId',label:'所有者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Industry','Type','Phone','BillingState'],
    statusField:'Type', statusMap:{顧客:'s-green',見込客:'s-blue',パートナー:'s-purple',競合:'s-red'}
  },
  {
    apiName:'Contact', label:'取引先責任者', icon:'👤', category:'standard',
    fields:[
      {apiName:'LastName',label:'姓',type:'Text',required:true},
      {apiName:'FirstName',label:'名',type:'Text'},
      {apiName:'AccountId',label:'取引先',type:'Lookup',ref:'Account'},
      {apiName:'Title',label:'役職',type:'Text'},
      {apiName:'Email',label:'メール',type:'Email'},
      {apiName:'Phone',label:'電話番号',type:'Phone'},
      {apiName:'Description',label:'説明',type:'LongTextArea'}
    ],
    listColumns:['LastName','FirstName','AccountId','Title','Email','Phone'],
    nameField:r=>(`${r.LastName} ${r.FirstName||''}`).trim()
  },
  {
    apiName:'Lead', label:'リード', icon:'🎯', category:'standard',
    fields:[
      {apiName:'LastName',label:'姓',type:'Text',required:true},
      {apiName:'FirstName',label:'名',type:'Text'},
      {apiName:'Company',label:'会社名',type:'Text',required:true},
      {apiName:'Title',label:'役職',type:'Text'},
      {apiName:'Email',label:'メール',type:'Email'},
      {apiName:'Phone',label:'電話番号',type:'Phone'},
      {apiName:'Status',label:'状況',type:'Picklist',values:['新規','連絡中','適格','不適格','転換済']},
      {apiName:'LeadSource',label:'リードソース',type:'Picklist',values:['Web','紹介','展示会','セミナー','広告','電話']},
      {apiName:'Rating',label:'評価',type:'Picklist',values:['Hot','Warm','Cold']},
      {apiName:'Description',label:'説明',type:'LongTextArea'},
      {apiName:'OwnerId',label:'所有者',type:'Lookup',ref:'User'}
    ],
    listColumns:['LastName','Company','Status','LeadSource','Rating','OwnerId'],
    statusField:'Status', statusMap:{新規:'s-blue',連絡中:'s-orange',適格:'s-green',不適格:'s-red',転換済:'s-gray'},
    kanbanField:'Status'
  },
  {
    apiName:'Opportunity', label:'商談', icon:'💰', category:'standard',
    fields:[
      {apiName:'Name',label:'商談名',type:'Text',required:true},
      {apiName:'AccountId',label:'取引先',type:'Lookup',ref:'Account'},
      {apiName:'StageName',label:'フェーズ',type:'Picklist',values:['見込み調査','ニーズ把握','提案','交渉','受注','失注'],required:true},
      {apiName:'Amount',label:'金額',type:'Currency'},
      {apiName:'CloseDate',label:'完了予定日',type:'Date',required:true},
      {apiName:'Probability',label:'確度(%)',type:'Percent'},
      {apiName:'Description',label:'説明',type:'LongTextArea'},
      {apiName:'OwnerId',label:'所有者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','AccountId','StageName','Amount','CloseDate','Probability'],
    statusField:'StageName', statusMap:{見込み調査:'s-gray',ニーズ把握:'s-blue',提案:'s-orange',交渉:'s-purple',受注:'s-green',失注:'s-red'},
    kanbanField:'StageName'
  },
  {
    apiName:'Case', label:'ケース', icon:'📋', category:'standard',
    fields:[
      {apiName:'Subject',label:'件名',type:'Text',required:true},
      {apiName:'AccountId',label:'取引先',type:'Lookup',ref:'Account'},
      {apiName:'Status',label:'状況',type:'Picklist',values:['新規','進行中','エスカレーション','解決済','クローズ']},
      {apiName:'Priority',label:'優先度',type:'Picklist',values:['高','中','低']},
      {apiName:'Origin',label:'発生元',type:'Picklist',values:['電話','メール','Web']},
      {apiName:'Description',label:'説明',type:'LongTextArea'},
      {apiName:'OwnerId',label:'所有者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Subject','AccountId','Status','Priority','Origin','OwnerId'],
    statusField:'Status', statusMap:{新規:'s-blue',進行中:'s-orange',エスカレーション:'s-red',解決済:'s-green',クローズ:'s-gray'},
    kanbanField:'Status'
  },
  {
    apiName:'Task', label:'ToDo', icon:'✅', category:'standard',
    fields:[
      {apiName:'Subject',label:'件名',type:'Text',required:true},
      {apiName:'WhoId',label:'名前',type:'Lookup',ref:'Contact'},
      {apiName:'WhatId',label:'関連先',type:'Lookup',ref:'Account'},
      {apiName:'Status',label:'状況',type:'Picklist',values:['未着手','進行中','完了','待機中','延期']},
      {apiName:'Priority',label:'優先度',type:'Picklist',values:['高','中','低']},
      {apiName:'ActivityDate',label:'期日',type:'Date'},
      {apiName:'Description',label:'コメント',type:'LongTextArea'},
      {apiName:'OwnerId',label:'担当者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Subject','Status','Priority','ActivityDate','OwnerId'],
    statusField:'Status', statusMap:{未着手:'s-gray',進行中:'s-blue',完了:'s-green',待機中:'s-orange',延期:'s-red'}
  },
  {
    apiName:'Event', label:'行動', icon:'📅', category:'standard',
    fields:[
      {apiName:'Subject',label:'件名',type:'Text',required:true},
      {apiName:'WhoId',label:'名前',type:'Lookup',ref:'Contact'},
      {apiName:'WhatId',label:'関連先',type:'Lookup',ref:'Account'},
      {apiName:'StartDateTime',label:'開始日時',type:'DateTime'},
      {apiName:'EndDateTime',label:'終了日時',type:'DateTime'},
      {apiName:'Location',label:'場所',type:'Text'},
      {apiName:'Description',label:'説明',type:'LongTextArea'},
      {apiName:'OwnerId',label:'担当者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Subject','StartDateTime','Location','OwnerId'],
    calendarView:true
  },
  {
    apiName:'Product2', label:'商品', icon:'📦', category:'standard',
    fields:[
      {apiName:'Name',label:'商品名',type:'Text',required:true},
      {apiName:'ProductCode',label:'商品コード',type:'Text'},
      {apiName:'Family',label:'商品ファミリー',type:'Picklist',values:['遺伝子パネル検査','データプラットフォーム','AIソリューション']},
      {apiName:'Description',label:'商品説明',type:'LongTextArea'},
      {apiName:'UnitPrice',label:'単価',type:'Currency'},
      {apiName:'IsActive',label:'有効',type:'Checkbox'}
    ],
    listColumns:['Name','ProductCode','Family','UnitPrice','IsActive']
  },
  {
    apiName:'Campaign', label:'キャンペーン', icon:'📢', category:'standard',
    fields:[
      {apiName:'Name',label:'キャンペーン名',type:'Text',required:true},
      {apiName:'Type',label:'種別',type:'Picklist',values:['展示会','Webセミナー','メール配信','広告','DM','PR']},
      {apiName:'Status',label:'状況',type:'Picklist',values:['計画中','進行中','完了','中止']},
      {apiName:'StartDate',label:'開始日',type:'Date'},
      {apiName:'EndDate',label:'終了日',type:'Date'},
      {apiName:'BudgetedCost',label:'予算',type:'Currency'},
      {apiName:'NumberOfLeads',label:'リード獲得数',type:'Number'},
      {apiName:'Description',label:'説明',type:'LongTextArea'}
    ],
    listColumns:['Name','Type','Status','StartDate','BudgetedCost','NumberOfLeads'],
    statusField:'Status', statusMap:{計画中:'s-blue',進行中:'s-orange',完了:'s-green',中止:'s-red'}
  }
];

// --- genmine Custom Objects ---
const CUSTOM_OBJECTS = [
  {
    apiName:'Medical_Institution__c', label:'医療機関', icon:'🏥', category:'custom',
    fields:[
      {apiName:'Name',label:'病院名',type:'Text',required:true},
      {apiName:'Facility_Type__c',label:'施設種別',type:'Picklist',values:['大学病院','がん拠点病院','一般病院','クリニック','研究所']},
      {apiName:'Adapter_Status__c',label:'genmine導入',type:'Picklist',values:['未導入','導入検討中','導入中','導入完了']},
      {apiName:'Contact_Person__c',label:'担当者名',type:'Text'},
      {apiName:'Prefecture__c',label:'都道府県',type:'Text'},
      {apiName:'Address__c',label:'住所',type:'Text'},
      {apiName:'Phone__c',label:'電話番号',type:'Phone'},
      {apiName:'Email__c',label:'メール',type:'Email'},
      {apiName:'Website__c',label:'Webサイト',type:'Url'},
      {apiName:'Bed_Count__c',label:'病床数',type:'Number'},
      {apiName:'Latitude__c',label:'緯度',type:'Number'},
      {apiName:'Longitude__c',label:'経度',type:'Number'},
      {apiName:'Note__c',label:'備考',type:'LongTextArea'}
    ],
    listColumns:['Name','Facility_Type__c','Adapter_Status__c','Prefecture__c','Contact_Person__c','Phone__c'],
    statusField:'Adapter_Status__c', statusMap:{未導入:'s-red',導入検討中:'s-orange',導入中:'s-blue',導入完了:'s-green'}
  },
  {
    apiName:'Doctor__c', label:'ドクター', icon:'👨‍⚕️', category:'custom',
    fields:[
      {apiName:'Name',label:'氏名',type:'Text',required:true},
      {apiName:'Institution__c',label:'所属病院',type:'Lookup',ref:'Medical_Institution__c'},
      {apiName:'Department__c',label:'診療科',type:'Picklist',values:['腫瘍内科','外科','呼吸器科','消化器科','血液内科','病理科','遺伝診療科','小児科','婦人科','泌尿器科']},
      {apiName:'Title__c',label:'役職',type:'Picklist',values:['教授','准教授','講師','助教','医長','部長','主任','医員']},
      {apiName:'Cancer_Type__c',label:'専門がん種',type:'Picklist',values:['肺がん','乳がん','大腸がん','胃がん','膵臓がん','前立腺がん','血液がん','希少がん','小児がん']},
      {apiName:'Relationship_Level__c',label:'関係構築度',type:'Picklist',values:['未接触','初回面談済','関心あり','検討中','推進者','ファン（KOL）']},
      {apiName:'Genomic_Interest__c',label:'genmine関心度',type:'Picklist',values:['高','中','低','不明']},
      {apiName:'Visit_Count__c',label:'訪問回数',type:'Number'},
      {apiName:'Last_Visit_Date__c',label:'最終訪問日',type:'Date'},
      {apiName:'KOL_Score__c',label:'KOLスコア',type:'Number'},
      {apiName:'Email__c',label:'メール',type:'Email'},
      {apiName:'Phone__c',label:'電話番号',type:'Phone'},
      {apiName:'Note__c',label:'備考',type:'LongTextArea'},
      {apiName:'OwnerId',label:'担当MR',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Institution__c','Department__c','Title__c','Relationship_Level__c','Genomic_Interest__c','Visit_Count__c'],
    statusField:'Relationship_Level__c', statusMap:{未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'}
  },
  {
    apiName:'Pharma_Opportunity__c', label:'製薬商談', icon:'💊', category:'custom',
    fields:[
      {apiName:'Name',label:'商談名',type:'Text',required:true},
      {apiName:'Pharma_Company__c',label:'製薬企業',type:'Text',required:true},
      {apiName:'Phase__c',label:'フェーズ',type:'Picklist',values:['リード','ヒアリング','提案','セキュリティ審査','契約交渉','受注','失注']},
      {apiName:'Service_Type__c',label:'サービス種別',type:'Picklist',values:['genmine TOP 導入','受託解析','Tempus Lens','Tempus Explore','共同研究','データライセンス']},
      {apiName:'Amount__c',label:'金額',type:'Currency'},
      {apiName:'Probability__c',label:'確度(%)',type:'Percent'},
      {apiName:'Close_Date__c',label:'クローズ予定日',type:'Date'},
      {apiName:'Contact_Name__c',label:'先方担当者',type:'Text'},
      {apiName:'Contact_Title__c',label:'先方役職',type:'Text'},
      {apiName:'Compliance_Check__c',label:'コンプライアンスチェック',type:'Checkbox'},
      {apiName:'Note__c',label:'備考',type:'LongTextArea'},
      {apiName:'OwnerId',label:'担当者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Pharma_Company__c','Phase__c','Service_Type__c','Amount__c','Close_Date__c'],
    statusField:'Phase__c', statusMap:{リード:'s-gray',ヒアリング:'s-blue',提案:'s-orange',セキュリティ審査:'s-purple',契約交渉:'s-teal',受注:'s-green',失注:'s-red'},
    kanbanField:'Phase__c'
  },
  {
    apiName:'Visit_Record__c', label:'訪問記録', icon:'📝', category:'custom',
    fields:[
      {apiName:'Name',label:'訪問番号',type:'AutoNumber',format:'VR-{0000}'},
      {apiName:'Doctor__c',label:'ドクター',type:'Lookup',ref:'Doctor__c'},
      {apiName:'Institution__c',label:'医療機関',type:'Lookup',ref:'Medical_Institution__c'},
      {apiName:'Visit_Date__c',label:'訪問日',type:'Date',required:true},
      {apiName:'Purpose__c',label:'訪問目的',type:'Picklist',values:['新規挨拶','genmine TOP紹介','検査結果報告','勉強会案内','フォローアップ','契約協議','トラブル対応']},
      {apiName:'Result__c',label:'訪問結果',type:'Picklist',values:['良好','継続検討','保留','次回アポ取得','不在']},
      {apiName:'Duration__c',label:'面談時間(分)',type:'Number'},
      {apiName:'Materials__c',label:'使用資材',type:'Text'},
      {apiName:'Next_Action__c',label:'ネクストアクション',type:'Text'},
      {apiName:'Detail__c',label:'詳細メモ',type:'LongTextArea'},
      {apiName:'Next_Visit_Date__c',label:'次回訪問予定日',type:'Date'},
      {apiName:'Checkin_Latitude__c',label:'チェックイン緯度',type:'Number'},
      {apiName:'Checkin_Longitude__c',label:'チェックイン経度',type:'Number'},
      {apiName:'Checkin_Time__c',label:'チェックイン時刻',type:'DateTime'},
      {apiName:'Location_Accuracy__c',label:'位置精度(m)',type:'Number'},
      {apiName:'OwnerId',label:'担当MR',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Doctor__c','Institution__c','Visit_Date__c','Purpose__c','Result__c'],
    statusField:'Result__c', statusMap:{良好:'s-green',継続検討:'s-blue',保留:'s-orange',次回アポ取得:'s-teal',不在:'s-gray'}
  },
  {
    apiName:'Seminar__c', label:'勉強会', icon:'📚', category:'custom',
    fields:[
      {apiName:'Name',label:'勉強会名',type:'Text',required:true},
      {apiName:'Format__c',label:'形式',type:'Picklist',values:['院内勉強会','Web講演会','地域セミナー','学術講演会','ハンズオン','ランチョンセミナー','ハイブリッド']},
      {apiName:'Speaker__c',label:'講師',type:'Lookup',ref:'Doctor__c'},
      {apiName:'Date__c',label:'開催日',type:'Date'},
      {apiName:'Time__c',label:'開催時間',type:'Text'},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['企画中','講師調整中','集客中','準備完了','開催済','フォロー中','完了']},
      {apiName:'Venue__c',label:'会場',type:'Text'},
      {apiName:'Venue_Address__c',label:'会場住所',type:'Text'},
      {apiName:'Latitude__c',label:'緯度',type:'Number'},
      {apiName:'Longitude__c',label:'経度',type:'Number'},
      {apiName:'Capacity__c',label:'定員',type:'Number'},
      {apiName:'Attendees__c',label:'参加者数',type:'Number'},
      {apiName:'Budget__c',label:'予算',type:'Currency'},
      {apiName:'Satisfaction__c',label:'満足度',type:'Percent'},
      {apiName:'Description__c',label:'内容・概要',type:'LongTextArea'},
      {apiName:'OwnerId',label:'担当者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Format__c','Speaker__c','Date__c','Status__c','Venue__c','Attendees__c'],
    statusField:'Status__c', statusMap:{企画中:'s-gray',講師調整中:'s-blue',集客中:'s-orange',準備完了:'s-teal',開催済:'s-green',フォロー中:'s-purple',完了:'s-green'}
  },
  {
    apiName:'Seminar_Attendee__c', label:'セミナー参加者', icon:'🙋', category:'custom',
    fields:[
      {apiName:'Name',label:'参加者名',type:'Text',required:true},
      {apiName:'Seminar__c',label:'セミナー',type:'Lookup',ref:'Seminar__c'},
      {apiName:'Doctor__c',label:'ドクター',type:'Lookup',ref:'Doctor__c'},
      {apiName:'Institution__c',label:'所属施設',type:'Lookup',ref:'Medical_Institution__c'},
      {apiName:'Email__c',label:'メール',type:'Email'},
      {apiName:'Registration_Date__c',label:'登録日',type:'Date'},
      {apiName:'Attendance_Status__c',label:'出席状況',type:'Picklist',values:['登録済','参加確定','参加','欠席','キャンセル']},
      {apiName:'Bento_Required__c',label:'弁当要否',type:'Checkbox'},
      {apiName:'Note__c',label:'備考',type:'LongTextArea'}
    ],
    listColumns:['Name','Seminar__c','Institution__c','Attendance_Status__c','Bento_Required__c','Registration_Date__c'],
    statusField:'Attendance_Status__c', statusMap:{登録済:'s-blue',参加確定:'s-teal',参加:'s-green',欠席:'s-red',キャンセル:'s-gray'}
  },
  {
    apiName:'Bento_Order__c', label:'弁当手配', icon:'🍱', category:'custom',
    fields:[
      {apiName:'Name',label:'手配名',type:'Text',required:true},
      {apiName:'Seminar__c',label:'関連セミナー',type:'Lookup',ref:'Seminar__c'},
      {apiName:'Order_Date__c',label:'注文日',type:'Date'},
      {apiName:'Delivery_Date__c',label:'配達日',type:'Date'},
      {apiName:'Delivery_Time__c',label:'配達時間',type:'Text'},
      {apiName:'Vendor__c',label:'業者名',type:'Text'},
      {apiName:'Menu__c',label:'メニュー',type:'Text'},
      {apiName:'Quantity__c',label:'数量',type:'Number'},
      {apiName:'Unit_Price__c',label:'単価',type:'Currency'},
      {apiName:'Total__c',label:'合計金額',type:'Currency'},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['手配中','発注済','確定','配達済','キャンセル']},
      {apiName:'Note__c',label:'備考',type:'LongTextArea'}
    ],
    listColumns:['Name','Seminar__c','Vendor__c','Quantity__c','Total__c','Status__c','Delivery_Date__c'],
    statusField:'Status__c', statusMap:{手配中:'s-orange',発注済:'s-blue',確定:'s-teal',配達済:'s-green',キャンセル:'s-red'}
  },
  {
    apiName:'MA_Activity__c', label:'MA活動', icon:'🎤', category:'custom',
    fields:[
      {apiName:'Name',label:'活動名',type:'Text',required:true},
      {apiName:'Activity_Type__c',label:'活動種別',type:'Picklist',values:['学術講演','アドバイザリーボード','文献レビュー','KOL面談','学会ブース','メディカルライティング','トレーニング']},
      {apiName:'Doctor__c',label:'関連ドクター',type:'Lookup',ref:'Doctor__c'},
      {apiName:'Date__c',label:'実施日',type:'Date'},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['計画中','準備中','実施済','報告完了','中止']},
      {apiName:'Evidence_Level__c',label:'エビデンスレベル',type:'Picklist',values:['Level I','Level II','Level III','Level IV','N/A']},
      {apiName:'Compliance_Approved__c',label:'コンプライアンス承認',type:'Checkbox'},
      {apiName:'Budget__c',label:'予算',type:'Currency'},
      {apiName:'Outcome__c',label:'成果・所見',type:'LongTextArea'},
      {apiName:'OwnerId',label:'担当MSL',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Activity_Type__c','Doctor__c','Date__c','Status__c','Evidence_Level__c'],
    statusField:'Status__c', statusMap:{計画中:'s-gray',準備中:'s-blue',実施済:'s-green',報告完了:'s-teal',中止:'s-red'}
  },
  {
    apiName:'Specimen__c', label:'検体', icon:'🧪', category:'custom',
    fields:[
      {apiName:'Name',label:'検体ID',type:'Text',required:true},
      {apiName:'Patient_ID__c',label:'患者ID',type:'Text'},
      {apiName:'Institution__c',label:'医療機関',type:'Lookup',ref:'Medical_Institution__c'},
      {apiName:'Referring_Doctor__c',label:'依頼医',type:'Lookup',ref:'Doctor__c'},
      {apiName:'Cancer_Type__c',label:'がん種',type:'Picklist',values:['肺がん','乳がん','大腸がん','胃がん','膵臓がん','血液がん','希少がん','小児がん']},
      {apiName:'Specimen_Type__c',label:'検体種別',type:'Picklist',values:['FFPE組織','新鮮凍結','リキッドバイオプシー','骨髄','細胞診']},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['受領待ち','受領済','QC中','解析中','レポート作成','レビュー中','完了','不適格']},
      {apiName:'Received_Date__c',label:'受領日',type:'Date'},
      {apiName:'Analysis_Panel__c',label:'解析パネル',type:'Picklist',values:['genmine TOP']},
      {apiName:'QC_Status__c',label:'QC結果',type:'Picklist',values:['合格','条件付合格','不合格','未実施']},
      {apiName:'Review_Status__c',label:'レビュー状況',type:'Picklist',values:['未レビュー','東大レビュー中','USレビュー中','レビュー完了']},
      {apiName:'TAT_Days__c',label:'TAT(日)',type:'Number'},
      {apiName:'Lab__c',label:'解析ラボ',type:'Lookup',ref:'Lab__c'},
      {apiName:'Report_Date__c',label:'レポート発行日',type:'Date'}
    ],
    listColumns:['Name','Patient_ID__c','Institution__c','Cancer_Type__c','Status__c','Review_Status__c','TAT_Days__c'],
    statusField:'Status__c', statusMap:{受領待ち:'s-gray',受領済:'s-blue',QC中:'s-orange',解析中:'s-purple',レポート作成:'s-teal',レビュー中:'s-yellow',完了:'s-green',不適格:'s-red'}
  },
  {
    apiName:'Testing_Order__c', label:'検査オーダー', icon:'📋', category:'custom',
    fields:[
      {apiName:'Name',label:'オーダー番号',type:'AutoNumber',format:'TO-{00000}'},
      {apiName:'Specimen__c',label:'検体',type:'Lookup',ref:'Specimen__c'},
      {apiName:'Doctor__c',label:'依頼医',type:'Lookup',ref:'Doctor__c'},
      {apiName:'Institution__c',label:'依頼施設',type:'Lookup',ref:'Medical_Institution__c'},
      {apiName:'Order_Date__c',label:'依頼日',type:'Date',required:true},
      {apiName:'Panel__c',label:'検査パネル',type:'Picklist',values:['genmine TOP']},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['受付','検体待ち','検査中','レビュー中','レポート作成','完了','キャンセル']},
      {apiName:'Priority__c',label:'優先度',type:'Picklist',values:['通常','緊急']},
      {apiName:'Reviewer__c',label:'レビュー担当',type:'Lookup',ref:'User'},
      {apiName:'US_Review_Status__c',label:'US Tempusレビュー',type:'Picklist',values:['未送信','US審査中','US承認','US差戻し']},
      {apiName:'Report_Date__c',label:'レポート発行日',type:'Date'},
      {apiName:'TAT_Days__c',label:'TAT(日)',type:'Number'},
      {apiName:'Note__c',label:'備考',type:'LongTextArea'},
      {apiName:'OwnerId',label:'担当者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Doctor__c','Institution__c','Order_Date__c','Status__c','US_Review_Status__c','TAT_Days__c'],
    statusField:'Status__c', statusMap:{受付:'s-gray',検体待ち:'s-blue',検査中:'s-purple',レビュー中:'s-orange',レポート作成:'s-teal',完了:'s-green',キャンセル:'s-red'}
  },
  {
    apiName:'Lab__c', label:'ラボ', icon:'⚗️', category:'custom',
    fields:[
      {apiName:'Name',label:'ラボ名',type:'Text',required:true},
      {apiName:'Lab_Type__c',label:'ラボ種別',type:'Picklist',values:['自社ラボ','委託ラボ','大学提携','海外ラボ']},
      {apiName:'Location__c',label:'所在地',type:'Text'},
      {apiName:'Assay_Capability__c',label:'アッセイ対応',type:'Text'},
      {apiName:'Certification__c',label:'認証',type:'Picklist',values:['CAP','CLIA','ISO15189','衛生検査所']},
      {apiName:'Operation_Status__c',label:'稼働状況',type:'Picklist',values:['稼働中','メンテナンス中','停止','立ち上げ中']},
      {apiName:'Monthly_Capacity__c',label:'月間キャパシティ',type:'Number'},
      {apiName:'Current_Load__c',label:'現在稼働数',type:'Number'},
      {apiName:'Utilization_Rate__c',label:'稼働率(%)',type:'Percent'}
    ],
    listColumns:['Name','Lab_Type__c','Location__c','Certification__c','Operation_Status__c','Utilization_Rate__c'],
    statusField:'Operation_Status__c', statusMap:{稼働中:'s-green',メンテナンス中:'s-orange',停止:'s-red',立ち上げ中:'s-blue'}
  },
  {
    apiName:'Genomic_Project__c', label:'ゲノム案件', icon:'🧬', category:'custom',
    fields:[
      {apiName:'Name',label:'案件名',type:'Text',required:true},
      {apiName:'Institution__c',label:'医療機関',type:'Lookup',ref:'Medical_Institution__c'},
      {apiName:'Cancer_Type__c',label:'がん種',type:'Picklist',values:['肺がん','乳がん','大腸がん','胃がん','膵臓がん','血液がん','希少がん','小児がん','複数']},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['計画中','IRB審査中','検体収集中','解析中','レポート作成','完了','中止']},
      {apiName:'Sample_Count__c',label:'検体数',type:'Number'},
      {apiName:'Start_Date__c',label:'開始日',type:'Date'},
      {apiName:'Expected_End__c',label:'完了予定日',type:'Date'},
      {apiName:'Budget__c',label:'予算',type:'Currency'},
      {apiName:'TAT_Days__c',label:'TAT(日)',type:'Number'},
      {apiName:'PI_Name__c',label:'PI名',type:'Text'},
      {apiName:'OwnerId',label:'担当者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Institution__c','Cancer_Type__c','Status__c','Sample_Count__c','Expected_End__c'],
    statusField:'Status__c', statusMap:{計画中:'s-gray',IRB審査中:'s-orange',検体収集中:'s-blue',解析中:'s-purple',レポート作成:'s-teal',完了:'s-green',中止:'s-red'},
    kanbanField:'Status__c'
  },
  {
    apiName:'PMDA_Submission__c', label:'PMDA申請', icon:'🏛️', category:'custom',
    fields:[
      {apiName:'Name',label:'申請名',type:'Text',required:true},
      {apiName:'Product__c',label:'対象品目',type:'Text'},
      {apiName:'Submission_Type__c',label:'申請種別',type:'Picklist',values:['新規承認申請','一部変更承認申請','軽微変更届','再審査申請']},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['準備中','申請済','審査中','照会対応中','承認済','不承認']},
      {apiName:'Submission_Date__c',label:'申請日',type:'Date'},
      {apiName:'Expected_Approval__c',label:'承認予定日',type:'Date'},
      {apiName:'PMDA_Contact__c',label:'PMDA担当者',type:'Text'},
      {apiName:'Inquiry_Count__c',label:'照会事項数',type:'Number'},
      {apiName:'Inquiry_Resolved__c',label:'回答済照会数',type:'Number'},
      {apiName:'Reviewer__c',label:'社内担当者',type:'Lookup',ref:'User'},
      {apiName:'Note__c',label:'備考',type:'LongTextArea'}
    ],
    listColumns:['Name','Submission_Type__c','Status__c','Submission_Date__c','Expected_Approval__c','Inquiry_Count__c'],
    statusField:'Status__c', statusMap:{準備中:'s-gray',申請済:'s-blue',審査中:'s-orange',照会対応中:'s-red',承認済:'s-green',不承認:'s-red'}
  },
  {
    apiName:'Joint_Research__c', label:'共同研究', icon:'🔬', category:'custom',
    fields:[
      {apiName:'Name',label:'研究テーマ',type:'Text',required:true},
      {apiName:'Partner__c',label:'共同研究先',type:'Text'},
      {apiName:'PI__c',label:'PI',type:'Lookup',ref:'Doctor__c'},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['企画中','IRB申請中','実施中','論文執筆中','完了','中止']},
      {apiName:'Start_Date__c',label:'開始日',type:'Date'},
      {apiName:'End_Date__c',label:'終了予定日',type:'Date'},
      {apiName:'Budget__c',label:'予算',type:'Currency'},
      {apiName:'IRB_Approved__c',label:'IRB承認',type:'Checkbox'},
      {apiName:'Publication_Plan__c',label:'論文投稿先',type:'Text'},
      {apiName:'Description__c',label:'概要',type:'LongTextArea'}
    ],
    listColumns:['Name','Partner__c','PI__c','Status__c','Start_Date__c','Budget__c'],
    statusField:'Status__c', statusMap:{企画中:'s-gray',IRB申請中:'s-orange',実施中:'s-blue',論文執筆中:'s-purple',完了:'s-green',中止:'s-red'}
  },
  {
    apiName:'Daily_Report__c', label:'日報', icon:'📝', category:'custom',
    fields:[
      {apiName:'Name',label:'日報番号',type:'AutoNumber',format:'DR-{0000}'},
      {apiName:'Report_Date__c',label:'日付',type:'Date',required:true},
      {apiName:'Report_Type__c',label:'種別',type:'Picklist',values:['MR日報','MSL日報','ラボ日報','管理職日報']},
      {apiName:'Visit_Summary__c',label:'訪問件数',type:'Number'},
      {apiName:'Key_Activities__c',label:'本日の活動内容',type:'LongTextArea'},
      {apiName:'Key_Findings__c',label:'気づき・重要情報',type:'LongTextArea'},
      {apiName:'Issues__c',label:'課題・懸念事項',type:'LongTextArea'},
      {apiName:'Tomorrow_Plan__c',label:'明日の予定',type:'LongTextArea'},
      {apiName:'Approval_Status__c',label:'承認ステータス',type:'Picklist',values:['下書き','提出済','承認済','差戻し']},
      {apiName:'Approved_By__c',label:'承認者',type:'Lookup',ref:'User'},
      {apiName:'Approval_Date__c',label:'承認日',type:'Date'},
      {apiName:'Approval_Comment__c',label:'承認コメント',type:'LongTextArea'},
      {apiName:'OwnerId',label:'報告者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Report_Date__c','Report_Type__c','Visit_Summary__c','Approval_Status__c','OwnerId'],
    statusField:'Approval_Status__c', statusMap:{下書き:'s-gray',提出済:'s-blue',承認済:'s-green',差戻し:'s-red'}
  },
  {
    apiName:'Approval_Request__c', label:'承認申請', icon:'✅', category:'custom',
    fields:[
      {apiName:'Name',label:'申請名',type:'Text',required:true},
      {apiName:'Request_Type__c',label:'申請種別',type:'Picklist',values:['日報承認','勉強会予算','MA活動','製薬商談','経費精算','出張申請','コンプライアンス']},
      {apiName:'Related_Object__c',label:'関連オブジェクト',type:'Text'},
      {apiName:'Related_Record_Id__c',label:'関連レコードID',type:'Text'},
      {apiName:'Amount__c',label:'金額',type:'Currency'},
      {apiName:'Description__c',label:'申請内容',type:'LongTextArea'},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['申請中','承認待ち','承認済','差戻し','却下','取下げ']},
      {apiName:'Priority__c',label:'優先度',type:'Picklist',values:['高','中','低']},
      {apiName:'Requested_By__c',label:'申請者',type:'Lookup',ref:'User'},
      {apiName:'Approver__c',label:'承認者',type:'Lookup',ref:'User'},
      {apiName:'Submitted_Date__c',label:'申請日',type:'Date'},
      {apiName:'Approved_Date__c',label:'処理日',type:'Date'},
      {apiName:'Approver_Comment__c',label:'承認者コメント',type:'LongTextArea'}
    ],
    listColumns:['Name','Request_Type__c','Status__c','Priority__c','Requested_By__c','Approver__c','Submitted_Date__c'],
    statusField:'Status__c', statusMap:{申請中:'s-blue',承認待ち:'s-orange',承認済:'s-green',差戻し:'s-red',却下:'s-red',取下げ:'s-gray'}
  },
  {
    apiName:'Competitive_Intel__c', label:'競合情報', icon:'🔍', category:'custom',
    fields:[
      {apiName:'Name',label:'情報タイトル',type:'Text',required:true},
      {apiName:'Competitor__c',label:'競合',type:'Picklist',values:['FoundationOne CDx（中外製薬）','NCC オンコパネル','Guardant360','Tempus xT（米国版）','ジェノタイピスト','その他']},
      {apiName:'Intel_Type__c',label:'情報種別',type:'Picklist',values:['製品情報','価格情報','採用動向','学会発表','臨床試験','規制動向','人事異動']},
      {apiName:'Source__c',label:'情報源',type:'Text'},
      {apiName:'Date__c',label:'日付',type:'Date'},
      {apiName:'Summary__c',label:'概要',type:'LongTextArea'},
      {apiName:'Impact__c',label:'影響度',type:'Picklist',values:['高','中','低']},
      {apiName:'Action_Required__c',label:'要アクション',type:'Text'},
      {apiName:'OwnerId',label:'報告者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Competitor__c','Intel_Type__c','Date__c','Impact__c','Source__c'],
    statusField:'Impact__c', statusMap:{高:'s-red',中:'s-orange',低:'s-blue'}
  },
  {
    apiName:'Expense_Report__c', label:'経費精算', icon:'💴', category:'custom',
    fields:[
      {apiName:'Name',label:'精算番号',type:'AutoNumber',format:'EX-{0000}'},
      {apiName:'Report_Date__c',label:'精算日',type:'Date',required:true},
      {apiName:'Expense_Type__c',label:'経費種別',type:'Picklist',values:['交通費','宿泊費','会議費','接待交際費','勉強会経費','学会参加費','消耗品','その他']},
      {apiName:'Amount__c',label:'金額',type:'Currency',required:true},
      {apiName:'Description__c',label:'内容',type:'Text'},
      {apiName:'Related_Visit__c',label:'関連訪問',type:'Lookup',ref:'Visit_Record__c'},
      {apiName:'Related_Seminar__c',label:'関連勉強会',type:'Lookup',ref:'Seminar__c'},
      {apiName:'Receipt_Attached__c',label:'領収書添付',type:'Checkbox'},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['下書き','申請中','承認済','差戻し','支払済']},
      {apiName:'OwnerId',label:'申請者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Report_Date__c','Expense_Type__c','Amount__c','Description__c','Status__c'],
    statusField:'Status__c', statusMap:{下書き:'s-gray',申請中:'s-blue',承認済:'s-green',差戻し:'s-red',支払済:'s-teal'}
  },
  // 巡回目標管理
  {
    apiName:'Visit_Target__c',label:'巡回目標',icon:'🎯',
    fields:[
      {apiName:'Name',label:'目標名',type:'Text',required:true},
      {apiName:'Target_Month__c',label:'対象月',type:'Text'},
      {apiName:'OwnerId',label:'担当者',type:'Lookup',ref:'User'},
      {apiName:'Doctor__c',label:'対象ドクター',type:'Lookup',ref:'Doctor__c'},
      {apiName:'Institution__c',label:'対象施設',type:'Lookup',ref:'Medical_Institution__c'},
      {apiName:'Target_Visits__c',label:'目標訪問回数',type:'Number'},
      {apiName:'Actual_Visits__c',label:'実績訪問回数',type:'Number'},
      {apiName:'Visit_Purpose__c',label:'訪問目的',type:'Picklist',values:['定期訪問','新規開拓','フォローアップ','情報提供','説明会','検体回収','その他']},
      {apiName:'Priority__c',label:'優先度',type:'Picklist',values:['A（最優先）','B（重要）','C（通常）','D（低）']},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['未着手','進行中','達成','未達','中止']},
      {apiName:'Achievement_Rate__c',label:'達成率',type:'Percent'},
      {apiName:'Last_Visit_Date__c',label:'最終訪問日',type:'Date'},
      {apiName:'Next_Visit_Date__c',label:'次回訪問予定',type:'Date'},
      {apiName:'Note__c',label:'メモ',type:'LongTextArea'}
    ],
    listColumns:['Name','Target_Month__c','OwnerId','Doctor__c','Institution__c','Target_Visits__c','Actual_Visits__c','Priority__c','Status__c'],
    statusField:'Status__c', statusMap:{未着手:'s-gray',進行中:'s-blue',達成:'s-green',未達:'s-red',中止:'s-orange'}
  },
  // ワークフローインスタンス
  {
    apiName:'Workflow_Instance__c',label:'ワークフロー',icon:'⚙️',
    fields:[
      {apiName:'Name',label:'ワークフロー名',type:'Text',required:true},
      {apiName:'Workflow_Type__c',label:'種別',type:'Picklist',values:['引き継ぎ','検査オーダー','経費承認','勉強会開催','商談承認','PMDA申請']},
      {apiName:'Status__c',label:'ステータス',type:'Picklist',values:['未開始','進行中','承認待ち','完了','中止','差戻し']},
      {apiName:'Current_Step__c',label:'現在ステップ',type:'Number'},
      {apiName:'Total_Steps__c',label:'総ステップ数',type:'Number'},
      {apiName:'Priority__c',label:'優先度',type:'Picklist',values:['緊急','高','中','低']},
      {apiName:'Requested_By__c',label:'起票者',type:'Lookup',ref:'User'},
      {apiName:'Current_Assignee__c',label:'現在担当',type:'Lookup',ref:'User'},
      {apiName:'Start_Date__c',label:'開始日',type:'Date'},
      {apiName:'Due_Date__c',label:'期限',type:'Date'},
      {apiName:'Completed_Date__c',label:'完了日',type:'Date'},
      {apiName:'Related_Record__c',label:'関連レコード',type:'Text'},
      {apiName:'Description__c',label:'説明',type:'LongTextArea'},
      {apiName:'OwnerId',label:'責任者',type:'Lookup',ref:'User'}
    ],
    listColumns:['Name','Workflow_Type__c','Status__c','Current_Step__c','Total_Steps__c','Priority__c','Current_Assignee__c','Due_Date__c'],
    statusField:'Status__c', statusMap:{未開始:'s-gray',進行中:'s-blue',承認待ち:'s-orange',完了:'s-green',中止:'s-red',差戻し:'s-red'}
  }
];

// --- Users (Team Members) ---
const USERS = [
  // Sales
  {id:'U001',name:'田中太郎',role:'営業マネージャー',team:'Sales',email:'tanaka@genmine.co.jp',photo:'🧑‍💼'},
  {id:'U002',name:'佐藤花子',role:'MR',team:'Sales',email:'sato@genmine.co.jp',photo:'👩‍💼'},
  {id:'U003',name:'鈴木一郎',role:'MR',team:'Sales',email:'suzuki@genmine.co.jp',photo:'👨‍💼'},
  // MA
  {id:'U004',name:'高橋美咲',role:'MSL',team:'MA',email:'takahashi@genmine.co.jp',photo:'👩‍🔬'},
  {id:'U005',name:'渡辺健太',role:'MSL',team:'MA',email:'watanabe@genmine.co.jp',photo:'👨‍🔬'},
  // Lab / 遺伝子検査
  {id:'U006',name:'伊藤直樹',role:'ラボマネージャー',team:'Lab',email:'ito@genmine.co.jp',photo:'🧑‍🔬'},
  {id:'U009',name:'藤田優子',role:'遺伝子検査スタッフ',team:'Lab',email:'fujita@genmine.co.jp',photo:'👩‍🔬'},
  {id:'U010',name:'岡田真一',role:'遺伝子検査スタッフ',team:'Lab',email:'okada@genmine.co.jp',photo:'👨‍🔬'},
  // Research / 病理
  {id:'U011',name:'油谷不二夫',role:'研究主任（東大）',team:'Research',email:'aburatani@m.u-tokyo.ac.jp',photo:'👨‍🏫'},
  {id:'U012',name:'吉田研究員',role:'研究員（東大）',team:'Research',email:'yoshida@m.u-tokyo.ac.jp',photo:'🧑‍🔬'},
  // Executive
  {id:'U007',name:'山本恵理',role:'事業部長',team:'Executive',email:'yamamoto@genmine.co.jp',photo:'👩‍💻'},
  {id:'U008',name:'中村大輔',role:'代表取締役',team:'Executive',email:'nakamura@genmine.co.jp',photo:'🤵'},
  // External
  {id:'U013',name:'Tempus US Reviewer',role:'External Reviewer',team:'External',email:'reviewer@tempus.com',photo:'🌐'}
];

// --- Sample Data ---
const SAMPLE_DATA = {
  Account:[
    {id:'A001',Name:'第一三共株式会社',Industry:'製薬',Type:'顧客',Phone:'03-6225-1111',BillingState:'東京都',AnnualRevenue:1200000000000,OwnerId:'U001'},
    {id:'A002',Name:'中外製薬株式会社',Industry:'製薬',Type:'顧客',Phone:'03-3273-0001',BillingState:'東京都',AnnualRevenue:999000000000,OwnerId:'U001'},
    {id:'A003',Name:'エーザイ株式会社',Industry:'製薬',Type:'見込客',Phone:'03-3817-5120',BillingState:'東京都',AnnualRevenue:746000000000,OwnerId:'U002'},
    {id:'A004',Name:'武田薬品工業',Industry:'製薬',Type:'顧客',Phone:'06-6204-2111',BillingState:'大阪府',AnnualRevenue:4027000000000,OwnerId:'U001'},
    {id:'A005',Name:'アステラス製薬',Industry:'製薬',Type:'見込客',Phone:'03-3244-3000',BillingState:'東京都',AnnualRevenue:1518000000000,OwnerId:'U003'},
    {id:'A006',Name:'小野薬品工業',Industry:'製薬',Type:'パートナー',Phone:'06-6263-5670',BillingState:'大阪府',AnnualRevenue:429000000000,OwnerId:'U002'}
  ],
  Contact:[
    {id:'C001',LastName:'山田',FirstName:'健一',AccountId:'A001',Title:'オンコロジー事業部長',Email:'yamada@daiichisankyo.co.jp',Phone:'03-6225-1200'},
    {id:'C002',LastName:'石川',FirstName:'美穂',AccountId:'A002',Title:'研究開発本部 部長',Email:'ishikawa@chugai-pharm.co.jp',Phone:'03-3273-0100'},
    {id:'C003',LastName:'森',FirstName:'大輔',AccountId:'A003',Title:'事業開発部 マネージャー',Email:'mori@eisai.co.jp',Phone:'03-3817-5200'},
    {id:'C004',LastName:'加藤',FirstName:'由美',AccountId:'A004',Title:'オンコロジー R&D ヘッド',Email:'kato@takeda.co.jp',Phone:'06-6204-2200'}
  ],
  Lead:[
    {id:'L001',LastName:'松本',FirstName:'幸太',Company:'大塚製薬',Title:'研究企画部',Status:'新規',LeadSource:'展示会',Rating:'Hot',OwnerId:'U002'},
    {id:'L002',LastName:'井上',FirstName:'直美',Company:'協和キリン',Title:'開発本部',Status:'連絡中',LeadSource:'セミナー',Rating:'Warm',OwnerId:'U003'},
    {id:'L003',LastName:'木村',FirstName:'拓也',Company:'参天製薬',Title:'新規事業',Status:'適格',LeadSource:'Web',Rating:'Hot',OwnerId:'U002'}
  ],
  Opportunity:[
    {id:'O001',Name:'第一三共 genmine TOP導入',AccountId:'A001',StageName:'交渉',Amount:120000000,CloseDate:'2026-03-31',Probability:75,OwnerId:'U001'},
    {id:'O002',Name:'中外製薬 データライセンス',AccountId:'A002',StageName:'提案',Amount:85000000,CloseDate:'2026-04-15',Probability:50,OwnerId:'U002'},
    {id:'O003',Name:'武田 共同研究契約',AccountId:'A004',StageName:'ニーズ把握',Amount:200000000,CloseDate:'2026-06-30',Probability:30,OwnerId:'U001'},
    {id:'O004',Name:'小野薬品 genmine TOP年間契約更新',AccountId:'A006',StageName:'受注',Amount:60000000,CloseDate:'2026-02-28',Probability:100,OwnerId:'U002'}
  ],
  Case:[
    {id:'CS001',Subject:'genmine TOP レポート遅延',AccountId:'A001',Status:'進行中',Priority:'高',Origin:'電話',OwnerId:'U006'},
    {id:'CS002',Subject:'データフォーマット変更依頼',AccountId:'A002',Status:'新規',Priority:'中',Origin:'メール',OwnerId:'U006'}
  ],
  Campaign:[
    {id:'CP001',Name:'JSMO 2026 ブース出展',Type:'展示会',Status:'計画中',StartDate:'2026-03-06',EndDate:'2026-03-08',BudgetedCost:5000000,NumberOfLeads:0},
    {id:'CP002',Name:'Q1 genmine TOP Webセミナー',Type:'Webセミナー',Status:'進行中',StartDate:'2026-01-15',EndDate:'2026-03-31',BudgetedCost:1500000,NumberOfLeads:32}
  ],
  Task:[
    {id:'T001',Subject:'第一三共 契約書最終確認',Status:'進行中',Priority:'高',ActivityDate:'2026-02-20',OwnerId:'U001'},
    {id:'T002',Subject:'JSMO ブース設営手配',Status:'未着手',Priority:'中',ActivityDate:'2026-02-25',OwnerId:'U004'},
    {id:'T003',Subject:'月次KPIレポート作成',Status:'未着手',Priority:'中',ActivityDate:'2026-02-28',OwnerId:'U007'},
    {id:'T004',Subject:'中外製薬 提案資料作成',Status:'進行中',Priority:'高',ActivityDate:'2026-02-19',OwnerId:'U002'},
    {id:'T005',Subject:'検体QCレビュー(SP-003)',Status:'進行中',Priority:'高',ActivityDate:'2026-02-22',OwnerId:'U009'}
  ],
  Event:[
    {id:'E001',Subject:'第一三共 最終交渉会議',StartDateTime:'2026-02-20 14:00',EndDateTime:'2026-02-20 16:00',Location:'第一三共本社',OwnerId:'U001'},
    {id:'E002',Subject:'東大病院 訪問',StartDateTime:'2026-02-21 10:00',EndDateTime:'2026-02-21 12:00',Location:'東京大学医学部附属病院',OwnerId:'U002'},
    {id:'E003',Subject:'週次チームミーティング',StartDateTime:'2026-02-24 09:00',EndDateTime:'2026-02-24 10:00',Location:'オンライン',OwnerId:'U007'},
    {id:'E004',Subject:'中外製薬 データレビュー',StartDateTime:'2026-02-25 15:00',EndDateTime:'2026-02-25 17:00',Location:'中外製薬 本社',OwnerId:'U002'},
    {id:'E005',Subject:'genmine TOP 勉強会（がんセンター）',StartDateTime:'2026-02-27 13:00',EndDateTime:'2026-02-27 17:00',Location:'国立がん研究センター',OwnerId:'U004'},
    {id:'E006',Subject:'油谷先生チーム 検体レビュー会議',StartDateTime:'2026-02-26 10:00',EndDateTime:'2026-02-26 12:00',Location:'東京大学 医科学研究所',OwnerId:'U011'}
  ],
  Product2:[
    {id:'P001',Name:'genmine TOP',ProductCode:'GMT-001',Family:'遺伝子パネル検査',Description:'324遺伝子をカバーする包括的がんゲノムプロファイリング(CGP)検査。固形がん患者の治療方針決定を支援する。',UnitPrice:560000,IsActive:true},
    {id:'P002',Name:'Tempus Lens',ProductCode:'TL-001',Family:'AIソリューション',Description:'AI病理画像解析プラットフォーム。H&E染色画像からバイオマーカー予測を実施。',UnitPrice:30000000,IsActive:true},
    {id:'P003',Name:'Tempus Explore',ProductCode:'TE-001',Family:'データプラットフォーム',Description:'匿名化された臨床ゲノムデータベース。リアルワールドデータを活用した研究開発支援。',UnitPrice:50000000,IsActive:true},
    {id:'P004',Name:'Tempus データライセンス（年間）',ProductCode:'TD-001',Family:'データプラットフォーム',Description:'Tempusの臨床ゲノムデータへの年間アクセスライセンス。製薬企業向け。',UnitPrice:80000000,IsActive:true}
  ],
  Medical_Institution__c:[
    {id:'MI001',Name:'東京大学医学部附属病院',Facility_Type__c:'大学病院',Adapter_Status__c:'導入完了',Contact_Person__c:'佐藤教授',Prefecture__c:'東京都',Address__c:'東京都文京区本郷7-3-1',Phone__c:'03-3815-5411',Bed_Count__c:1217,Latitude__c:35.7128,Longitude__c:139.7636},
    {id:'MI002',Name:'国立がん研究センター中央病院',Facility_Type__c:'がん拠点病院',Adapter_Status__c:'導入完了',Contact_Person__c:'佐々木部長',Prefecture__c:'東京都',Address__c:'東京都中央区築地5-1-1',Phone__c:'03-3542-2511',Bed_Count__c:578,Latitude__c:35.6639,Longitude__c:139.7702},
    {id:'MI003',Name:'大阪大学医学部附属病院',Facility_Type__c:'大学病院',Adapter_Status__c:'導入中',Contact_Person__c:'田村准教授',Prefecture__c:'大阪府',Address__c:'大阪府吹田市山田丘2-15',Phone__c:'06-6879-5111',Bed_Count__c:1086,Latitude__c:34.8217,Longitude__c:135.5244},
    {id:'MI004',Name:'慶應義塾大学病院',Facility_Type__c:'大学病院',Adapter_Status__c:'導入完了',Contact_Person__c:'木村教授',Prefecture__c:'東京都',Address__c:'東京都新宿区信濃町35',Phone__c:'03-3353-1211',Bed_Count__c:960,Latitude__c:35.6813,Longitude__c:139.7178},
    {id:'MI005',Name:'名古屋大学医学部附属病院',Facility_Type__c:'大学病院',Adapter_Status__c:'導入検討中',Contact_Person__c:'中川教授',Prefecture__c:'愛知県',Address__c:'愛知県名古屋市昭和区鶴舞町65',Phone__c:'052-741-2111',Bed_Count__c:1035,Latitude__c:35.1570,Longitude__c:136.9232},
    {id:'MI006',Name:'九州大学病院',Facility_Type__c:'大学病院',Adapter_Status__c:'未導入',Contact_Person__c:'森本准教授',Prefecture__c:'福岡県',Address__c:'福岡県福岡市東区馬出3-1-1',Phone__c:'092-641-1151',Bed_Count__c:1275,Latitude__c:33.6268,Longitude__c:130.4250},
    {id:'MI007',Name:'北海道大学病院',Facility_Type__c:'大学病院',Adapter_Status__c:'未導入',Contact_Person__c:'長谷川教授',Prefecture__c:'北海道',Address__c:'北海道札幌市北区北14条西5',Phone__c:'011-716-1161',Bed_Count__c:944,Latitude__c:43.0790,Longitude__c:141.3414},
    {id:'MI008',Name:'がん研有明病院',Facility_Type__c:'がん拠点病院',Adapter_Status__c:'導入完了',Contact_Person__c:'大野部長',Prefecture__c:'東京都',Address__c:'東京都江東区有明3-8-31',Phone__c:'03-3520-0111',Bed_Count__c:686,Latitude__c:35.6359,Longitude__c:139.7922}
  ],
  Doctor__c:[
    {id:'D001',Name:'佐藤隆',Institution__c:'MI001',Department__c:'腫瘍内科',Title__c:'教授',Cancer_Type__c:'肺がん',Relationship_Level__c:'ファン（KOL）',Genomic_Interest__c:'高',Visit_Count__c:24,Last_Visit_Date__c:'2026-02-14',KOL_Score__c:95,OwnerId:'U002',
      Note__c:'東大腫瘍内科教授。肺がん分子標的治療の第一人者。日本肺癌学会理事、JSMO（日本臨床腫瘍学会）評議員。EGFR-TKI耐性研究で多数の論文を執筆（Nature Medicine, JCO等）。genmine TOPの臨床試験にPIとして参加、共同研究（JR001）を主導。院内エキスパートパネルの座長を務め、genmine TOPレポートの質の高さを評価。講演依頼は年間10件以上対応可能。影響力の大きいKOLであり、genmine TOPの普及に不可欠な存在。'},
    {id:'D002',Name:'田村美咲',Institution__c:'MI002',Department__c:'呼吸器科',Title__c:'准教授',Cancer_Type__c:'肺がん',Relationship_Level__c:'推進者',Genomic_Interest__c:'高',Visit_Count__c:18,Last_Visit_Date__c:'2026-02-12',KOL_Score__c:85,OwnerId:'U002',
      Note__c:'がんセンター中央病院 呼吸器科准教授。リキッドバイオプシー研究の新進気鋭の研究者。MRD検出研究（JR002）のPI。年間100例以上のNSCLC患者を担当し、積極的にgenmine TOPをオーダー。Osimertinib耐性後の治療戦略に強い関心があり、2/25の院内勉強会（SM002）で講演予定。がんセンターでのgenmine TOP標準化の推進役。学会発表も積極的で、ASCO 2026でのポスター発表を準備中。'},
    {id:'D003',Name:'中村大介',Institution__c:'MI003',Department__c:'消化器科',Title__c:'医長',Cancer_Type__c:'大腸がん',Relationship_Level__c:'関心あり',Genomic_Interest__c:'中',Visit_Count__c:8,Last_Visit_Date__c:'2026-02-10',KOL_Score__c:55,OwnerId:'U003',
      Note__c:'阪大消化器内科医長。大腸がんのRAS/BRAF変異解析とCGP検査の活用に関心。現在は阪大でFoundationOne CDxを主に使用しており、genmine TOPへの切り替えを検討中。PCR法との比較データに関心が高い。3/15のランチョンセミナー（SM005）での講演を前向きに検討中。大阪地区の消化器がんKOLネットワークへのアクセスが期待できるキーパーソン。阪大でのgenmine TOP導入が実現すれば、関西圏での普及に大きく寄与する。'},
    {id:'D004',Name:'木村健一',Institution__c:'MI004',Department__c:'血液内科',Title__c:'教授',Cancer_Type__c:'血液がん',Relationship_Level__c:'ファン（KOL）',Genomic_Interest__c:'高',Visit_Count__c:20,Last_Visit_Date__c:'2026-02-05',KOL_Score__c:90,OwnerId:'U004',
      Note__c:'慶應血液内科教授。AML/MDS領域のゲノム医療研究で国内トップクラス。日本血液学会評議員、ASH（米国血液学会）Active Member。慶應で年間約40例のAMLでgenmine TOPを活用。FLT3-ITD、NPM1、IDH1/2の同時検出によるリスク層別化に高い評価。アドバイザリーボード（MA002）にも参加済み。4/5の血液がん学術講演会（SM006）で特別講演を快諾。AI病理診断支援の共同研究（JR003）のPIとしても参画予定。PMDA申請（PM002 血液がん適応追加）のclinical advisorとしても支援。'},
    {id:'D005',Name:'小林正人',Institution__c:'MI001',Department__c:'外科',Title__c:'部長',Cancer_Type__c:'乳がん',Relationship_Level__c:'検討中',Genomic_Interest__c:'中',Visit_Count__c:6,Last_Visit_Date__c:'2026-02-07',KOL_Score__c:40,OwnerId:'U003',
      Note__c:'東大乳腺外科部長。乳がん手術年間200例以上の実績。トリプルネガティブ乳がん（TNBC）のBRCA1/2検査にgenmine TOPの活用を検討中。従来はBRACAnalysisで対応していたが、BRCA以外のHRD関連遺伝子（ATM, PALB2, RAD51C/D等）も同時検出できるCGPに関心。佐藤教授（D001）からの紹介で関係構築中。乳がんチームカンファレンスへの参加を検討してくれている。コンパニオン診断としてのgenmine TOP活用（PARP阻害薬適応判定）がポイント。'},
    {id:'D006',Name:'高橋恵理',Institution__c:'MI002',Department__c:'病理科',Title__c:'准教授',Cancer_Type__c:'肺がん',Relationship_Level__c:'推進者',Genomic_Interest__c:'高',Visit_Count__c:15,Last_Visit_Date__c:'2026-01-30',KOL_Score__c:80,OwnerId:'U004',
      Note__c:'がんセンター中央病院 病理科准教授。がんゲノム医療中核拠点病院の病理部門を統括。genmine TOPレポートの病理学的解釈について豊富な経験を持ち、エキスパートパネルの病理担当委員。C-CATへのデータ登録業務にも精通。SM003（リキッドバイオプシーハンズオンセミナー）にも参加し高い評価。検体のQC基準（FFPE検体の腫瘍含有率、核酸品質）についてgenmine社ラボチームとの連携も密。病理標本のデジタルスキャン（WSI）推進にも熱心で、Tempus Lensへの関心も高い。'},
    {id:'D007',Name:'渡辺聡',Institution__c:'MI005',Department__c:'腫瘍内科',Title__c:'教授',Cancer_Type__c:'膵臓がん',Relationship_Level__c:'初回面談済',Genomic_Interest__c:'中',Visit_Count__c:3,Last_Visit_Date__c:'2026-01-28',KOL_Score__c:30,OwnerId:'U003',
      Note__c:'名古屋大学腫瘍内科教授。膵臓がん化学療法の臨床研究を中心に活動。JCOG（日本臨床腫瘍研究グループ）膵がんグループのメンバー。膵臓がんでのCGP検査はまだ一般的ではないが、BRCA/PALB2変異によるPARP阻害薬適応やHRD statusに基づくプラチナ製剤感受性予測に関心。名大病院はgenmine未導入（導入検討中）のため、まずは膵臓がん領域でのCGP活用データ提供から関係構築を進める方針。名古屋地区の中部がんネットワークへのアクセスキーパーソン。'},
    {id:'D008',Name:'伊藤由美',Institution__c:'MI003',Department__c:'遺伝診療科',Title__c:'助教',Cancer_Type__c:'希少がん',Relationship_Level__c:'関心あり',Genomic_Interest__c:'高',Visit_Count__c:5,Last_Visit_Date__c:'2026-01-20',KOL_Score__c:45,OwnerId:'U005',
      Note__c:'阪大遺伝診療科助教。希少がん・原発不明がん（CUP）の遺伝子解析を専門とし、遺伝カウンセリングも担当。genmine TOPによるTOO（Tissue of Origin）推定とactionable mutation検出に強い関心。阪大で年間約15例の希少がんでCGP検査を実施。NTRK融合遺伝子によるラロトレクチニブ著効例を学会発表準備中。若手研究者だが希少がん領域では今後KOLになるポテンシャル。MA活動（MA004 症例検討会）でも連携予定。'},
    {id:'D009',Name:'山口太郎',Institution__c:'MI006',Department__c:'腫瘍内科',Title__c:'教授',Cancer_Type__c:'胃がん',Relationship_Level__c:'未接触',Genomic_Interest__c:'不明',Visit_Count__c:0,KOL_Score__c:0,OwnerId:'U003',
      Note__c:'九州大学腫瘍内科教授。胃がんの免疫療法・分子標的治療の臨床研究者。日本胃癌学会理事。九大病院はgenmine未導入。胃がんにおけるHER2過剰発現やMSI-H検出のCGP活用ポテンシャルは高いが、まだ未接触。九州地区はgenmine未開拓エリアであり、山口教授へのアプローチが九州圏での事業拡大の足がかりとなる。JSMO 2026（3月）のブース来訪を期待し、先にメールでコンタクトを試みる予定。'},
    {id:'D010',Name:'松田恵子',Institution__c:'MI004',Department__c:'婦人科',Title__c:'医員',Cancer_Type__c:'希少がん',Relationship_Level__c:'初回面談済',Genomic_Interest__c:'低',Visit_Count__c:1,Last_Visit_Date__c:'2025-12-15',KOL_Score__c:10,OwnerId:'U002',
      Note__c:'慶應婦人科医員。卵巣がん・子宮体がんの診療を担当。CGP検査には現時点では消極的で、「婦人科がんでは標準治療がまだ確立しており、CGPの追加的価値が見えにくい」との認識。ただしBRCA1/2変異によるPARP阻害薬適応判定にはneedがある。木村教授（D004）経由でのアプローチを検討中。優先度は低いが、婦人科領域は今後の成長領域として中期的に重要。'},
    {id:'D011',Name:'大野健太郎',Institution__c:'MI008',Department__c:'腫瘍内科',Title__c:'部長',Cancer_Type__c:'大腸がん',Relationship_Level__c:'推進者',Genomic_Interest__c:'高',Visit_Count__c:12,Last_Visit_Date__c:'2026-02-10',KOL_Score__c:75,OwnerId:'U002',
      Note__c:'がん研有明病院 腫瘍内科部長。大腸がん・消化器がんの分子標的治療に精通。がん研ではgenmine TOP導入完了済みで、月間8件のオーダーを15件に拡大予定。RAS/BRAF変異検出のPCR法からgenmine TOPへの一本化に前向き。MSI-H検出によるペムブロリズマブ適応判定にもCGPの有用性を実感。「FoundationOne CDxと比較してTATが短いのが臨床上助かる」との評価。直近10例中3例でactionable mutationを同定。がん研有明は症例数が多く、臨床データの蓄積に最適な施設。'},
    {id:'D012',Name:'油谷不二夫（東大）',Institution__c:'MI001',Department__c:'病理科',Title__c:'教授',Cancer_Type__c:'肺がん',Relationship_Level__c:'ファン（KOL）',Genomic_Interest__c:'高',Visit_Count__c:30,Last_Visit_Date__c:'2026-02-18',KOL_Score__c:98,OwnerId:'U004',
      Note__c:'東京大学 医科学研究所 ゲノム医科学分野教授。がんゲノム医療の日本における第一人者で、C-CAT（がんゲノム情報管理センター）設立にも貢献。genmine/Tempusの学術アドバイザーとして長年にわたり協力関係。東大でのgenmine TOPレビュー体制の構築を主導し、Tempus USとのdual review体制を確立。共同研究（JR001）のsenior author。3/20のセミナー（SM004）で基調講演「エキスパートパネル運営の実際と課題」を担当予定。社内トレーニング（MA005）でも講師を務め、MR/MSLのスキルアップに貢献。genmine TOPの品質と臨床的有用性を学術的観点から担保するキーパーソン。年間30回以上の訪問・接触があり、最も密な関係を築いている。'}
  ],
  Pharma_Opportunity__c:[
    {id:'PO001',Name:'第一三共 genmine TOP採用',Pharma_Company__c:'第一三共',Phase__c:'契約交渉',Service_Type__c:'genmine TOP 導入',Amount__c:180000000,Probability__c:80,Close_Date__c:'2026-03-31',
      Contact_Name__c:'山田健一',Contact_Title__c:'オンコロジー事業部長',Compliance_Check__c:true,
      Note__c:'第一三共のオンコロジー領域でのコンパニオン診断薬としてgenmine TOPを採用する大型案件。DS-8201（エンハーツ）のHER2低発現検出にCGPを活用したいとのニーズ。山田事業部長が推進者で、研究開発本部との合同評価を経て技術的要件はクリア。セキュリティ審査も完了し、現在は価格交渉と年間最低オーダー数（300件）の条件詰め段階。3月末の取締役会で最終承認予定。競合はFoundationOne CDx（中外製薬扱い）だが、TATの短さとコストメリットで優位に立っている。',
      OwnerId:'U001'},
    {id:'PO002',Name:'中外 受託解析契約',Pharma_Company__c:'中外製薬',Phase__c:'提案',Service_Type__c:'受託解析',Amount__c:120000000,Probability__c:45,Close_Date__c:'2026-05-31',
      Contact_Name__c:'石川美穂',Contact_Title__c:'研究開発本部 部長',
      Note__c:'中外製薬がロシュグループから開発中の抗体薬物複合体（ADC）の国内治験で、genmine TOPによるバイオマーカー解析の受託案件。対象はHER2変異/増幅を持つ固形がん患者のスクリーニング。年間500検体の受託解析を想定。石川部長が窓口だが、グローバルヘッドクォーター（バーゼル）の承認も必要なため、意思決定に時間がかかる。F1CDxとのhead-to-head比較データの提出を求められており、3月中に提案書を再提出予定。',
      OwnerId:'U002'},
    {id:'PO003',Name:'武田 共同研究',Pharma_Company__c:'武田薬品',Phase__c:'ヒアリング',Service_Type__c:'共同研究',Amount__c:250000000,Probability__c:25,Close_Date__c:'2026-07-31',
      Contact_Name__c:'加藤由美',Contact_Title__c:'オンコロジー R&D ヘッド',
      Note__c:'武田薬品のオンコロジー領域R&Dチームとの共同研究提案。TAK-788（mobocertinib後継）の開発において、EGFR exon20 insertion変異の網羅的検出にgenmine TOPを活用する研究。日本人集団でのEGFR exon20 ins変異プロファイルの大規模解析（1000例規模）を計画。加藤R&Dヘッドは「Tempusの米国データベースとの比較解析ができれば学術的価値が高い」と前向き。ただし、武田社内でのデータ共有ポリシーの確認と、知的財産権の帰属について法務部門の確認が必要。7月の社内投資委員会で審議予定。',
      OwnerId:'U001'},
    {id:'PO004',Name:'小野薬品 データライセンス更新',Pharma_Company__c:'小野薬品',Phase__c:'受注',Service_Type__c:'データライセンス',Amount__c:80000000,Probability__c:100,Close_Date__c:'2026-02-15',
      Contact_Name__c:'前田誠',Contact_Title__c:'創薬研究所 所長',Compliance_Check__c:true,
      Note__c:'小野薬品へのTempusデータライセンス年間契約の更新。オプジーボ（ニボルマブ）のリアルワールドエビデンス構築にTempus Exploreのデータベースを活用。昨年度は肺がん領域のTMB/PD-L1データを中心に利用。今年度はMSI-H/dMMRデータも追加スコープに。前田所長から「Tempusのデータは米国データが中心だが、日本人集団との比較ができるのが他にないバリュー」との評価。契約更新は2/15に署名済み、入金待ち。',
      OwnerId:'U002'},
    {id:'PO005',Name:'エーザイ genmine TOP検討',Pharma_Company__c:'エーザイ',Phase__c:'リード',Service_Type__c:'genmine TOP 導入',Amount__c:50000000,Probability__c:10,Close_Date__c:'2026-09-30',
      Contact_Name__c:'森大輔',Contact_Title__c:'事業開発部 マネージャー',
      Note__c:'エーザイの事業開発部からの引き合い。レンビマ（レンバチニブ）の肝細胞がん領域で、genmine TOPによるバイオマーカー探索に関心。森マネージャーは「肝がん領域でのCGP検査はまだ一般的ではないが、VEGF/FGF経路の変異プロファイルとレンビマの効果の相関を調べたい」とのこと。まだ初期検討段階で、まずは文献レビューとフィージビリティスタディの提案が必要。エーザイ社内でのゲノム医療戦略策定が先に進む必要があり、時間がかかる見通し。',
      OwnerId:'U003'},
    {id:'PO006',Name:'アステラス 受託解析',Pharma_Company__c:'アステラス',Phase__c:'提案',Service_Type__c:'受託解析',Amount__c:95000000,Probability__c:40,Close_Date__c:'2026-06-30',
      Contact_Name__c:'高木裕太',Contact_Title__c:'オンコロジー臨床開発部 マネージャー',
      Note__c:'アステラス製薬の前立腺がん治療薬（エンザルタミド後継）Phase III治験におけるCGPスクリーニング受託案件。AR-V7スプライスバリアントの検出にリキッドバイオプシーを活用するプロトコル。年間300検体、2年間契約を想定。高木マネージャーは「グローバル治験でFoundation Medicineを使っているが、日本のサイト用にgenmine TOPでの同等性を確認したい」との要望。同等性検証パイロット（50検体）の実施を提案中。Tempus USとの連携でグローバルデータとの整合性も保証できる点をアピール。',
      OwnerId:'U003'}
  ],
  Visit_Record__c:[
    {id:'VR001',Name:'VR-0001',Doctor__c:'D001',Institution__c:'MI001',Visit_Date__c:'2026-02-14',Purpose__c:'フォローアップ',Result__c:'良好',Duration__c:45,
      Materials__c:'genmine TOP 症例報告集 Vol.3、EGFR変異陽性肺がんCGP活用データ',
      Next_Action__c:'3/10 Web講演会の基調講演スライド最終確認（2/20までに送付）',
      Next_Visit_Date__c:'2026-03-05',
      Checkin_Latitude__c:35.7128,Checkin_Longitude__c:139.7636,Checkin_Time__c:'2026-02-14T10:00:00',Location_Accuracy__c:12,
      Detail__c:'佐藤教授との定例フォローアップ。先月のgenmine TOPレポート（SP-2026-0002）について議論。EGFR T790M→C797S の sequential mutation が検出された症例で、教授から「このパターンは今後増えてくる。genmine TOPで網羅的に見られるのは大きい」とコメント。3/10のWeb講演会（SM001）の基調講演についても打合せ。教授は「オシメルチニブ耐性後のsalvage strategyとしてのCGP検査の位置づけ」を講演テーマにしたいとのこと。東大腫瘍内科での月間オーダー数が安定して15件/月を維持しており、今後さらに拡大の見込み。',
      OwnerId:'U002'},
    {id:'VR002',Name:'VR-0002',Doctor__c:'D002',Institution__c:'MI002',Visit_Date__c:'2026-02-12',Purpose__c:'検査結果報告',Result__c:'次回アポ取得',Duration__c:30,
      Materials__c:'SP-2026-0008 レポート報告書、リキッドバイオプシー比較データ',
      Next_Action__c:'2/25 院内勉強会（SM002）での発表内容の最終打ち合わせ',
      Next_Visit_Date__c:'2026-02-25',
      Checkin_Latitude__c:35.6639,Checkin_Longitude__c:139.7702,Checkin_Time__c:'2026-02-12T14:00:00',Location_Accuracy__c:8,
      Detail__c:'田村准教授にSP-2026-0008（肺がんFFPE）のレポートを報告。KRAS G12C変異が検出され、ソトラシブ（ルマケラス）の適応が示唆された。田村先生から「従来のPCR法ではKRAS G12Cのみ検出だったが、genmine TOPではTP53 co-mutationも確認でき、予後予測に有用」との評価。2/25のランチョンセミナー（SM002）でオシメルチニブ耐性後の治療戦略について発表予定で、genmine TOPの活用事例を2-3例盛り込みたいとのリクエスト。がんセンターでの新規患者スクリーニングにgenmine TOPを標準化する動きが出ていることも確認。',
      OwnerId:'U002'},
    {id:'VR003',Name:'VR-0003',Doctor__c:'D003',Institution__c:'MI003',Visit_Date__c:'2026-02-10',Purpose__c:'genmine TOP紹介',Result__c:'継続検討',Duration__c:60,
      Materials__c:'genmine TOPパンフレット、大腸がんCGP活用ガイド、導入施設一覧',
      Next_Action__c:'3/15 ランチョンセミナー（SM005）の講演依頼正式回答待ち（2/20期限）',
      Next_Visit_Date__c:'2026-03-15',
      Checkin_Latitude__c:34.8217,Checkin_Longitude__c:135.5244,Checkin_Time__c:'2026-02-10T10:30:00',Location_Accuracy__c:15,
      Detail__c:'阪大 中村医長への初回本格プレゼン。消化器科カンファレンスの前に30分、その後カンファ後に30分。大腸がんにおけるRAS wild-typeの確認にgenmine TOPを活用した東京の施設事例を紹介。中村先生は「PCR法でRAS変異なしと出ても、genmine TOPで低頻度のBRAF V600E変異が見つかるケースがあるのは興味深い。ただ、阪大ではFoundationOne CDxを既に使っており、切り替えのメリットを定量的に示してほしい」との反応。次回は324遺伝子 vs F1CDx 315遺伝子の比較データと、ターンアラウンドタイム（TAT）の実績データを持参予定。3/15のランチョンセミナー（SM005）の講演を前向きに検討中。',
      OwnerId:'U003'},
    {id:'VR004',Name:'VR-0004',Doctor__c:'D005',Institution__c:'MI001',Visit_Date__c:'2026-02-07',Purpose__c:'新規挨拶',Result__c:'良好',Duration__c:20,
      Materials__c:'genmine TOP概要資料、乳がんゲノム医療パンフレット',
      Next_Action__c:'乳がんチームカンファレンスへの参加許可申請（小林部長経由）',
      Next_Visit_Date__c:'2026-03-01',
      Checkin_Latitude__c:35.7130,Checkin_Longitude__c:139.7640,Checkin_Time__c:'2026-02-07T15:00:00',Location_Accuracy__c:10,
      Detail__c:'東大外科 小林部長への初回訪問。乳腺外科でのgenmine TOP活用について簡潔に紹介。小林先生は「乳がんではHER2やホルモン受容体の従来検査が確立されているが、トリプルネガティブの患者さんにはCGPが有用だと思う。特にBRCA1/2変異の検出はPARP阻害薬の適応判定に直結する」と関心を示した。乳がんチームカンファレンスに一度参加させてほしいとのリクエストあり。佐藤教授（D001）からの紹介もあり、好意的な印象。',
      OwnerId:'U003'},
    {id:'VR005',Name:'VR-0005',Doctor__c:'D004',Institution__c:'MI004',Visit_Date__c:'2026-02-05',Purpose__c:'勉強会案内',Result__c:'良好',Duration__c:40,
      Materials__c:'SM006 学術講演会企画書、血液がんCGP活用データ集',
      Next_Action__c:'SM006（4/5 血液がん学術講演会）の講演概要・スライド構成案作成',
      Next_Visit_Date__c:'2026-03-10',
      Checkin_Latitude__c:35.6813,Checkin_Longitude__c:139.7178,Checkin_Time__c:'2026-02-05T13:00:00',Location_Accuracy__c:5,
      Detail__c:'慶應 木村教授に4/5の血液がん学術講演会（SM006）の講演依頼。木村先生は「AML/MDSにおけるgenmine TOPの有用性は実感している。特にFLT3-ITD、NPM1、IDH1/2の同時検出ができるのは臨床的に非常に重要。慶應では年間約40例のAMLでgenmine TOPを使っている」と快諾。講演テーマは「血液がんにおけるgenmine TOP ─ AML/MDSのドライバー変異プロファイリングとMRD検出の可能性」で合意。MRD（微小残存病変）検出に関するcfDNAベースの研究データも織り込みたいとのこと。第一三共・中外製薬との共同研究事例も紹介セクションに含める方向。',
      OwnerId:'U004'},
    {id:'VR006',Name:'VR-0006',Doctor__c:'D007',Institution__c:'MI005',Visit_Date__c:'2026-01-28',Purpose__c:'新規挨拶',Result__c:'継続検討',Duration__c:25,
      Materials__c:'genmine TOP概要資料、膵臓がん遺伝子パネル検査活用ガイド',
      Next_Action__c:'膵臓がん症例でのgenmine TOP活用データをまとめて再訪問（3月中旬予定）',
      Next_Visit_Date__c:'2026-03-15',
      Checkin_Latitude__c:35.1570,Checkin_Longitude__c:136.9232,Checkin_Time__c:'2026-01-28T11:00:00',Location_Accuracy__c:20,
      Detail__c:'名古屋大学 渡辺教授への初回訪問。膵臓がん領域でのゲノム医療について意見交換。渡辺先生は「膵臓がんは予後が厳しく、標準治療が奏効しないケースも多い。BRCA1/2変異が見つかればオラパリブが使えるが、現状ではBRACAnalysisのみで対応している」とのこと。genmine TOPであればBRCA以外にもATM、PALB2などHRD関連遺伝子を網羅的に検出でき、プラチナ製剤への感受性予測にも使える可能性を説明。先生は「データがあれば検討する」との反応。名大病院ではまだgenmine未導入で、導入検討中のフェーズ。',
      OwnerId:'U003'},
    {id:'VR007',Name:'VR-0007',Doctor__c:'D011',Institution__c:'MI008',Visit_Date__c:'2026-02-10',Purpose__c:'genmine TOP紹介',Result__c:'良好',Duration__c:35,
      Materials__c:'genmine TOP詳細資料、がん研有明実績レポート、大腸がん事例集',
      Next_Action__c:'がん研有明でのgenmine TOP月間オーダー数拡大計画を提案（3月初旬）',
      Next_Visit_Date__c:'2026-03-05',
      Checkin_Latitude__c:35.6359,Checkin_Longitude__c:139.7922,Checkin_Time__c:'2026-02-10T14:30:00',Location_Accuracy__c:7,
      Detail__c:'がん研有明 大野部長との面談。既にgenmine TOP導入完了施設だが、消化器チームでの利用拡大について相談。大野先生は「大腸がんのRAS/BRAF検査はPCR法でやっているが、MSI検査も同時に実施できるgenmine TOPに一本化することで効率化を図りたい」との意向。現在月間8件のオーダーを月間15件に拡大目標を設定。また、がん研で実施した直近10例のgenmine TOPレポートの内容を振り返り、3例でactionable mutationが同定されたことを確認。先生は「FoundationOne CDxと比較してTATが短いのが助かる」と評価。',
      OwnerId:'U002'},
    {id:'VR008',Name:'VR-0008',Doctor__c:'D012',Institution__c:'MI001',Visit_Date__c:'2026-02-18',Purpose__c:'検査結果報告',Result__c:'良好',Duration__c:60,
      Materials__c:'SP-2026-0010 レポート、東大レビュー結果まとめ、Tempus USフィードバック',
      Next_Action__c:'3/20 地域セミナー（SM004）基調講演準備支援',
      Next_Visit_Date__c:'2026-03-20',
      Checkin_Latitude__c:35.7125,Checkin_Longitude__c:139.7630,Checkin_Time__c:'2026-02-18T09:30:00',Location_Accuracy__c:9,
      Detail__c:'油谷先生との月例レビュー会議。SP-2026-0010（肺がんFFPE）のレポートについて詳細に議論。genmine TOPで検出されたSTK11 + KEAP1 co-mutationについて、油谷先生から「この組み合わせは免疫チェックポイント阻害薬への耐性と関連する重要な知見。論文に含めるべき」とコメント。Tempus US Labからのフィードバックでは「variant callの一致率は98.5%で、genmine TOPのアルゴリズム精度は十分」との評価。3/20のセミナー（SM004）では油谷先生が基調講演を担当予定で、「エキスパートパネル運営の実際と課題」をテーマに、C-CATへのデータ登録やgermline findingsの扱いについても言及する方向で合意。共同研究（JR001）の進捗も確認、150例中120例の解析が完了。',
      OwnerId:'U004'}
  ],
  Seminar__c:[
    {id:'SM001',Name:'genmine TOP ゲノム医療最新動向セミナー ─ EGFR変異陽性NSCLCにおけるCGP検査の役割',Format__c:'Web講演会',Speaker__c:'D001',Date__c:'2026-03-10',Time__c:'14:00-16:00',Status__c:'集客中',Venue__c:'オンライン(Zoom Webinar)',Capacity__c:200,Attendees__c:85,Budget__c:800000,Description__c:'【内容】\n1. EGFR-TKI耐性獲得後のgenmine TOP活用事例（佐藤教授・東大腫瘍内科）\n2. genmine TOPで検出された希少融合遺伝子（ROS1, NTRK, RET）に基づく治療選択\n3. Q&Aセッション：エキスパートパネル（東大・がんセンター・慶應）\n\n【対象】腫瘍内科医、呼吸器科医、病理医\n【学習目標】CGP検査の適切なオーダータイミングと結果解釈の標準化\n【共催】日本肺癌学会 東京支部',OwnerId:'U004'},
    {id:'SM002',Name:'肺がんプレシジョン・メディシン勉強会 ─ Osimertinib耐性後の治療戦略',Format__c:'院内勉強会',Speaker__c:'D002',Date__c:'2026-02-25',Time__c:'12:00-13:00',Status__c:'準備完了',Venue__c:'国立がん研究センター中央病院 講堂',Venue_Address__c:'東京都中央区築地5-1-1',Latitude__c:35.6639,Longitude__c:139.7702,Capacity__c:50,Attendees__c:42,Budget__c:300000,Description__c:'【内容】\n1. Osimertinib（タグリッソ）後のC797S変異検出とgenmine TOPの有用性\n2. 症例提示：genmine TOPで検出されたMET増幅に基づくカプマチニブ投与例\n3. 当院での genmine TOP 運用フロー改善提案\n\n【対象】がんセンター呼吸器科・腫瘍内科スタッフ全員\n【弁当】築地すし鮮 幕の内弁当 42名分手配済',OwnerId:'U004'},
    {id:'SM003',Name:'リキッドバイオプシー ハンズオンセミナー ─ cfDNA抽出から解析レポート読解まで',Format__c:'ハンズオン',Speaker__c:'D006',Date__c:'2026-01-20',Time__c:'10:00-17:00',Status__c:'完了',Venue__c:'genmine 東京オフィス ラボ棟',Venue_Address__c:'東京都港区六本木1-1-1',Latitude__c:35.6627,Longitude__c:139.7387,Capacity__c:30,Attendees__c:28,Budget__c:500000,Satisfaction__c:92,Description__c:'【内容】\n午前：cfDNA抽出実習（Streck採血管の正しい取り扱い、QC基準）\n午後：genmine TOPリキッドバイオプシーレポートの読解演習\n  - VAF（Variant Allele Frequency）の解釈\n  - TMB/MSI-Hの臨床的意義\n  - 実症例でのレポート読解ワークショップ\n\n【対象】病理医、検査技師、CRC（臨床研究コーディネーター）\n【修了証】日本臨床検査医学会 認定単位 2単位付与\n【参加者満足度】92% - 「実際の検体で練習できたのが非常に有益」との声多数',OwnerId:'U005'},
    {id:'SM004',Name:'がん遺伝子パネル検査の臨床活用 ─ エキスパートパネル運営の実際と課題',Format__c:'地域セミナー',Speaker__c:'D012',Date__c:'2026-03-20',Time__c:'15:00-17:00',Status__c:'企画中',Venue__c:'東京大学 医科学研究所 講堂',Venue_Address__c:'東京都港区白金台4-6-1',Latitude__c:35.6419,Longitude__c:139.7261,Capacity__c:80,Attendees__c:0,Budget__c:600000,Description__c:'【内容】\n1. 油谷先生 基調講演：「genmine TOPで見えてくる腫瘍の分子プロファイル ─ 網羅的ゲノム解析がもたらす治療パラダイムシフト」\n2. パネルディスカッション：エキスパートパネル（がんゲノム医療中核拠点病院）の運営課題\n  - 二次的所見（germline findings）の取り扱い\n  - 推奨治療が保険適用外の場合の患者説明\n  - C-CATへのデータ登録運用\n3. genmine TOP vs FoundationOne CDx：324遺伝子パネルの臨床比較\n\n【対象】がんゲノム医療中核・拠点病院の腫瘍内科医、遺伝カウンセラー\n【共催】日本癌治療学会',OwnerId:'U004'},
    {id:'SM005',Name:'大阪地区 ゲノム医療ランチョンセミナー ─ 消化器がんにおけるgenmine TOP活用',Format__c:'ランチョンセミナー',Speaker__c:'D003',Date__c:'2026-03-15',Time__c:'12:00-13:00',Status__c:'講師調整中',Venue__c:'大阪大学医学部附属病院 カンファレンスルーム',Venue_Address__c:'大阪府吹田市山田丘2-15',Latitude__c:34.8217,Longitude__c:135.5244,Capacity__c:40,Attendees__c:0,Budget__c:400000,Description__c:'【内容】\n1. 中村医長 講演：「大腸がんにおけるRAS/BRAF変異プロファイルとgenmine TOPの活用」\n  - 抗EGFR抗体薬適応判定にgenmine TOPを活用した症例\n  - MSI-H検出によるペムブロリズマブ投与切り替え事例\n2. 質疑応答：阪大での genmine TOP 導入に向けた実務的課題\n\n【対象】阪大病院 消化器内科・外科スタッフ\n【弁当】梅田 花いち 特選松花堂弁当 40名分（手配中）',OwnerId:'U005'},
    {id:'SM006',Name:'血液がんゲノム医療 学術講演会 ─ MRD検出と治療モニタリング',Format__c:'学術講演会',Speaker__c:'D004',Date__c:'2026-04-05',Time__c:'14:00-17:00',Status__c:'企画中',Venue__c:'帝国ホテル東京 孔雀の間',Venue_Address__c:'東京都千代田区内幸町1-1-1',Latitude__c:35.6726,Longitude__c:139.7568,Capacity__c:150,Attendees__c:0,Budget__c:2500000,Description__c:'【内容】\n1. 木村教授 特別講演：「慶應における血液がんgenmine TOP活用 ─ AML/MDSのドライバー変異プロファイリング」\n2. シンポジウム：MRD（微小残存病変）検出におけるgenmine TOPの可能性\n  - cfDNAベースのMRDモニタリング\n  - フローサイトメトリーとの比較検証\n3. 製薬企業との共同研究事例紹介（第一三共・中外製薬）\n\n【対象】血液内科医、移植医、臨床検査医\n【共催】日本血液学会\n【協賛】第一三共株式会社、中外製薬株式会社',OwnerId:'U004'}
  ],
  Seminar_Attendee__c:[
    {id:'SA001',Name:'佐藤隆',Seminar__c:'SM001',Doctor__c:'D001',Institution__c:'MI001',Email__c:'sato@h.u-tokyo.ac.jp',Registration_Date__c:'2026-02-15',Attendance_Status__c:'登録済',Bento_Required__c:false},
    {id:'SA002',Name:'田村美咲',Seminar__c:'SM001',Doctor__c:'D002',Institution__c:'MI002',Email__c:'tamura@ncc.go.jp',Registration_Date__c:'2026-02-16',Attendance_Status__c:'登録済',Bento_Required__c:false},
    {id:'SA003',Name:'木村健一',Seminar__c:'SM001',Doctor__c:'D004',Institution__c:'MI004',Email__c:'kimura@keio.jp',Registration_Date__c:'2026-02-17',Attendance_Status__c:'参加確定',Bento_Required__c:false},
    {id:'SA004',Name:'大野健太郎',Seminar__c:'SM001',Doctor__c:'D011',Institution__c:'MI008',Email__c:'ohno@jfcr.or.jp',Registration_Date__c:'2026-02-18',Attendance_Status__c:'登録済',Bento_Required__c:false},
    {id:'SA005',Name:'田村美咲',Seminar__c:'SM002',Doctor__c:'D002',Institution__c:'MI002',Email__c:'tamura@ncc.go.jp',Registration_Date__c:'2026-02-10',Attendance_Status__c:'参加確定',Bento_Required__c:true},
    {id:'SA006',Name:'高橋恵理',Seminar__c:'SM002',Doctor__c:'D006',Institution__c:'MI002',Email__c:'takahashi@ncc.go.jp',Registration_Date__c:'2026-02-11',Attendance_Status__c:'参加確定',Bento_Required__c:true},
    {id:'SA007',Name:'佐藤隆',Seminar__c:'SM002',Doctor__c:'D001',Institution__c:'MI001',Email__c:'sato@h.u-tokyo.ac.jp',Registration_Date__c:'2026-02-12',Attendance_Status__c:'登録済',Bento_Required__c:false},
    {id:'SA008',Name:'高橋恵理',Seminar__c:'SM003',Doctor__c:'D006',Institution__c:'MI002',Registration_Date__c:'2026-01-10',Attendance_Status__c:'参加',Bento_Required__c:true},
    {id:'SA009',Name:'小林正人',Seminar__c:'SM003',Doctor__c:'D005',Institution__c:'MI001',Registration_Date__c:'2026-01-11',Attendance_Status__c:'参加',Bento_Required__c:true},
    {id:'SA010',Name:'伊藤由美',Seminar__c:'SM003',Doctor__c:'D008',Institution__c:'MI003',Registration_Date__c:'2026-01-12',Attendance_Status__c:'参加',Bento_Required__c:false}
  ],
  Bento_Order__c:[
    {id:'BT001',Name:'SM002 弁当手配',Seminar__c:'SM002',Order_Date__c:'2026-02-20',Delivery_Date__c:'2026-02-25',Delivery_Time__c:'11:30',Vendor__c:'築地 すし鮮',Menu__c:'幕の内弁当',Quantity__c:45,Unit_Price__c:1500,Total__c:67500,Status__c:'発注済'},
    {id:'BT002',Name:'SM003 弁当手配',Seminar__c:'SM003',Order_Date__c:'2026-01-15',Delivery_Date__c:'2026-01-20',Delivery_Time__c:'12:00',Vendor__c:'銀座 割烹やまと',Menu__c:'季節の和食弁当',Quantity__c:30,Unit_Price__c:2000,Total__c:60000,Status__c:'配達済'},
    {id:'BT003',Name:'SM005 弁当手配',Seminar__c:'SM005',Order_Date__c:'2026-03-10',Delivery_Date__c:'2026-03-15',Delivery_Time__c:'11:45',Vendor__c:'梅田 花いち',Menu__c:'特選松花堂弁当',Quantity__c:40,Unit_Price__c:1800,Total__c:72000,Status__c:'手配中'}
  ],
  MA_Activity__c:[
    {id:'MA001',Name:'肺がんゲノム医療の最前線 講演',Activity_Type__c:'学術講演',Doctor__c:'D001',Date__c:'2026-02-20',Status__c:'準備中',Evidence_Level__c:'Level I',Budget__c:500000,
      Compliance_Approved__c:true,
      Outcome__c:'JSCO（日本臨床腫瘍学会）のサテライトシンポジウムでの講演企画。佐藤教授に「EGFR変異陽性NSCLC治療の変遷とCGP検査の役割 ─ TKI耐性克服への挑戦」をテーマに依頼。スライド構成案を提出済み。Key message: (1) TKI耐性メカニズムの多様性（C797S, MET amp, SCLC transformation等）をCGPで網羅的に検出する意義、(2) genmine TOPの324遺伝子パネルがカバーする耐性遺伝子の網羅性、(3) リキッドバイオプシーによる耐性モニタリングの可能性。講演後にgenmine TOP資材の配布許可を取得予定。',
      OwnerId:'U004'},
    {id:'MA002',Name:'血液がんパネル検査 Advisory Board',Activity_Type__c:'アドバイザリーボード',Doctor__c:'D004',Date__c:'2026-01-25',Status__c:'報告完了',Evidence_Level__c:'Level II',Budget__c:1200000,
      Compliance_Approved__c:true,
      Outcome__c:'血液がん領域のKOL 5名（木村教授含む）によるアドバイザリーボード実施。テーマは「血液がんにおけるCGP検査の臨床的意義と今後の展望」。主な議論結果: (1) AML/MDSではFLT3-ITD、NPM1、IDH1/2、DNMT3A、TET2の同時検出ができるCGPの有用性が合意された。(2) MRD検出へのCGP応用については「VAFの定量性がフローサイトメトリーに及ばない」との指摘あり。cfDNAベースの検出感度改善が課題。(3) CML blast crisisでのABL kinase domain mutation検出にgenmine TOPが有用との新たな知見。報告書を社内回覧済み、PMDA申請（PM002 血液がん適応追加）の根拠データとしても活用予定。',
      OwnerId:'U004'},
    {id:'MA003',Name:'リキッドバイオプシー文献レビュー',Activity_Type__c:'文献レビュー',Doctor__c:'D002',Date__c:'2026-02-01',Status__c:'実施済',Evidence_Level__c:'Level I',Budget__c:0,
      Outcome__c:'田村准教授と共同で、リキッドバイオプシー（cfDNA）によるCGP検査に関する最新文献25報をレビュー。主な所見: (1) cfDNA-based CGPの感度は進行がんで85-92%、早期がんで45-60%（Razavi et al., Nat Med 2019の追試結果含む）。(2) 組織検体とcfDNA検体の concordance rateは87-94%で、VAF 5%以上の変異は高い一致率。(3) genmine TOPリキッドバイオプシー版の臨床データ（Tempus xF panel相当）はTATが組織検体より平均5日短縮。結論: 組織検体が取得困難な場合のcfDNA-CGPの臨床的有用性を支持。SM003（ハンズオンセミナー）のエビデンスとしても活用。',
      OwnerId:'U005'},
    {id:'MA004',Name:'希少がん症例検討会',Activity_Type__c:'KOL面談',Doctor__c:'D008',Date__c:'2026-02-15',Status__c:'計画中',Evidence_Level__c:'Level III',Budget__c:300000,
      Outcome__c:'阪大 遺伝診療科 伊藤助教との症例検討会を企画中。希少がん（GIST、神経内分泌腫瘍、原発不明がん等）におけるgenmine TOP活用事例の検討。特に原発不明がん（CUP）でのTOO（Tissue of Origin）推定へのCGP活用に伊藤先生は強い関心。阪大では年間約15例の希少がん症例でCGP検査を実施しており、そのうち約30%でactionable mutationが検出されている。本症例検討会では、genmine TOPで検出されたNTRK融合遺伝子によりラロトレクチニブが著効した原発不明がん1例を中心に議論予定。',
      OwnerId:'U005'},
    {id:'MA005',Name:'genmine TOP 社内トレーニング',Activity_Type__c:'トレーニング',Doctor__c:'D012',Date__c:'2026-02-10',Status__c:'実施済',Evidence_Level__c:'N/A',Budget__c:100000,
      Outcome__c:'油谷先生を講師に招き、genmine社内MR・MSL向けのgenmine TOPレポート読解トレーニングを実施。参加者12名（MR 4名、MSL 3名、ラボスタッフ 5名）。内容: (1) genmine TOPレポートの構成と読み方（Tier I/II/III変異の分類基準）、(2) 実症例レポート3例を用いた読解演習、(3) エキスパートパネルでの議論シミュレーション。油谷先生から「MRが医師にレポートを説明する際、Tier分類の根拠（AMP/ASCO/CAPガイドライン）を理解していることが信頼獲得に繋がる」との助言。参加者アンケートでは満足度95%、「実際のレポートで練習できたのが有益」との回答が最多。',
      OwnerId:'U004'}
  ],
  Specimen__c:[
    {id:'SP001',Name:'SP-2026-0001',Patient_ID__c:'PT-0451',Institution__c:'MI001',Referring_Doctor__c:'D001',Cancer_Type__c:'肺がん',Specimen_Type__c:'FFPE組織',Status__c:'解析中',Analysis_Panel__c:'genmine TOP',QC_Status__c:'合格',Review_Status__c:'未レビュー',TAT_Days__c:8,Lab__c:'LB001'},
    {id:'SP002',Name:'SP-2026-0002',Patient_ID__c:'PT-0452',Institution__c:'MI001',Referring_Doctor__c:'D001',Cancer_Type__c:'肺がん',Specimen_Type__c:'FFPE組織',Status__c:'完了',Analysis_Panel__c:'genmine TOP',QC_Status__c:'合格',Review_Status__c:'レビュー完了',TAT_Days__c:12,Lab__c:'LB001',Report_Date__c:'2026-02-10'},
    {id:'SP003',Name:'SP-2026-0003',Patient_ID__c:'PT-0453',Institution__c:'MI002',Referring_Doctor__c:'D002',Cancer_Type__c:'乳がん',Specimen_Type__c:'FFPE組織',Status__c:'QC中',Analysis_Panel__c:'genmine TOP',QC_Status__c:'未実施',Review_Status__c:'未レビュー',TAT_Days__c:3,Lab__c:'LB001'},
    {id:'SP004',Name:'SP-2026-0004',Patient_ID__c:'PT-0454',Institution__c:'MI003',Referring_Doctor__c:'D003',Cancer_Type__c:'大腸がん',Specimen_Type__c:'FFPE組織',Status__c:'受領済',Analysis_Panel__c:'genmine TOP',QC_Status__c:'未実施',Review_Status__c:'未レビュー',TAT_Days__c:1,Lab__c:'LB002'},
    {id:'SP005',Name:'SP-2026-0005',Patient_ID__c:'PT-0455',Institution__c:'MI004',Referring_Doctor__c:'D004',Cancer_Type__c:'血液がん',Specimen_Type__c:'骨髄',Status__c:'レビュー中',Analysis_Panel__c:'genmine TOP',QC_Status__c:'合格',Review_Status__c:'東大レビュー中',TAT_Days__c:18,Lab__c:'LB001'},
    {id:'SP006',Name:'SP-2026-0006',Patient_ID__c:'PT-0456',Institution__c:'MI001',Referring_Doctor__c:'D005',Cancer_Type__c:'乳がん',Specimen_Type__c:'FFPE組織',Status__c:'受領待ち',Analysis_Panel__c:'genmine TOP',QC_Status__c:'未実施',Review_Status__c:'未レビュー',TAT_Days__c:0,Lab__c:'LB001'},
    {id:'SP007',Name:'SP-2026-0007',Patient_ID__c:'PT-0457',Institution__c:'MI008',Referring_Doctor__c:'D011',Cancer_Type__c:'大腸がん',Specimen_Type__c:'FFPE組織',Status__c:'レポート作成',Analysis_Panel__c:'genmine TOP',QC_Status__c:'合格',Review_Status__c:'USレビュー中',TAT_Days__c:14,Lab__c:'LB001'},
    {id:'SP008',Name:'SP-2026-0008',Patient_ID__c:'PT-0458',Institution__c:'MI002',Referring_Doctor__c:'D006',Cancer_Type__c:'肺がん',Specimen_Type__c:'FFPE組織',Status__c:'完了',Analysis_Panel__c:'genmine TOP',QC_Status__c:'合格',Review_Status__c:'レビュー完了',TAT_Days__c:10,Lab__c:'LB001',Report_Date__c:'2026-02-05'},
    {id:'SP009',Name:'SP-2026-0009',Patient_ID__c:'PT-0459',Institution__c:'MI004',Referring_Doctor__c:'D010',Cancer_Type__c:'希少がん',Specimen_Type__c:'FFPE組織',Status__c:'解析中',Analysis_Panel__c:'genmine TOP',QC_Status__c:'条件付合格',Review_Status__c:'未レビュー',TAT_Days__c:6,Lab__c:'LB001'},
    {id:'SP010',Name:'SP-2026-0010',Patient_ID__c:'PT-0460',Institution__c:'MI001',Referring_Doctor__c:'D012',Cancer_Type__c:'肺がん',Specimen_Type__c:'FFPE組織',Status__c:'完了',Analysis_Panel__c:'genmine TOP',QC_Status__c:'合格',Review_Status__c:'レビュー完了',TAT_Days__c:11,Lab__c:'LB001',Report_Date__c:'2026-01-28'}
  ],
  Testing_Order__c:[
    {id:'TO001',Name:'TO-00001',Specimen__c:'SP001',Doctor__c:'D001',Institution__c:'MI001',Order_Date__c:'2026-02-06',Panel__c:'genmine TOP',Status__c:'検査中',Priority__c:'通常',Reviewer__c:'U011',US_Review_Status__c:'未送信',TAT_Days__c:8,OwnerId:'U009'},
    {id:'TO002',Name:'TO-00002',Specimen__c:'SP002',Doctor__c:'D001',Institution__c:'MI001',Order_Date__c:'2026-01-29',Panel__c:'genmine TOP',Status__c:'完了',Priority__c:'通常',Reviewer__c:'U011',US_Review_Status__c:'US承認',Report_Date__c:'2026-02-10',TAT_Days__c:12,OwnerId:'U009'},
    {id:'TO003',Name:'TO-00003',Specimen__c:'SP003',Doctor__c:'D002',Institution__c:'MI002',Order_Date__c:'2026-02-12',Panel__c:'genmine TOP',Status__c:'検体待ち',Priority__c:'通常',US_Review_Status__c:'未送信',TAT_Days__c:3,OwnerId:'U010'},
    {id:'TO004',Name:'TO-00004',Specimen__c:'SP004',Doctor__c:'D003',Institution__c:'MI003',Order_Date__c:'2026-02-15',Panel__c:'genmine TOP',Status__c:'受付',Priority__c:'通常',US_Review_Status__c:'未送信',TAT_Days__c:1,OwnerId:'U010'},
    {id:'TO005',Name:'TO-00005',Specimen__c:'SP005',Doctor__c:'D004',Institution__c:'MI004',Order_Date__c:'2026-02-01',Panel__c:'genmine TOP',Status__c:'レビュー中',Priority__c:'緊急',Reviewer__c:'U011',US_Review_Status__c:'US審査中',TAT_Days__c:18,OwnerId:'U009'},
    {id:'TO006',Name:'TO-00006',Specimen__c:'SP006',Doctor__c:'D005',Institution__c:'MI001',Order_Date__c:'2026-02-18',Panel__c:'genmine TOP',Status__c:'受付',Priority__c:'通常',US_Review_Status__c:'未送信',TAT_Days__c:0,OwnerId:'U009'},
    {id:'TO007',Name:'TO-00007',Specimen__c:'SP007',Doctor__c:'D011',Institution__c:'MI008',Order_Date__c:'2026-02-04',Panel__c:'genmine TOP',Status__c:'レポート作成',Priority__c:'通常',Reviewer__c:'U012',US_Review_Status__c:'US審査中',TAT_Days__c:14,OwnerId:'U010'},
    {id:'TO008',Name:'TO-00008',Specimen__c:'SP008',Doctor__c:'D006',Institution__c:'MI002',Order_Date__c:'2026-01-26',Panel__c:'genmine TOP',Status__c:'完了',Priority__c:'通常',Reviewer__c:'U011',US_Review_Status__c:'US承認',Report_Date__c:'2026-02-05',TAT_Days__c:10,OwnerId:'U009'},
    {id:'TO009',Name:'TO-00009',Specimen__c:'SP009',Doctor__c:'D010',Institution__c:'MI004',Order_Date__c:'2026-02-10',Panel__c:'genmine TOP',Status__c:'検査中',Priority__c:'通常',US_Review_Status__c:'未送信',TAT_Days__c:6,OwnerId:'U010'},
    {id:'TO010',Name:'TO-00010',Specimen__c:'SP010',Doctor__c:'D012',Institution__c:'MI001',Order_Date__c:'2026-01-17',Panel__c:'genmine TOP',Status__c:'完了',Priority__c:'緊急',Reviewer__c:'U011',US_Review_Status__c:'US承認',Report_Date__c:'2026-01-28',TAT_Days__c:11,OwnerId:'U009'}
  ],
  Lab__c:[
    {id:'LB001',Name:'genmine 東京ラボ',Lab_Type__c:'自社ラボ',Location__c:'東京都港区',Certification__c:'CAP',Operation_Status__c:'稼働中',Monthly_Capacity__c:300,Current_Load__c:245,Utilization_Rate__c:82},
    {id:'LB002',Name:'大阪パートナーラボ',Lab_Type__c:'委託ラボ',Location__c:'大阪府吹田市',Certification__c:'ISO15189',Operation_Status__c:'稼働中',Monthly_Capacity__c:150,Current_Load__c:89,Utilization_Rate__c:59},
    {id:'LB003',Name:'Tempus US Lab (Chicago)',Lab_Type__c:'海外ラボ',Location__c:'Chicago, IL',Certification__c:'CLIA',Operation_Status__c:'稼働中',Monthly_Capacity__c:2000,Current_Load__c:1650,Utilization_Rate__c:83},
    {id:'LB004',Name:'名古屋大学提携ラボ',Lab_Type__c:'大学提携',Location__c:'愛知県名古屋市',Certification__c:'衛生検査所',Operation_Status__c:'立ち上げ中',Monthly_Capacity__c:100,Current_Load__c:0,Utilization_Rate__c:0}
  ],
  Genomic_Project__c:[
    {id:'GP001',Name:'東大 肺がんドライバー変異プロファイリング',Institution__c:'MI001',Cancer_Type__c:'肺がん',Status__c:'解析中',Sample_Count__c:150,Start_Date__c:'2025-10-01',Expected_End__c:'2027-03-31',Budget__c:75000000,TAT_Days__c:14,PI_Name__c:'佐藤隆教授',OwnerId:'U006'},
    {id:'GP002',Name:'がんセンター 固形がんCGP前向き研究',Institution__c:'MI002',Cancer_Type__c:'複数',Status__c:'検体収集中',Sample_Count__c:500,Start_Date__c:'2025-08-01',Expected_End__c:'2027-12-31',Budget__c:120000000,TAT_Days__c:10,PI_Name__c:'田村美咲准教授',OwnerId:'U006'},
    {id:'GP003',Name:'阪大 大腸がんバイオマーカー探索',Institution__c:'MI003',Cancer_Type__c:'大腸がん',Status__c:'IRB審査中',Sample_Count__c:200,Start_Date__c:'2026-04-01',Expected_End__c:'2028-03-31',Budget__c:50000000,TAT_Days__c:7,PI_Name__c:'中村大介医長',OwnerId:'U006'},
    {id:'GP004',Name:'慶應 AML/MDSゲノムプロファイリング',Institution__c:'MI004',Cancer_Type__c:'血液がん',Status__c:'計画中',Sample_Count__c:100,Start_Date__c:'2026-06-01',Expected_End__c:'2028-06-30',Budget__c:40000000,TAT_Days__c:21,PI_Name__c:'木村健一教授',OwnerId:'U006'}
  ],
  PMDA_Submission__c:[
    {id:'PM001',Name:'genmine TOP 新規承認申請（体外診断用医薬品）',Product__c:'genmine TOP',Submission_Type__c:'新規承認申請',Status__c:'審査中',Submission_Date__c:'2025-09-15',Expected_Approval__c:'2026-06-30',PMDA_Contact__c:'鈴木審査官',Inquiry_Count__c:12,Inquiry_Resolved__c:8,Reviewer__c:'U007',
      Note__c:'genmine TOPの体外診断用医薬品（IVD）としての新規承認申請。324遺伝子パネルによるCGP検査として、固形がん患者の治療方針決定を目的とする。申請区分は「新医療機器」相当（クラスIII）。2025年9月に申請書提出、現在PMDA審査中。照会事項12件のうち8件回答済み。主な照会内容: (1) 日本人集団での分析性能検証データの追加要求、(2) FoundationOne CDxとの比較分析データ、(3) variant callアルゴリズムのバリデーション方法、(4) cfDNA検体の適用範囲。未回答4件は臨床性能試験データの追加解析が必要で、3月末までに回答予定。承認審査のスケジュールは順調で、6月末の承認見込み。専門協議（外部専門家との審議）は4月に予定。'},
    {id:'PM002',Name:'genmine TOP 適応追加（血液がん）',Product__c:'genmine TOP',Submission_Type__c:'一部変更承認申請',Status__c:'準備中',Expected_Approval__c:'2027-03-31',Inquiry_Count__c:0,Inquiry_Resolved__c:0,Reviewer__c:'U007',
      Note__c:'固形がんで承認取得後に、血液がん（AML, MDS, ALL等）への適応追加を目指す一部変更承認申請の準備。木村教授（D004）をclinical advisorとして、慶應でのAML/MDS臨床データ蓄積を進行中。アドバイザリーボード（MA002）での議論結果も申請資料に反映予定。PMDA事前相談を2026年Q3に実施予定。血液がん特有のバリアント（FLT3-ITD、NPM1等）の検出感度・特異度データが必要で、GP004（慶應血液がん研究）のデータが重要な根拠資料となる。'},
    {id:'PM003',Name:'genmine TOP 軽微変更届（添付文書改訂）',Product__c:'genmine TOP',Submission_Type__c:'軽微変更届',Status__c:'承認済',Submission_Date__c:'2025-12-01',Expected_Approval__c:'2026-01-15',Inquiry_Count__c:2,Inquiry_Resolved__c:2,Reviewer__c:'U007',
      Note__c:'添付文書の改訂に伴う軽微変更届。主な変更内容: (1) 検体量の最低要件を「FFPE組織 10mm²以上、腫瘍含有率20%以上」から「FFPE組織 5mm²以上、腫瘍含有率10%以上」に緩和（解析アルゴリズム改良による感度向上を根拠）、(2) リキッドバイオプシーの適用条件に「Streck cfDNA BCT tube使用を推奨」を追記。照会事項2件（感度改良のバリデーションデータ追加）に回答し、2026年1月に承認済み。'}
  ],
  Joint_Research__c:[
    {id:'JR001',Name:'肺がんドライバー遺伝子変異の網羅的解析',Partner__c:'東京大学',PI__c:'D001',Status__c:'実施中',Start_Date__c:'2025-10-01',End_Date__c:'2027-03-31',Budget__c:50000000,IRB_Approved__c:true,Publication_Plan__c:'Nature Medicine',
      Description__c:'【目的】日本人NSCLC患者におけるドライバー遺伝子変異の全体像をgenmine TOP（324遺伝子パネル）で網羅的に解析し、人種差・地域差を明らかにする。\n【背景】米国Tempusデータベース（10万例超）では、EGFR変異は全体の15%だが、日本人集団では40-50%と推定される。しかし、EGFR以外のドライバー変異（KRAS, ALK, ROS1, BRAF, MET, RET, HER2等）の頻度分布は日本人大規模コホートでの検証が不十分。\n【研究デザイン】東大病院で2025年10月〜2027年3月にgenmine TOPを実施した連続150例のNSCLC患者を前向きに登録。Tempus US データベースの白人・アジア系サブグループとの比較解析。\n【進捗】150例中120例の解析完了。暫定結果: EGFR 47%, KRAS 18%, ALK 5.8%, MET exon14 skip 3.3%, RET fusion 2.5%, BRAF V600E 1.7%。EGFR uncommon mutation（G719X, L861Q, S768I等）が8.3%と予想以上に高頻度。\n【IP】genmine / 東大の共同特許出願予定（遺伝子変異プロファイル解析方法）\n【Tempus連携】Tempus US Lab（シカゴ）での variant call 一致率検証を並行実施中。'},
    {id:'JR002',Name:'genmine TOPによるMRD検出研究',Partner__c:'国立がん研究センター',PI__c:'D002',Status__c:'実施中',Start_Date__c:'2025-12-01',End_Date__c:'2027-06-30',Budget__c:35000000,IRB_Approved__c:true,Publication_Plan__c:'JCO',
      Description__c:'【目的】genmine TOPリキッドバイオプシーによる微小残存病変（MRD）検出の臨床的有用性を前向きに検証する。\n【背景】固形がんの術後MRD検出はctDNA（circulating tumor DNA）ベースのアプローチが注目されているが、CGPパネルでのMRD検出感度は未検証。Tempus Reveal（US版MRDアッセイ）の日本展開を見据えた基礎データ収集が目的。\n【研究デザイン】がんセンター中央病院で手術を受けたStage II-III NSCLC患者50例を対象。術前・術直後・術後3ヶ月・6ヶ月の4時点でcfDNA採取、genmine TOPリキッドバイオプシーを実施。術前組織検体のgenmine TOP結果と照合し、ctDNA clearance / residual ctDNAの検出率を評価。\n【進捗】50例中38例が登録完了。術前-術後のペアサンプル25例で暫定解析実施中。ctDNA VAF 0.5%以上の変異は術後96時間でクリアランスが確認される傾向。再発予測バイオマーカーとしての有用性を評価中。\n【資金】AMED「次世代がん医療創生研究事業」の分担研究としても位置づけ。'},
    {id:'JR003',Name:'AI病理診断支援システム開発',Partner__c:'慶應義塾大学',PI__c:'D004',Status__c:'IRB申請中',Start_Date__c:'2026-04-01',End_Date__c:'2028-03-31',Budget__c:80000000,IRB_Approved__c:false,Publication_Plan__c:'Lancet Oncology',
      Description__c:'【目的】Tempus Lens（AI病理画像解析プラットフォーム）を活用し、H&E染色画像からゲノム変異を予測するAIモデルを日本人検体で構築・検証する。\n【背景】Tempus LensはUS版で既にMSI-H予測（AUC 0.95）やTMB-High予測（AUC 0.87）を実現しているが、日本人集団での検証データがない。日本人特有の組織学的パターン（例: 東アジア型EGFR変異肺がんの形態学的特徴）への対応が必要。\n【研究デザイン】慶應病院の血液がん病理検体1000例のH&E全スライド画像（WSI）をデジタルスキャン。genmine TOPの変異データをground truthとして、deep learning model（Vision Transformer ベース）をトレーニング。Phase 1: FLT3-ITD予測モデル、Phase 2: IDH1/2変異予測モデル、Phase 3: 統合型マルチ変異予測モデル。\n【慶應側リソース】病理学教室の大学院生2名がアノテーション作業を担当。木村教授の研究室にGPUクラスタ（A100×4）を設置予定。\n【IP】Tempus / genmine / 慶應の3者共同特許。商業化権はgenmine/Tempusが保有。\n【規制対応】SaMD（Software as a Medical Device）としてのPMDA相談を2026年度中に開始予定。'}
  ],
  Daily_Report__c:[
    {id:'DR001',Name:'DR-0001',Report_Date__c:'2026-02-21',Report_Type__c:'MR日報',Visit_Summary__c:3,
      Key_Activities__c:'1. 東大病院 佐藤教授 フォローアップ訪問（45分）- genmine TOPレポートSP-2026-0002について議論。EGFR T790M→C797Sのsequential mutationケース。3/10 Web講演会のスライド最終確認依頼。\n2. 東大外科 小林部長 初回訪問（20分）- 乳がんTNBCでのCGP活用について紹介。BRCA1/2検出のメリットを説明。乳がんチームカンファ参加を検討。\n3. がん研有明 大野部長 電話フォロー（15分）- 月間オーダー数拡大計画について確認。来月15件目標。',
      Key_Findings__c:'佐藤教授から「EGFR uncommon mutationが最近増えている印象。genmine TOPの324遺伝子パネルでないと見逃す可能性がある」とのコメント。東大のオーダー数は安定推移。小林部長はPARP阻害薬のコンパニオン診断としてのgenmine TOPに関心あり。',
      Issues__c:'阪大の中村医長へのフォローが遅れている。F1CDxとの比較データの準備が必要。3/15のランチョンセミナー講演依頼の回答期限が2/20（過ぎている）。早急にフォロー必要。',
      Tomorrow_Plan__c:'AM: 国立がんセンター 田村准教授 訪問（SM002の最終確認）\nPM: 社内ミーティング（月次KPIレビュー）\n夕方: 中村医長に電話フォロー',
      Approval_Status__c:'提出済',OwnerId:'U002'},
    {id:'DR002',Name:'DR-0002',Report_Date__c:'2026-02-21',Report_Type__c:'MSL日報',Visit_Summary__c:2,
      Key_Activities__c:'1. 油谷先生チーム レビュー会議参加（60分）- SP-2026-0010のレポートレビュー。STK11+KEAP1 co-mutationの免疫療法耐性との関連について議論。\n2. genmine TOP社内トレーニング フォローアップ - 先週のトレーニング参加者4名に理解度確認テストを実施。全員合格。Tier分類の判断に自信がついたとの声。',
      Key_Findings__c:'油谷先生が共同研究JR001の暫定解析結果に言及。EGFR uncommon mutationが予想以上に高頻度（8.3%）。Nature Medicine投稿に向けた論文ドラフトの準備を開始予定。Tempus USからのvariant call一致率データ（98.5%）も論文に含める方向。',
      Issues__c:'4/5の血液がん学術講演会（SM006）の会場手配がまだ確定していない。帝国ホテル孔雀の間の仮予約期限が3/1。早急に予算承認が必要（250万円）。',
      Tomorrow_Plan__c:'AM: SM002（2/25がんセンター勉強会）の事前準備 - 弁当手配最終確認、配布資料印刷\nPM: 木村教授とSM006の講演内容打ち合わせ（オンライン）',
      Approval_Status__c:'提出済',OwnerId:'U004'},
    {id:'DR003',Name:'DR-0003',Report_Date__c:'2026-02-20',Report_Type__c:'MR日報',Visit_Summary__c:2,
      Key_Activities__c:'1. 名古屋大学 渡辺教授 2回目訪問（40分）- 膵臓がんBRCA/PALB2変異のデータを持参。HRD関連遺伝子の網羅的検出のメリットを説明。\n2. アステラス 高木マネージャー オンライン会議（30分）- 前立腺がん治験CGPスクリーニング受託の同等性検証パイロット提案について議論。50検体での評価を提案。',
      Key_Findings__c:'渡辺教授は膵臓がんでのCGP活用に前向きになってきた。「名大病院でも導入を検討したい」との発言あり。ただし院内倫理委員会の手続きが必要。アステラスの高木氏からは「グローバルHQの承認を取るためにFoundation Medicineとのconcordanceデータが欲しい」とのリクエスト。',
      Issues__c:'名大病院の導入検討は時間がかかる見込み。短期的には受託解析での対応を提案すべき。アステラスのパイロット提案は価格設定の調整が必要。',
      Tomorrow_Plan__c:'AM: 社内（営業ミーティング）\nPM: エーザイ 森マネージャー 初回訪問',
      Approval_Status__c:'承認済',Approved_By__c:'U001',Approval_Date__c:'2026-02-20',Approval_Comment__c:'名大の導入検討は良い動き。受託解析の提案書を来週中に作成してください。アステラスのパイロットは価格を確認して提案。',OwnerId:'U003'},
    {id:'DR004',Name:'DR-0004',Report_Date__c:'2026-02-20',Report_Type__c:'MR日報',Visit_Summary__c:4,
      Key_Activities__c:'1. 第一三共 山田事業部長 契約交渉会議（90分）- 年間最低オーダー数300件、価格条件について最終詰め。概ね合意に至った。\n2. 中外製薬 石川部長 提案書レビュー（60分）- 受託解析契約の提案書ドラフトをレビュー。バーゼルHQへの提出用に英語版も必要とのこと。\n3. 武田薬品 加藤R&Dヘッド ヒアリング（45分）- EGFR exon20 insertion変異の大規模解析提案。Tempusデータベースとの比較に関心。\n4. 週次チームミーティング（30分）- MR全員の週次報告、パイプラインレビュー。',
      Key_Findings__c:'第一三共案件が大きく前進。3月末の取締役会で最終承認予定。条件面でほぼ合意。中外の提案書は英語版が必要で1週間程度の追加作業。武田は共同研究スキームでの提案が有効との手応え。',
      Issues__c:'第一三共の契約書ドラフトを法務部に確認依頼済み。来週中に返ってくる見込み。中外の英語版提案書はマーケティング部の支援が必要。',
      Tomorrow_Plan__c:'AM: 第一三共 契約書ドラフト確認\nPM: 社内法務部との打ち合わせ\n夕方: 中外 英語版提案書の作成開始',
      Approval_Status__c:'承認済',Approved_By__c:'U007',Approval_Date__c:'2026-02-20',Approval_Comment__c:'第一三共の進捗は素晴らしい。契約条件の最終確認を慎重に。中外の英語版はマーケに依頼を出してください。武田は次回の経営会議で報告を。',OwnerId:'U001'},
    {id:'DR005',Name:'DR-0005',Report_Date__c:'2026-02-19',Report_Type__c:'ラボ日報',Visit_Summary__c:0,
      Key_Activities__c:'1. 検体QC実施: SP-2026-0003（乳がんFFPE、がんセンター）- 腫瘍含有率15%で条件付合格。DNA抽出量は十分。解析に進む。\n2. SP-2026-0001 解析結果レビュー - EGFR L858R + TP53 R273H を検出。東大レビューに回す準備完了。\n3. 名古屋提携ラボ立ち上げ進捗確認 - 装置搬入は3月第2週を予定。CAP認証取得に向けた書類準備中。',
      Key_Findings__c:'今月の検体受領ペースが先月比20%増。東京ラボのキャパシティ（月300件）に対して現在245件稼働中。3月は280件を超える見込みで、大阪ラボへの振り分けを検討すべき。',
      Issues__c:'SP-2026-0003の腫瘍含有率が低い（15%）。解析精度への影響を確認する必要あり。名古屋ラボの立ち上げスケジュールが1週間遅延。',
      Tomorrow_Plan__c:'AM: SP-2026-0004, SP-2026-0006のQC実施\nPM: 月次ラボ稼働率レポート作成\n夕方: 名古屋ラボチームとのオンライン会議',
      Approval_Status__c:'承認済',Approved_By__c:'U006',Approval_Date__c:'2026-02-19',Approval_Comment__c:'キャパシティ状況を注視。大阪への振り分け基準を来週のMTGで検討しましょう。名古屋の遅延原因を確認してください。',OwnerId:'U009'},
    {id:'DR006',Name:'DR-0006',Report_Date__c:'2026-02-22',Report_Type__c:'MR日報',Visit_Summary__c:2,
      Key_Activities__c:'1. がんセンター 田村准教授 SM002最終打ち合わせ（30分）- 2/25の院内勉強会の内容最終確認。スライド34枚、症例3例を使用予定。弁当手配も確認済み（築地すし鮮 45名分）。\n2. 慶應 木村教授 SM006打ち合わせ（オンライン45分）- 4/5の学術講演会の講演構成案をレビュー。AML/MDSのドライバー変異プロファイリングを中心に、MRDモニタリングのセクションも含める。',
      Key_Findings__c:'SM002は準備完了。田村先生の講演は具体的な症例（osimertinib耐性後のMET増幅検出→カプマチニブ投与）が含まれ、参加者の関心を引けるはず。SM006は規模が大きい（150名、帝国ホテル）ので運営面の準備が重要。',
      Issues__c:'SM006の会場費（帝国ホテル孔雀の間）が予算を超過する可能性。要承認申請。日本血液学会との共催手続きがまだ完了していない。',
      Tomorrow_Plan__c:'終日: SM002（がんセンター勉強会）の当日運営サポート',
      Approval_Status__c:'下書き',OwnerId:'U002'}
  ],
  Approval_Request__c:[
    {id:'AR001',Name:'SM006 学術講演会 予算承認',Request_Type__c:'勉強会予算',Related_Object__c:'Seminar__c',Related_Record_Id__c:'SM006',Amount__c:2500000,
      Description__c:'4/5開催予定「血液がんゲノム医療 学術講演会 ─ MRD検出と治療モニタリング」の予算承認申請。\n・会場費（帝国ホテル孔雀の間）: ¥800,000\n・講師謝金（木村教授）: ¥500,000\n・弁当・ケータリング: ¥450,000\n・印刷物・配布資料: ¥150,000\n・AV機器レンタル: ¥200,000\n・運営スタッフ: ¥200,000\n・予備費: ¥200,000\n合計: ¥2,500,000\n\n日本血液学会共催、第一三共・中外製薬協賛を予定。協賛金で¥800,000の収入見込み。',
      Status__c:'承認待ち',Priority__c:'高',Requested_By__c:'U004',Approver__c:'U007',Submitted_Date__c:'2026-02-20'},
    {id:'AR002',Name:'第一三共 契約条件 最終承認',Request_Type__c:'製薬商談',Related_Object__c:'Pharma_Opportunity__c',Related_Record_Id__c:'PO001',Amount__c:180000000,
      Description__c:'第一三共とのgenmine TOP採用契約の最終条件承認。\n・契約期間: 2年間（2026/4〜2028/3）\n・年間最低オーダー数: 300件\n・単価: ¥560,000/件（標準価格）→ ¥504,000/件（10%ボリュームディスカウント）\n・年間契約金額: 約¥1.5億\n・支払条件: 月末締め翌月末払い\n・独占条項: なし（先方の要望は却下）\n・データ共有: 匿名化されたアグリゲートデータの四半期報告',
      Status__c:'承認済',Priority__c:'高',Requested_By__c:'U001',Approver__c:'U008',Submitted_Date__c:'2026-02-18',Approved_Date__c:'2026-02-19',Approver_Comment__c:'条件は妥当。10%ディスカウントは300件/年の最低保証があるので問題なし。契約書の法務チェック完了後、速やかに締結を。'},
    {id:'AR003',Name:'JSMO 2026 出張申請（佐藤）',Request_Type__c:'出張申請',Amount__c:85000,
      Description__c:'JSMO 2026（日本臨床腫瘍学会）出席のための出張申請。\n・日程: 2026/3/6-8（3日間）\n・場所: 東京国際フォーラム\n・目的: ブース対応、KOLとのネットワーキング、競合情報収集\n・交通費: ¥0（都内のため）\n・宿泊費: ¥0\n・参加費: ¥35,000\n・日当: ¥3,000 × 3日 = ¥9,000\n・その他（名刺、資料印刷等）: ¥41,000',
      Status__c:'承認済',Priority__c:'中',Requested_By__c:'U002',Approver__c:'U001',Submitted_Date__c:'2026-02-15',Approved_Date__c:'2026-02-15',Approver_Comment__c:'承認。ブースでのリード獲得目標を設定してください。'},
    {id:'AR004',Name:'阪大 勉強会 弁当経費',Request_Type__c:'経費精算',Related_Object__c:'Bento_Order__c',Related_Record_Id__c:'BT003',Amount__c:72000,
      Description__c:'3/15 大阪地区ランチョンセミナー（SM005）の弁当手配経費。\n・業者: 梅田 花いち\n・メニュー: 特選松花堂弁当\n・数量: 40名分\n・単価: ¥1,800\n・合計: ¥72,000\n※ コンプライアンスガイドライン確認済み（1名あたり¥5,000以下）',
      Status__c:'申請中',Priority__c:'低',Requested_By__c:'U005',Approver__c:'U004',Submitted_Date__c:'2026-02-21'},
    {id:'AR005',Name:'MA活動 アドバイザリーボード承認',Request_Type__c:'MA活動',Related_Object__c:'MA_Activity__c',Related_Record_Id__c:'MA002',Amount__c:1200000,
      Description__c:'血液がんパネル検査アドバイザリーボードの実施承認。\n・参加者: KOL 5名（木村教授含む）\n・日程: 2026/1/25\n・謝金: ¥200,000/人 × 5名 = ¥1,000,000\n・会場費（ホテルオークラ）: ¥100,000\n・交通費: ¥50,000\n・ケータリング: ¥50,000\n・コンプライアンス確認: 済（透明性ガイドライン準拠）',
      Status__c:'承認済',Priority__c:'高',Requested_By__c:'U004',Approver__c:'U007',Submitted_Date__c:'2026-01-10',Approved_Date__c:'2026-01-12',Approver_Comment__c:'アドバイザリーボードの結果をPMDA申請資料に活用すること。報告書を2月中に提出してください。'},
    {id:'AR006',Name:'佐藤MR 2月経費精算',Request_Type__c:'経費精算',Amount__c:48500,
      Description__c:'2月分経費精算\n・2/7 東大訪問 タクシー代: ¥3,200\n・2/10 がん研有明訪問 交通費: ¥1,580\n・2/12 がんセンター訪問 交通費: ¥980\n・2/14 東大訪問 交通費: ¥1,240\n・2/14 東大近くで昼食（医師同伴なし）: ¥1,200\n・2/20 JSMO準備 名刺200枚追加印刷: ¥8,800\n・2/21 SM002配布資料 印刷代: ¥31,500\n合計: ¥48,500',
      Status__c:'承認待ち',Priority__c:'低',Requested_By__c:'U002',Approver__c:'U001',Submitted_Date__c:'2026-02-22'}
  ],
  Competitive_Intel__c:[
    {id:'CI001',Name:'F1CDx 大腸がん新適応取得',Competitor__c:'FoundationOne CDx（中外製薬）',Intel_Type__c:'規制動向',Source__c:'PMDA新規承認情報',Date__c:'2026-02-15',
      Summary__c:'FoundationOne CDx（中外製薬）が大腸がんのRAS/BRAF変異検出について体外診断用医薬品としての適応追加承認を取得。これまで固形がん全般でのCGPとしての承認のみだったが、大腸がんのコンパニオン診断としての明示的な適応を獲得。抗EGFR抗体薬（セツキシマブ、パニツムマブ）の適応判定に使用可能になった。\n\n【genmine TOPへの影響】大腸がん領域でF1CDxの優位性が強まる。genmine TOPは現在PMDA審査中（PM001）で、同様の適応は承認後に申請予定。阪大 中村医長へのアプローチにおいて、F1CDxとの差別化がより重要に。TATの短さ（genmine TOP平均10日 vs F1CDx平均14日）とコストメリットを強調すべき。',
      Impact__c:'高',Action_Required__c:'営業チームに情報共有、大腸がん領域の差別化ポイント資料を緊急作成',OwnerId:'U004'},
    {id:'CI002',Name:'Guardant360 リキッドバイオプシー日本展開情報',Competitor__c:'Guardant360',Intel_Type__c:'採用動向',Source__c:'Guardant Health IR資料',Date__c:'2026-02-10',
      Summary__c:'Guardant Health（米国）がGuardant360のリキッドバイオプシーCGPの日本展開を加速。SRL（みらかHD子会社）との提携により、2026年度中のPMDA申請を目指す模様。対象は固形がんのcfDNA解析（73遺伝子パネル）。\n\n【genmine TOPへの影響】リキッドバイオプシー市場での競合が激化。genmine TOPリキッドバイオプシー版は324遺伝子（Guardantは73遺伝子）でカバー範囲が広いが、検出感度（特に低VAF変異）での比較データが必要。田村准教授との共同研究（JR002）のMRDデータが差別化の鍵になる。',
      Impact__c:'中',Action_Required__c:'リキッドバイオプシーの比較優位性データをまとめる',OwnerId:'U005'},
    {id:'CI003',Name:'NCC オンコパネル 価格改定情報',Competitor__c:'NCC オンコパネル',Intel_Type__c:'価格情報',Source__c:'がんセンター内部情報（田村先生経由）',Date__c:'2026-02-05',
      Summary__c:'NCC オンコパネル（国立がん研究センター開発、シスメックス製造）の検査費用が2026年4月から改定の見込み。現行の約56万円から48万円程度に値下げとの情報。がんゲノム医療中核拠点病院での利用を促進するための施策。\n\n【genmine TOPへの影響】価格面での競合が激化。genmine TOPの標準価格56万円に対してNCCオンコパネルが48万円になると、価格差が拡大。ただしNCCオンコパネルは114遺伝子（genmine TOPは324遺伝子）で、カバー範囲の差が大きい。actionable mutation検出率の差を定量的に示す必要あり。',
      Impact__c:'高',Action_Required__c:'価格改定への対応戦略を経営会議で議論',OwnerId:'U002'},
    {id:'CI004',Name:'ASCO 2026 Tempus xT 大規模データ発表予定',Competitor__c:'Tempus xT（米国版）',Intel_Type__c:'学会発表',Source__c:'ASCO Abstract Database',Date__c:'2026-01-30',
      Summary__c:'Tempus（米国）がASCO 2026でTempus xT（648遺伝子パネル）を用いた10万例規模のリアルワールドデータ解析結果を発表予定。Oral presentationに採択。テーマは「Large-scale Genomic Profiling Reveals Novel Actionable Targets in Rare Cancers」。\n\n【genmine TOPへの影響】Tempusの米国データベースの規模感は、genmine TOPの日本展開における学術的な裏付けとして活用可能。ただし、遺伝子数の違い（Tempus xT 648 vs genmine TOP 324）について医師から質問される可能性あり。genmine TOPは日本人集団に最適化された324遺伝子を選定しており、臨床的に重要な変異のカバー率は同等であることを説明する準備が必要。',
      Impact__c:'中',Action_Required__c:'ASCO発表内容を注視し、営業トークに活用できるポイントを整理',OwnerId:'U004'},
    {id:'CI005',Name:'中外製薬 F1CDx営業体制強化',Competitor__c:'FoundationOne CDx（中外製薬）',Intel_Type__c:'人事異動',Source__c:'業界関係者情報',Date__c:'2026-02-18',
      Summary__c:'中外製薬がFoundationOne CDxの営業専任チームを新設との情報。これまで既存のオンコロジーMRが兼任していたが、4月からCGP専任MR 8名体制に増員。首都圏4名、関西2名、その他2名の配置予定。大学病院・がん拠点病院を重点的にカバー。\n\n【genmine TOPへの影響】最大の競合であるF1CDxの営業力が大幅強化される。特に未導入施設（名大、九大等）へのアプローチが激化する見込み。genmine社は営業3名（田中・佐藤・鈴木）+ MSL 2名の体制で対抗する必要があり、効率的なターゲティングと差別化が必須。',
      Impact__c:'高',Action_Required__c:'ターゲット施設の優先順位を再評価、重点施設での関係構築を加速',OwnerId:'U001'}
  ],
  Expense_Report__c:[
    {id:'EX001',Name:'EX-0001',Report_Date__c:'2026-02-22',Expense_Type__c:'交通費',Amount__c:3200,Description__c:'2/7 東大病院訪問 タクシー代（六本木→本郷）',Related_Visit__c:'VR004',Receipt_Attached__c:true,Status__c:'申請中',OwnerId:'U003'},
    {id:'EX002',Name:'EX-0002',Report_Date__c:'2026-02-22',Expense_Type__c:'交通費',Amount__c:1580,Description__c:'2/10 がん研有明訪問 電車代往復',Related_Visit__c:'VR007',Receipt_Attached__c:true,Status__c:'申請中',OwnerId:'U002'},
    {id:'EX003',Name:'EX-0003',Report_Date__c:'2026-02-22',Expense_Type__c:'勉強会経費',Amount__c:31500,Description__c:'SM002 配布資料印刷（A4カラー 42部×15ページ）',Related_Seminar__c:'SM002',Receipt_Attached__c:true,Status__c:'申請中',OwnerId:'U002'},
    {id:'EX004',Name:'EX-0004',Report_Date__c:'2026-02-15',Expense_Type__c:'学会参加費',Amount__c:35000,Description__c:'JSMO 2026 参加登録費',Receipt_Attached__c:true,Status__c:'承認済',OwnerId:'U002'},
    {id:'EX005',Name:'EX-0005',Report_Date__c:'2026-01-25',Expense_Type__c:'会議費',Amount__c:150000,Description__c:'MA002 アドバイザリーボード 会場費（ホテルオークラ）',Receipt_Attached__c:true,Status__c:'支払済',OwnerId:'U004'},
    {id:'EX006',Name:'EX-0006',Report_Date__c:'2026-02-18',Expense_Type__c:'消耗品',Amount__c:8800,Description__c:'JSMO 2026用 名刺200枚追加印刷',Receipt_Attached__c:true,Status__c:'申請中',OwnerId:'U002'}
  ],
  Visit_Target__c:[
    // 佐藤花子 (MR) の2月目標
    {id:'VT001',Name:'2月 東大病院 山田先生 定期訪問',Target_Month__c:'2026-02',OwnerId:'U002',Doctor__c:'D001',Institution__c:'MI001',Target_Visits__c:4,Actual_Visits__c:3,Visit_Purpose__c:'定期訪問',Priority__c:'A（最優先）',Status__c:'進行中',Achievement_Rate__c:75,Last_Visit_Date__c:'2026-02-18',Next_Visit_Date__c:'2026-02-25',Note__c:'genmine TOP導入に向けた関係構築。3月末までに検討会議設定が目標'},
    {id:'VT002',Name:'2月 がんセンター 佐々木先生 新規開拓',Target_Month__c:'2026-02',OwnerId:'U002',Doctor__c:'D002',Institution__c:'MI002',Target_Visits__c:3,Actual_Visits__c:2,Visit_Purpose__c:'新規開拓',Priority__c:'A（最優先）',Status__c:'進行中',Achievement_Rate__c:67,Last_Visit_Date__c:'2026-02-14',Next_Visit_Date__c:'2026-02-27',Note__c:'CGP検査の有用性について関心高い。次回は症例データ持参'},
    {id:'VT003',Name:'2月 慶応病院 小林先生 フォロー',Target_Month__c:'2026-02',OwnerId:'U002',Doctor__c:'D003',Institution__c:'MI003',Target_Visits__c:2,Actual_Visits__c:2,Visit_Purpose__c:'フォローアップ',Priority__c:'B（重要）',Status__c:'達成',Achievement_Rate__c:100,Last_Visit_Date__c:'2026-02-20',Note__c:'検体提出フロー確認済み。来月からの運用開始に向けて準備完了'},
    {id:'VT004',Name:'2月 阪大病院 田中先生 情報提供',Target_Month__c:'2026-02',OwnerId:'U002',Doctor__c:'D004',Institution__c:'MI004',Target_Visits__c:2,Actual_Visits__c:0,Visit_Purpose__c:'情報提供',Priority__c:'C（通常）',Status__c:'未着手',Achievement_Rate__c:0,Next_Visit_Date__c:'2026-02-26',Note__c:'JSMO学会後にフォロー予定。最新エビデンスを持参'},
    // 鈴木一郎 (MR) の2月目標
    {id:'VT005',Name:'2月 九大病院 松本先生 定期訪問',Target_Month__c:'2026-02',OwnerId:'U003',Doctor__c:'D005',Institution__c:'MI005',Target_Visits__c:3,Actual_Visits__c:3,Visit_Purpose__c:'定期訪問',Priority__c:'A（最優先）',Status__c:'達成',Achievement_Rate__c:100,Last_Visit_Date__c:'2026-02-21',Note__c:'genmine TOP受託解析の契約更新交渉完了'},
    {id:'VT006',Name:'2月 北大病院 中村先生 説明会',Target_Month__c:'2026-02',OwnerId:'U003',Doctor__c:'D006',Institution__c:'MI006',Target_Visits__c:2,Actual_Visits__c:1,Visit_Purpose__c:'説明会',Priority__c:'B（重要）',Status__c:'進行中',Achievement_Rate__c:50,Last_Visit_Date__c:'2026-02-10',Next_Visit_Date__c:'2026-02-28',Note__c:'病理部向けgenmine TOP説明会を企画中'},
    {id:'VT007',Name:'2月 名大病院 伊藤先生 検体回収',Target_Month__c:'2026-02',OwnerId:'U003',Doctor__c:'D007',Institution__c:'MI007',Target_Visits__c:4,Actual_Visits__c:2,Visit_Purpose__c:'検体回収',Priority__c:'A（最優先）',Status__c:'進行中',Achievement_Rate__c:50,Last_Visit_Date__c:'2026-02-15',Next_Visit_Date__c:'2026-02-24',Note__c:'月4回の検体回収ルート。TAT短縮のため週1回ペースを維持'},
    // 高橋美咲 (MSL) の2月目標
    {id:'VT008',Name:'2月 東大 油谷先生 アカデミック面談',Target_Month__c:'2026-02',OwnerId:'U004',Doctor__c:'D008',Institution__c:'MI001',Target_Visits__c:2,Actual_Visits__c:1,Visit_Purpose__c:'情報提供',Priority__c:'A（最優先）',Status__c:'進行中',Achievement_Rate__c:50,Last_Visit_Date__c:'2026-02-12',Next_Visit_Date__c:'2026-02-26',Note__c:'共同研究データの中間報告。Nature Medicine投稿に向けたデータ整理'},
    {id:'VT009',Name:'2月 がんセンター KOL面談',Target_Month__c:'2026-02',OwnerId:'U004',Doctor__c:'D009',Institution__c:'MI002',Target_Visits__c:2,Actual_Visits__c:2,Visit_Purpose__c:'情報提供',Priority__c:'B（重要）',Status__c:'達成',Achievement_Rate__c:100,Last_Visit_Date__c:'2026-02-19',Note__c:'アドバイザリーボード参加のお礼と次回テーマ相談完了'},
    // 渡辺健太 (MSL) の2月目標
    {id:'VT010',Name:'2月 京大病院 学会フォロー',Target_Month__c:'2026-02',OwnerId:'U005',Doctor__c:'D010',Institution__c:'MI008',Target_Visits__c:3,Actual_Visits__c:1,Visit_Purpose__c:'フォローアップ',Priority__c:'B（重要）',Status__c:'進行中',Achievement_Rate__c:33,Last_Visit_Date__c:'2026-02-08',Next_Visit_Date__c:'2026-02-25',Note__c:'ASCO Abstract準備支援。データ解析の進捗確認'},
    {id:'VT011',Name:'2月 筑波大 共同研究打合せ',Target_Month__c:'2026-02',OwnerId:'U005',Doctor__c:'D011',Institution__c:'MI009',Target_Visits__c:2,Actual_Visits__c:1,Visit_Purpose__c:'その他',Priority__c:'A（最優先）',Status__c:'進行中',Achievement_Rate__c:50,Last_Visit_Date__c:'2026-02-13',Next_Visit_Date__c:'2026-02-27',Note__c:'リキッドバイオプシー共同研究のプロトコル最終確認'},
    {id:'VT012',Name:'2月 広島大 新規KOL開拓',Target_Month__c:'2026-02',OwnerId:'U005',Doctor__c:'D012',Institution__c:'MI010',Target_Visits__c:1,Actual_Visits__c:0,Visit_Purpose__c:'新規開拓',Priority__c:'C（通常）',Status__c:'未着手',Achievement_Rate__c:0,Next_Visit_Date__c:'2026-02-28',Note__c:'肺がんゲノム研究の第一人者。初回面談のアポイント調整中'}
  ],
  Workflow_Instance__c:[
    // 引き継ぎワークフロー（進行中）
    {id:'WF001',Name:'佐藤花子 → 新任MR 引き継ぎ',Workflow_Type__c:'引き継ぎ',Status__c:'進行中',Current_Step__c:3,Total_Steps__c:6,Priority__c:'高',
     Requested_By__c:'U001',Current_Assignee__c:'U002',OwnerId:'U001',Start_Date__c:'2026-02-10',Due_Date__c:'2026-03-15',
     Related_Record__c:'U002',Description__c:'佐藤花子の異動に伴う担当ドクター・商談の引き継ぎ',
     steps:[
       {no:1,name:'引き継ぎ申請',assignee:'U001',status:'完了',completed:'2026-02-10',comment:'異動による引き継ぎ申請'},
       {no:2,name:'上長承認',assignee:'U001',status:'完了',completed:'2026-02-11',comment:'承認。後任は鈴木一郎に決定'},
       {no:3,name:'引き継ぎ内容整理',assignee:'U002',status:'進行中',comment:'担当ドクターリスト・商談・進行中案件の整理中',dueDate:'2026-02-25'},
       {no:4,name:'後任者への説明会',assignee:'U002',status:'未着手',dueDate:'2026-02-28'},
       {no:5,name:'データ移行実行',assignee:'U001',status:'未着手',dueDate:'2026-03-05'},
       {no:6,name:'完了確認・報告',assignee:'U001',status:'未着手',dueDate:'2026-03-15'}
     ]},
    // 検査オーダーワークフロー（進行中）
    {id:'WF002',Name:'TO-0025 遺伝子パネル検査フロー',Workflow_Type__c:'検査オーダー',Status__c:'進行中',Current_Step__c:4,Total_Steps__c:7,Priority__c:'高',
     Requested_By__c:'U006',Current_Assignee__c:'U011',OwnerId:'U006',Start_Date__c:'2026-02-05',Due_Date__c:'2026-02-28',
     Related_Record__c:'TO-0025',Description__c:'東大病院 山田先生 肺腺癌（EGFR変異疑い）検体のgenmine TOP検査',
     steps:[
       {no:1,name:'検体受付・品質確認',assignee:'U009',status:'完了',completed:'2026-02-05',comment:'検体良好。DNA抽出開始'},
       {no:2,name:'DNA抽出・ライブラリ調製',assignee:'U009',status:'完了',completed:'2026-02-08',comment:'DNA濃度: 25ng/μL、品質良好'},
       {no:3,name:'シーケンシング・解析',assignee:'U010',status:'完了',completed:'2026-02-14',comment:'324遺伝子解析完了。EGFR L858R検出'},
       {no:4,name:'東大チームレビュー',assignee:'U011',status:'進行中',comment:'油谷先生チームにてバリアント解釈中',dueDate:'2026-02-21'},
       {no:5,name:'US Tempusレビュー',assignee:'U013',status:'未着手',dueDate:'2026-02-24'},
       {no:6,name:'レポート作成',assignee:'U006',status:'未着手',dueDate:'2026-02-26'},
       {no:7,name:'レポート送付・完了',assignee:'U006',status:'未着手',dueDate:'2026-02-28'}
     ]},
    // 経費承認ワークフロー（承認待ち）
    {id:'WF003',Name:'佐藤花子 2月交通費精算',Workflow_Type__c:'経費承認',Status__c:'承認待ち',Current_Step__c:2,Total_Steps__c:4,Priority__c:'中',
     Requested_By__c:'U002',Current_Assignee__c:'U001',OwnerId:'U002',Start_Date__c:'2026-02-18',Due_Date__c:'2026-02-25',
     Related_Record__c:'EX-0003',Description__c:'2月前半の訪問交通費・タクシー代 合計¥45,800',
     steps:[
       {no:1,name:'経費申請',assignee:'U002',status:'完了',completed:'2026-02-18',comment:'領収書5枚添付済み'},
       {no:2,name:'上長承認',assignee:'U001',status:'承認待ち',comment:'田中マネージャーの承認待ち',dueDate:'2026-02-20'},
       {no:3,name:'経理承認',assignee:'U007',status:'未着手',dueDate:'2026-02-22'},
       {no:4,name:'支払い処理',assignee:'U007',status:'未着手',dueDate:'2026-02-25'}
     ]},
    // 勉強会開催ワークフロー（進行中）
    {id:'WF004',Name:'CGP勉強会@東大 3月開催準備',Workflow_Type__c:'勉強会開催',Status__c:'進行中',Current_Step__c:4,Total_Steps__c:8,Priority__c:'高',
     Requested_By__c:'U004',Current_Assignee__c:'U004',OwnerId:'U004',Start_Date__c:'2026-01-20',Due_Date__c:'2026-03-10',
     Related_Record__c:'SEM003',Description__c:'東京大学医学部にて遺伝子パネル検査（CGP）の最新動向勉強会を開催',
     steps:[
       {no:1,name:'企画書作成',assignee:'U004',status:'完了',completed:'2026-01-22',comment:'企画書承認済み。テーマ: CGP最新エビデンス'},
       {no:2,name:'講師依頼・調整',assignee:'U004',status:'完了',completed:'2026-02-01',comment:'油谷先生に講演依頼済み、快諾'},
       {no:3,name:'会場手配',assignee:'U005',status:'完了',completed:'2026-02-05',comment:'東大医学部2号館 第1講堂 確保済み'},
       {no:4,name:'案内状送付・集客',assignee:'U004',status:'進行中',comment:'対象ドクター50名に案内送付。現在参加登録18名',dueDate:'2026-02-28'},
       {no:5,name:'弁当・備品手配',assignee:'U005',status:'未着手',dueDate:'2026-03-01'},
       {no:6,name:'資料準備・最終確認',assignee:'U004',status:'未着手',dueDate:'2026-03-05'},
       {no:7,name:'勉強会開催',assignee:'U004',status:'未着手',dueDate:'2026-03-10'},
       {no:8,name:'フォローアップ・報告',assignee:'U004',status:'未着手',dueDate:'2026-03-17'}
     ]},
    // 商談承認ワークフロー（完了）
    {id:'WF005',Name:'第一三共 genmine TOP導入 商談承認',Workflow_Type__c:'商談承認',Status__c:'完了',Current_Step__c:5,Total_Steps__c:5,Priority__c:'高',
     Requested_By__c:'U002',Current_Assignee__c:'U002',OwnerId:'U002',Start_Date__c:'2026-01-15',Due_Date__c:'2026-02-15',Completed_Date__c:'2026-02-12',
     Related_Record__c:'PO001',Description__c:'第一三共向けgenmine TOP導入商談の社内承認',
     steps:[
       {no:1,name:'提案書作成',assignee:'U002',status:'完了',completed:'2026-01-15',comment:'提案書v2.0完成'},
       {no:2,name:'上長承認',assignee:'U001',status:'完了',completed:'2026-01-18',comment:'承認。価格条件の調整を指示'},
       {no:3,name:'事業部長承認',assignee:'U007',status:'完了',completed:'2026-01-22',comment:'承認。¥5,000万以上の案件のため事業部長承認'},
       {no:4,name:'見積書発行',assignee:'U002',status:'完了',completed:'2026-01-25',comment:'正式見積書発行済み'},
       {no:5,name:'契約締結・完了',assignee:'U002',status:'完了',completed:'2026-02-12',comment:'契約書締結完了。4月から導入開始'}
     ]},
    // PMDA申請ワークフロー（進行中）
    {id:'WF006',Name:'genmine TOP 適応追加申請',Workflow_Type__c:'PMDA申請',Status__c:'進行中',Current_Step__c:4,Total_Steps__c:7,Priority__c:'緊急',
     Requested_By__c:'U007',Current_Assignee__c:'U006',OwnerId:'U007',Start_Date__c:'2025-10-01',Due_Date__c:'2026-06-30',
     Related_Record__c:'PMDA001',Description__c:'genmine TOP 固形がん適応追加のPMDA一変申請',
     steps:[
       {no:1,name:'申請書類準備',assignee:'U006',status:'完了',completed:'2025-11-15',comment:'CTD Module 1-5 準備完了'},
       {no:2,name:'社内品質レビュー',assignee:'U007',status:'完了',completed:'2025-12-01',comment:'QA/RA部門レビュー完了'},
       {no:3,name:'PMDA申請提出',assignee:'U006',status:'完了',completed:'2025-12-15',comment:'eCTDにて申請完了。受付番号取得'},
       {no:4,name:'PMDA審査対応',assignee:'U006',status:'進行中',comment:'照会事項3件中2件回答済み。残り1件は臨床データ追加提出',dueDate:'2026-03-31'},
       {no:5,name:'専門協議',assignee:'U007',status:'未着手',dueDate:'2026-04-30'},
       {no:6,name:'審査報告書確認',assignee:'U006',status:'未着手',dueDate:'2026-05-31'},
       {no:7,name:'承認取得',assignee:'U007',status:'未着手',dueDate:'2026-06-30'}
     ]},
    // 引き継ぎ（完了）
    {id:'WF007',Name:'鈴木一郎 テリトリー追加引き継ぎ',Workflow_Type__c:'引き継ぎ',Status__c:'完了',Current_Step__c:6,Total_Steps__c:6,Priority__c:'中',
     Requested_By__c:'U001',Current_Assignee__c:'U003',OwnerId:'U001',Start_Date__c:'2026-01-05',Due_Date__c:'2026-01-31',Completed_Date__c:'2026-01-28',
     Related_Record__c:'U003',Description__c:'大阪エリア担当追加に伴うドクター引き継ぎ',
     steps:[
       {no:1,name:'引き継ぎ申請',assignee:'U001',status:'完了',completed:'2026-01-05',comment:'大阪エリア担当追加'},
       {no:2,name:'上長承認',assignee:'U001',status:'完了',completed:'2026-01-06',comment:'承認'},
       {no:3,name:'引き継ぎ内容整理',assignee:'U003',status:'完了',completed:'2026-01-10',comment:'大阪大学・関西医大の5名のドクターリスト整理'},
       {no:4,name:'後任者への説明会',assignee:'U003',status:'完了',completed:'2026-01-15',comment:'Web会議にて引き継ぎ完了'},
       {no:5,name:'データ移行実行',assignee:'U001',status:'完了',completed:'2026-01-20',comment:'CRMデータ移行完了'},
       {no:6,name:'完了確認・報告',assignee:'U001',status:'完了',completed:'2026-01-28',comment:'引き継ぎ完了報告書提出'}
     ]},
    // 検査オーダー（完了）
    {id:'WF008',Name:'TO-0018 検査完了フロー',Workflow_Type__c:'検査オーダー',Status__c:'完了',Current_Step__c:7,Total_Steps__c:7,Priority__c:'中',
     Requested_By__c:'U006',Current_Assignee__c:'U006',OwnerId:'U006',Start_Date__c:'2026-01-10',Due_Date__c:'2026-02-07',Completed_Date__c:'2026-02-05',
     Related_Record__c:'TO-0018',Description__c:'がんセンター 佐々木先生 大腸癌検体',
     steps:[
       {no:1,name:'検体受付・品質確認',assignee:'U009',status:'完了',completed:'2026-01-10',comment:'良好'},
       {no:2,name:'DNA抽出・ライブラリ調製',assignee:'U009',status:'完了',completed:'2026-01-13',comment:'完了'},
       {no:3,name:'シーケンシング・解析',assignee:'U010',status:'完了',completed:'2026-01-20',comment:'KRAS G12D, TP53検出'},
       {no:4,name:'東大チームレビュー',assignee:'U011',status:'完了',completed:'2026-01-24',comment:'バリアント解釈確定'},
       {no:5,name:'US Tempusレビュー',assignee:'U013',status:'完了',completed:'2026-01-28',comment:'US側承認'},
       {no:6,name:'レポート作成',assignee:'U006',status:'完了',completed:'2026-02-01',comment:'レポートv1作成'},
       {no:7,name:'レポート送付・完了',assignee:'U006',status:'完了',completed:'2026-02-05',comment:'佐々木先生へ送付完了'}
     ]}
  ]
};

// Combine all object definitions
const ALL_OBJECTS = [...SF_STANDARD_OBJECTS, ...CUSTOM_OBJECTS];

// Workflow template definitions
const WORKFLOW_TEMPLATES = {
  '引き継ぎ': {
    name:'担当引き継ぎワークフロー', icon:'🔄', color:'#1565c0',
    steps:['引き継ぎ申請','上長承認','引き継ぎ内容整理','後任者への説明会','データ移行実行','完了確認・報告'],
    defaultAssignees:['requester','manager','from_user','from_user','manager','manager'],
    sla: 30 // days
  },
  '検査オーダー': {
    name:'遺伝子パネル検査ワークフロー', icon:'🧬', color:'#2e7d32',
    steps:['検体受付・品質確認','DNA抽出・ライブラリ調製','シーケンシング・解析','東大チームレビュー','US Tempusレビュー','レポート作成','レポート送付・完了'],
    defaultAssignees:['U009','U009','U010','U011','U013','U006','U006'],
    sla: 21
  },
  '経費承認': {
    name:'経費承認ワークフロー', icon:'💴', color:'#e65100',
    steps:['経費申請','上長承認','経理承認','支払い処理'],
    defaultAssignees:['requester','manager','U007','U007'],
    sla: 7
  },
  '勉強会開催': {
    name:'勉強会開催ワークフロー', icon:'📚', color:'#6a1b9a',
    steps:['企画書作成','講師依頼・調整','会場手配','案内状送付・集客','弁当・備品手配','資料準備・最終確認','勉強会開催','フォローアップ・報告'],
    defaultAssignees:['requester','requester','requester','requester','requester','requester','requester','requester'],
    sla: 60
  },
  '商談承認': {
    name:'商談承認ワークフロー', icon:'💼', color:'#c62828',
    steps:['提案書作成','上長承認','事業部長承認','見積書発行','契約締結・完了'],
    defaultAssignees:['requester','manager','U007','requester','requester'],
    sla: 30
  },
  'PMDA申請': {
    name:'PMDA申請ワークフロー', icon:'🏛️', color:'#00695c',
    steps:['申請書類準備','社内品質レビュー','PMDA申請提出','PMDA審査対応','専門協議','審査報告書確認','承認取得'],
    defaultAssignees:['U006','U007','U006','U006','U007','U006','U007'],
    sla: 180
  }
};

// Monthly testing volume data (for dashboard charts)
const MONTHLY_TESTING_DATA = [
  {month:'2025-04',orders:45,completed:42,avgTAT:13.2},
  {month:'2025-05',orders:52,completed:48,avgTAT:12.8},
  {month:'2025-06',orders:58,completed:55,avgTAT:12.1},
  {month:'2025-07',orders:63,completed:60,avgTAT:11.5},
  {month:'2025-08',orders:55,completed:52,avgTAT:11.8},
  {month:'2025-09',orders:70,completed:67,avgTAT:11.2},
  {month:'2025-10',orders:78,completed:74,avgTAT:10.8},
  {month:'2025-11',orders:82,completed:79,avgTAT:10.5},
  {month:'2025-12',orders:75,completed:71,avgTAT:10.9},
  {month:'2026-01',orders:88,completed:84,avgTAT:10.2},
  {month:'2026-02',orders:65,completed:45,avgTAT:9.8}
];
