// 模拟多模态模型识别输出（按采集步骤 key 返回固定 JSON 结构）
// 真实接入时，由云函数调用大模型返回同结构；此处用于演示「AI 预填 → 人工确认」
module.exports = {
  entrance: {
    facilityType: 'entrance',
    detected: { hasSteps: false, hasRamp: true, hasElevator: false, hasDoor: true, hasToiletSign: false, hasAccessibleSign: true },
    observable: { stepCount: 0, doorType: '自动门', rampCondition: '平缓' },
    ocrText: '开放时间 08:00-22:00',
    basis: '画面中可见平缓坡道与自动门，右侧立有无障碍标志',
    confidence: 'high',
    unknownFields: ['thresholdHeight'],
    suggestRetake: []
  },
  path: {
    facilityType: 'path',
    detected: { hasSteps: false, hasRamp: false, hasElevator: false, hasDoor: false, hasToiletSign: false, hasAccessibleSign: false },
    observable: { surface: '平整硬质路面' },
    ocrText: '',
    basis: '画面为道路到入口的连续通道，未见明显障碍',
    confidence: 'medium',
    unknownFields: ['width'],
    suggestRetake: ['建议补拍通道最窄处以判断宽度']
  },
  step: {
    facilityType: 'steps',
    detected: { hasSteps: true, hasRamp: false, hasElevator: false, hasDoor: false, hasToiletSign: false, hasAccessibleSign: false },
    observable: { stepCount: 4, thresholdHeight: 0 },
    ocrText: '',
    basis: '画面中可数出约 4 级台阶，未见坡道',
    confidence: 'high',
    unknownFields: [],
    suggestRetake: []
  },
  elevator: {
    facilityType: 'elevator',
    detected: { hasSteps: false, hasRamp: false, hasElevator: true, hasDoor: true, hasToiletSign: false, hasAccessibleSign: false },
    observable: { elevatorStatus: 'normal' },
    ocrText: '电梯年检合格 下次检验 2027-03',
    basis: '画面为电梯厅门，门体无停运张贴',
    confidence: 'high',
    unknownFields: ['buttonHeight', 'cabinSize'],
    suggestRetake: ['建议补拍轿厢内部以确认空间']
  },
  toilet: {
    facilityType: 'accessibleToilet',
    detected: { hasSteps: false, hasRamp: false, hasElevator: false, hasDoor: true, hasToiletSign: true, hasAccessibleSign: true },
    observable: { toiletStatus: 'open' },
    ocrText: '无障碍卫生间',
    basis: '画面可见无障碍卫生间标识牌与门',
    confidence: 'high',
    unknownFields: [],
    suggestRetake: []
  },
  notice: {
    facilityType: 'notice',
    detected: { hasSteps: false, hasRamp: false, hasElevator: false, hasDoor: false, hasToiletSign: false, hasAccessibleSign: false },
    observable: {},
    ocrText: '通知：本电梯自 9 月 20 日起停运检修，预计三天',
    basis: 'OCR 从张贴通知中提取到停运信息',
    confidence: 'high',
    unknownFields: [],
    suggestRetake: []
  }
};
