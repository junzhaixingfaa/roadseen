const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');

const FAC_TEXT = { elevator: '电梯', ramp: '坡道', path: '通道', toilet: '无障碍厕所', door: '门', openTime: '开放时间', other: '其他' };

Page({
  data: {
    messages: []
  },

  async onShow() {
    const list = [];
    const all = await incidentService.listAll();
    for (const inc of all) {
      const place = await placeService.get(inc.placeId);
      const pname = place ? place.name : '某地点';
      const fac = FAC_TEXT[inc.facility] || '设施';
      if (inc.status === 'resolved') {
        list.push({
          id: 'r' + inc.id,
          type: 'recover',
          typeText: '状态恢复',
          placeId: inc.placeId,
          title: pname + ' · ' + fac + '已恢复',
          desc: inc.description || '现场已确认可正常使用。',
          time: inc.resolvedAt || inc.occurredAt || ''
        });
      } else if (inc.status === 'active') {
        list.push({
          id: 'a' + inc.id,
          type: 'incident',
          typeText: '动态事件',
          placeId: inc.placeId,
          title: pname + ' · ' + fac + (inc.type ? ('：' + inc.type) : '出现异常'),
          desc: (inc.description || '') + (inc.expectedEndAt ? ('（预计 ' + inc.expectedEndAt + ' 结束）') : ''),
          time: inc.occurredAt || ''
        });
      }
    }

    // 收藏地点的变化优先展示
    const favs = userService.favorites();
    list.sort((a, b) => {
      const af = favs.indexOf(a.placeId) >= 0 ? 1 : 0;
      const bf = favs.indexOf(b.placeId) >= 0 ? 1 : 0;
      if (af !== bf) return bf - af;
      return (b.time || '').localeCompare(a.time || '');
    });

    // 一条固定的引导消息（原型演示用）
    list.unshift({
      id: 'welcome',
      type: 'system',
      typeText: '系统',
      placeId: '',
      title: '欢迎使用「路见」',
      desc: '收藏的地点若发生电梯停运、施工等变化，会在这里提醒你。',
      time: ''
    });

    this.setData({ messages: list });
  },

  open(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + id });
  },

  goMap() { wx.switchTab({ url: '/pages/map/map' }); }
});
