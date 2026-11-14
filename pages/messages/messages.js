const placeService = require('../../services/placeService');
const incidentService = require('../../services/incidentService');
const userService = require('../../services/userService');

const FAC_TEXT = { elevator: '电梯', ramp: '坡道', path: '通道', toilet: '无障碍厕所', door: '门', openTime: '开放时间', other: '其他' };

Page({
  data: {
    messages: [],
    allMessages: [],
    filter: 'all',
    stats: { all: 0, followed: 0, review: 0, unread: 0 },
    emptyText: '暂无状态变化消息。'
  },

  async onShow() {
    const [all, places] = await Promise.all([incidentService.listAll(), placeService.list()]);
    const nameOf = {};
    places.forEach(p => { nameOf[p.id] = p.name; });

    const list = [];
    all.forEach(inc => {
      const pname = inc.placeName || nameOf[inc.placeId] || '某地点';
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
      } else {
        // 已过期待复核：不能从列表里凭空消失，否则用户会以为上报被吞了
        list.push({
          id: 'p' + inc.id,
          type: 'review',
          typeText: '待复核',
          placeId: inc.placeId,
          title: pname + ' · ' + fac + '已过预计结束时间',
          desc: (inc.description || '') + '（等待现场确认是否已恢复）',
          time: inc.expectedEndAt || inc.occurredAt || ''
        });
      }
    });

    // 已订阅地点优先，其次是收藏地点。
    const favs = userService.favorites();
    const subs = userService.subscriptions();
    const readIds = userService.readMessageIds();
    list.forEach(item => {
      item.subscribed = subs.indexOf(item.placeId) >= 0;
      item.favorite = favs.indexOf(item.placeId) >= 0;
      item.followed = item.subscribed || item.favorite;
      item.relationText = item.subscribed ? '已订阅' : (item.favorite ? '已收藏' : '');
      item.unread = readIds.indexOf(item.id) < 0;
    });
    list.sort((a, b) => {
      const as = a.subscribed ? 1 : 0;
      const bs = b.subscribed ? 1 : 0;
      if (as !== bs) return bs - as;
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

    this.setData({
      allMessages: list,
      stats: {
        all: list.filter(x => x.type !== 'system').length,
        followed: list.filter(x => x.followed).length,
        review: list.filter(x => x.type === 'review').length,
        unread: list.filter(x => x.unread).length
      }
    }, () => { this.applyFilter(); this.updateBadge(); });
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter }, () => this.applyFilter());
  },

  applyFilter() {
    const f = this.data.filter;
    let messages = this.data.allMessages;
    if (f === 'followed') messages = messages.filter(x => x.followed);
    if (f === 'review') messages = messages.filter(x => x.type === 'review');
    const emptyText = f === 'followed' ? '订阅或收藏地点发生变化后，会显示在这里。' : (f === 'review' ? '目前没有等待现场复核的事件。' : '暂无状态变化消息。');
    this.setData({ messages, emptyText });
  },

  updateBadge() {
    const count = this.data.stats.unread;
    if (count > 0) wx.setTabBarBadge({ index: 3, text: String(Math.min(count, 99)) });
    else wx.removeTabBarBadge({ index: 3 });
  },

  markAllRead() {
    const ids = this.data.allMessages.filter(x => x.type !== 'system').map(x => x.id);
    userService.markMessagesRead(ids);
    const allMessages = this.data.allMessages.map(x => Object.assign({}, x, { unread: false }));
    this.setData({ allMessages, stats: Object.assign({}, this.data.stats, { unread: 0 }) }, () => { this.applyFilter(); this.updateBadge(); });
    wx.showToast({ title: '已全部标为已读', icon: 'none' });
  },

  open(e) {
    const id = e.currentTarget.dataset.id;
    const mid = e.currentTarget.dataset.mid;
    if (mid) userService.markMessagesRead([mid]);
    if (id) wx.navigateTo({ url: '/pages/place-detail/place-detail?id=' + id });
  },

  goMap() { wx.switchTab({ url: '/pages/map/map' }); }
});
