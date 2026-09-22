// 预置用户（含不同角色与档案，便于「我的」页切换演示）
module.exports = [
  {
    id: 'user-001', nickname: '演示用户A（轮椅·常有人陪同）', role: 'user',
    profile: {
      device: '手动轮椅', deviceWidth: 70, accompanied: true,
      mustUseElevator: true, acceptLowThreshold: false, acceptAssist: true
    }
  },
  {
    id: 'user-002', nickname: '演示用户B（电动轮椅·独立出行）', role: 'user',
    profile: {
      device: '电动轮椅', deviceWidth: 78, accompanied: false,
      mustUseElevator: true, acceptLowThreshold: false, acceptAssist: false
    }
  },
  {
    id: 'user-003', nickname: '志愿者（无档案）', role: 'volunteer',
    profile: null
  },
  {
    id: 'user-004', nickname: '平台管理员', role: 'admin',
    profile: null
  },
  {
    id: 'user-005', nickname: '场所维护者（测试账号）', role: 'maintainer',
    profile: null
  }
];
