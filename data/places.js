// 5 个测试地点，覆盖四色状态 + 动态演示
// 判定预期见《雏形开发规划.md》3.7 与 4.3
module.exports = [
  {
    id: 'p001', name: '图书馆', category: '图书馆',
    address: '校园中心广场南侧', openTime: '08:00-22:00',
    location: { latitude: 30.5145, longitude: 114.3995 },
    needElevatorToTarget: false, needAccessibleToilet: false,
    entrances: [
      {
        id: 'e001', name: '南侧无障碍入口', direction: '面向广场，玻璃门西侧约 5 米',
        location: { latitude: 30.51442, longitude: 114.39958 }, isRecommended: true,
        hasSteps: false, stepCount: 0, hasRamp: true, rampCondition: '平缓',
        hasThreshold: false, thresholdHeight: 0, doorType: '自动门', needAssistToOpen: false
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
    location: { latitude: 30.5162, longitude: 114.4012 },
    needElevatorToTarget: false, needAccessibleToilet: false,
    entrances: [
      {
        id: 'e002', name: '正门台阶入口', direction: '正对道路，门前有连续台阶',
        location: { latitude: 30.51618, longitude: 114.40122 }, isRecommended: true,
        hasSteps: true, stepCount: 4, hasRamp: false, rampCondition: '无',
        hasThreshold: false, thresholdHeight: 0, doorType: '平开门', needAssistToOpen: false
      }
    ],
    facilities: {
      elevator: { has: false, location: '', status: 'unknown', note: '未确认是否有电梯' },
      accessibleToilet: { has: false, location: '', status: 'unknown', note: '' },
      pathCondition: '门前为台阶，未见坡道', otherObstacles: '仅有台阶，暂无轮椅可通行入口'
    },
    steps: ['到达老教学楼正门', '门前为连续台阶，暂未发现无障碍入口'],
    evidenceIds: ['ev003'], lastVerifiedAt: '2026-09-08', collectedBy: '志愿者-张', isTestData: false
  },
  {
    id: 'p003', name: '第一食堂', category: '食堂',
    address: '生活区中心', openTime: '06:30-20:30',
    location: { latitude: 30.5138, longitude: 114.4008 },
    needElevatorToTarget: false, needAccessibleToilet: false,
    entrances: [
      {
        id: 'e003', name: '西侧门厅入口', direction: '西侧门厅，经坡道后为较重的平开门',
        location: { latitude: 30.51376, longitude: 114.40086 }, isRecommended: true,
        hasSteps: false, stepCount: 0, hasRamp: true, rampCondition: '平缓',
        hasThreshold: true, thresholdHeight: 3, doorType: '平开门', needAssistToOpen: true
      }
    ],
    facilities: {
      elevator: { has: false, location: '', status: 'na', note: '单层建筑，无需电梯' },
      accessibleToilet: { has: true, location: '食堂内西北角', status: 'open', note: '' },
      pathCondition: '室内平整', otherObstacles: '入口为较重平开门，高峰期人流多'
    },
    steps: ['到达食堂西侧门厅', '经无障碍坡道至门前', '门为较重的平开门，可能需他人协助推开', '室内为单层，通道平整'],
    evidenceIds: ['ev004'], lastVerifiedAt: '2026-09-05', collectedBy: '志愿者-方', isTestData: false
  },
  {
    id: 'p004', name: '体育馆', category: '体育馆',
    address: '东区运动场旁', openTime: '',
    location: { latitude: 30.5128, longitude: 114.4022 },
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
    location: { latitude: 30.5155, longitude: 114.3985 },
    needElevatorToTarget: true, needAccessibleToilet: false, // 主要实验室在 3 楼，需上楼
    entrances: [
      {
        id: 'e005', name: '北门无障碍入口', direction: '北侧广场，平坡进入',
        location: { latitude: 30.51556, longitude: 114.39844 }, isRecommended: true,
        hasSteps: false, stepCount: 0, hasRamp: true, rampCondition: '平缓',
        hasThreshold: false, thresholdHeight: 0, doorType: '自动门', needAssistToOpen: false
      },
      {
        id: 'e005b', name: '东门次入口', direction: '东侧，有一级 2cm 门槛',
        location: { latitude: 30.51548, longitude: 114.39862 }, isRecommended: false,
        hasSteps: false, stepCount: 0, hasRamp: true, rampCondition: '平缓',
        hasThreshold: true, thresholdHeight: 2, doorType: '推拉门', needAssistToOpen: false
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
