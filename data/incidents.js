// 动态事件（演示用故障明确标记为测试数据）
// in001：p005 实验楼电梯停运，active，用于演示动态阻断（绿→红，恢复后回绿）
// in002：p003 食堂坡道被占用，resolved，用于演示历史记录
module.exports = [
  {
    id: 'in001', placeId: 'p005', entranceId: '', facility: 'elevator', type: '电梯停运',
    description: '实验楼东侧电梯检修中，预计恢复前请改走其他楼栋或寻求协助',
    imageUrl: '', occurredAt: '2026-09-20', expectedEndAt: '2026-12-31',
    status: 'active', reportBy: 'user-002', confirmCount: 1, isTestData: true
  },
  {
    id: 'in002', placeId: 'p003', entranceId: 'e003', facility: 'ramp', type: '坡道/通道占用',
    description: '西侧坡道曾堆放杂物，已清理',
    imageUrl: '', occurredAt: '2026-08-28', expectedEndAt: '2026-08-30',
    status: 'resolved', resolvedAt: '2026-08-30', reportBy: 'user-001', confirmCount: 2, isTestData: true
  }
];
