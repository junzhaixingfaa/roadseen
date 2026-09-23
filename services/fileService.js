// 采集照片持久化。
// chooseMedia 返回的是临时路径，小程序重启后失效；写进勘察记录或事件前必须转成本地永久文件，
// 否则管理员审核时照片会裂图，「看证据」这一环直接失效。
// 保存失败时退回临时路径，至少保证当次会话内可用。
function persist(tempPath) {
  return new Promise(resolve => {
    if (!tempPath) { resolve(''); return; }
    try {
      wx.getFileSystemManager().saveFile({
        tempFilePath: tempPath,
        success: res => resolve(res.savedFilePath || tempPath),
        fail: () => resolve(tempPath)
      });
    } catch (e) {
      resolve(tempPath);
    }
  });
}

module.exports = { persist };
