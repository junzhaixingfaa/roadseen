// 全局配置：校园坐标、类别、有效期、状态字典、事件类型
const { STATUS } = require('../utils/status');

module.exports = {
  center: { latitude: 39.7835, longitude: 116.5075 }, // 北京·亦庄（示例校园中心，可换成真实坐标）
  defaultZoom: 16,
  categories: ['教学楼', '图书馆', '食堂', '卫生间', '商店', '体育馆', '实验楼', '宿舍'],
  evidenceValidDays: 180,
  statusDict: STATUS,
  incidentTypes: [
    { code: 'elevator', label: '电梯停运', facility: 'elevator' },
    { code: 'construction', label: '施工封闭', facility: 'path' },
    { code: 'occupation', label: '坡道/通道占用', facility: 'ramp' },
    { code: 'toilet', label: '无障碍厕所关闭', facility: 'toilet' },
    { code: 'door', label: '自动门故障', facility: 'door' },
    { code: 'openTime', label: '开放时间变化', facility: 'openTime' },
    { code: 'other', label: '其他问题', facility: 'other' }
  ]
};
