// 预置用户（含不同角色与档案，便于「我的」页切换演示）
module.exports = [
  {
    id: 'user-001', account: 'demo', password: '123456', nickname: '小路', role: 'user',
    profile: {
      device: '手动轮椅', deviceWidth: 70, accompanied: true,
      mustUseElevator: true, acceptLowThreshold: false, acceptAssist: true
    }
  },
  {
    id: 'user-002', account: 'independent', password: '123456', nickname: '独立出行用户', role: 'user',
    profile: {
      device: '电动轮椅', deviceWidth: 78, accompanied: false,
      mustUseElevator: true, acceptLowThreshold: false, acceptAssist: false
    }
  },
  {
    id: 'user-003', account: 'volunteer', password: 'volunteer123', nickname: '校园志愿者', role: 'volunteer',
    profile: null
  },
  {
    id: 'user-004', account: 'admin', password: 'admin123', nickname: '平台管理员', role: 'admin',
    profile: null
  },
  {
    id: 'user-005', account: 'maintainer', password: 'maintain123', nickname: '场所维护者', role: 'maintainer',
    profile: null
  }
];
