const { getStatus } = require('../../utils/status');

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    code: { type: String, value: 'unknown' }
  },
  data: { text: '', cls: 'unknown' },
  observers: {
    code: function (code) {
      const s = getStatus(code);
      this.setData({ text: s.text, cls: s.cls });
    }
  }
});
