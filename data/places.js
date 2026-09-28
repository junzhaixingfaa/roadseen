// 5 个测试地点，覆盖四色状态、动态事件、设备宽度、坡道与协助等规则分支
// 坐标示例落在北京大学·海淀燕园（相对布局保持），可按需整体替换
module.exports = [
  {
    id: 'p001', name: '图书馆', category: '图书馆',
    address: '校园中心广场南侧', openTime: '08:00-22:00',
    location: { latitude: 39.9915, longitude: 116.3105 },
    needElevatorToTarget: false, needAccessibleToilet: false,
    entrances: [
      {
        id: 'e001', name: '南侧无障碍入口', direction: '面向广场，玻璃门西侧约 5 米',
        location: { latitude: 39.99142, longitude: 116.31058 }, isRecommended: true,
        hasSteps: false, stepCount: 0, hasRamp: true, rampCondition: '平缓',
        hasThreshold: false, thresholdHeight: 0, doorType: '自动门', needAssistToOpen: false,
        doorWidth: 90 // 门洞净宽 cm，未测量的入口省略该字段
      }
    ],
    facilities: {
      elevator: { has: true, location: '进门左转约 10 米', status: 'normal', note: '' },
      accessibleToilet: { has: true, location: '一楼东侧', status: 'open', note: '' },
      pathCondition: '平整硬质路面，主通道宽约 1.8 米', otherObstacles: ''
    },
    steps: ['到达图书馆南侧广场', '沿右侧通道前进约 30 米', '使用玻璃门旁的无障碍自动门进入', '进入后左转约 10 米可找到电梯'],
    evidenceIds: ['ev001', 'ev002'], lastVerifiedAt: '2026-09-10', collectedBy: '志愿者-张', isTestData: false
  },
  {
    id: 'p002', name: '老教学楼', category: '教学楼',
    address: '北区道路东侧', openTime: '07:30-21:00',
    location: { latitude: 39.9932, longitude: 116.3122 },
    needElevatorToTarget: true, needAccessibleToilet: false, // 主要教室在二层，楼内未确认有电梯
    entrances: [
      {
        id: 'e002', name: '正门台阶入口', direction: '正对道路，门前有连续台阶',
        location: { latitude: 39.99318, longitude: 116.31222 }, isRecommended: true,
        hasSteps: true, stepCount: 4, hasRamp: false, rampCondition: '无',
        hasThreshold: false, thresholdHeight: 0, doorType: '平开门', needAssistToOpen: false
      }
    ],
    facilities: {
      elevator: { has: false, location: '', status: 'unknown', note: '未确认是否有电梯' },
      accessibleToilet: { has: false, location: '', status: 'unknown', note: '' },
      pathCondition: '门前为台阶，未见坡道', otherObstacles: '仅有台阶，暂无轮椅可通行入口'
    },
    steps: ['到达老教学楼正门', '门前为连续台阶，暂未发现无障碍入口', '主要教室在二层，楼内未确认有电梯'],
    evidenceIds: ['ev003'], lastVerifiedAt: '2026-09-08', collectedBy: '志愿者-张', isTestData: false
  },
  {
    id: 'p003', name: '第一食堂', category: '食堂',
    address: '生活区中心', openTime: '06:30-20:30',
    location: { latitude: 39.9908, longitude: 116.3118 },
    needElevatorToTarget: false, needAccessibleToilet: false,
    minPassageWidth: 75, // 取餐通道最窄处净宽，电动轮椅常过不去
    entrances: [
      {
        id: 'e003', name: '西侧门厅入口', direction: '西侧门厅，经较陡坡道后为沉重的平开门',
        location: { latitude: 39.99076, longitude: 116.31186 }, isRecommended: true,
        hasSteps: false, stepCount: 0, hasRamp: true, rampCondition: '较陡',
        hasThreshold: true, thresholdHeight: 3, doorType: '平开门', needAssistToOpen: true,
        doorWidth: 82
      }
    ],
    facilities: {
      elevator: { has: false, location: '', status: 'na', note: '单层建筑，无需电梯' },
      accessibleToilet: { has: true, location: '食堂内西北角', status: 'open', note: '' },
      pathCondition: '室内平整', otherObstacles: '入口坡道较陡且为沉重平开门，高峰期取餐通道拥挤'
    },
    steps: ['到达食堂西侧门厅', '经较陡无障碍坡道至门前', '门为沉重的平开门，可能需他人协助推开', '室内为单层，取餐通道最窄处约 75 cm'],
    evidenceIds: ['ev004'], lastVerifiedAt: '2026-09-05', collectedBy: '志愿者-方', isTestData: false
  },
  {
    id: 'p004', name: '体育馆', category: '体育馆',
    address: '东区运动场旁', openTime: '',
    location: { latitude: 39.9898, longitude: 116.3132 },
    needElevatorToTarget: false, needAccessibleToilet: false,
    entrances: [],
    facilities: {
      elevator: { has: false, location: '', status: 'unknown', note: '未勘察' },
      accessibleToilet: { has: false, location: '', status: 'unknown', note: '未勘察' },
      pathCondition: '', otherObstacles: ''
    },
    steps: [], evidenceIds: [], lastVerifiedAt: '', collectedBy: '', isTestData: false,
    pendingInspection: true
  },
  {
    id: 'p005', name: '实验楼', category: '实验楼',
    address: '中区教学科研楼', openTime: '08:00-21:00',
    location: { latitude: 39.9925, longitude: 116.3095 },
    needElevatorToTarget: true, needAccessibleToilet: false, // 主要实验室在 3 楼，需上楼
    minPassageWidth: 76, // 三楼目标实验室门洞净宽偏窄
    entrances: [
      {
        id: 'e005', name: '北门无障碍入口', direction: '北侧广场，平坡进入',
        location: { latitude: 39.99256, longitude: 116.30944 }, isRecommended: true,
        hasSteps: false, stepCount: 0, hasRamp: true, rampCondition: '平缓',
        hasThreshold: false, thresholdHeight: 0, doorType: '自动门', needAssistToOpen: false,
        doorWidth: 90
      },
      {
        id: 'e005b', name: '东门次入口', direction: '东侧，有一级 2cm 门槛',
        location: { latitude: 39.99248, longitude: 116.30962 }, isRecommended: false,
        hasSteps: false, stepCount: 0, hasRamp: true, rampCondition: '平缓',
        hasThreshold: true, thresholdHeight: 2, doorType: '推拉门', needAssistToOpen: false,
        doorWidth: 72 // 门洞净宽偏窄，电动轮椅（78 cm）过不去
      }
    ],
    facilities: {
      elevator: { has: true, location: '进门右手边', status: 'normal', note: '' },
      accessibleToilet: { has: true, location: '三楼电梯口', status: 'open', note: '' },
      pathCondition: '平整', otherObstacles: ''
    },
    steps: ['到达实验楼北侧广场', '平坡进入北门', '进门右手边乘电梯上 3 楼'],
    evidenceIds: ['ev005'], lastVerifiedAt: '2026-09-12', collectedBy: '志愿者-陈', isTestData: false
  }
];
