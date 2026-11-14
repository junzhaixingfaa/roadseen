const photo = id => `/field-survey/photos/${id}.jpg`;

const sites = [
  {
    id: 'xinghuo',
    name: '星火科技大厦',
    category: '写字楼',
    address: '北京市丰台区富丰路与科兴路交叉口西南侧',
    latitude: 39.835420,
    longitude: 116.285783,
    result: 'unknown',
    summary: '楼内有可容纳轮椅的电梯，部分通道设坡道，但侧边入口有台阶，建议提前确认无台阶入口。',
    shortSummary: '有电梯和部分坡道，无台阶入口仍需确认',
    elev: true,
    toilet: false,
    hero: photo(3),
    advice: '优先从正面向物业确认无台阶入口，不建议从侧边台阶或车行出口进入。',
    groups: [
      { title: '周边公交站', note: '富丰桥公交站附近有斜坡，但车辆能否无障碍接驳仍需确认。', images: [photo(1)] },
      { title: '大厦正面', note: '正面可到达大厦，但现场没有清晰标出轮椅入口。', images: [photo(2), photo(3)] },
      { title: '侧边入口', note: '侧边入口有连续台阶，不方便轮椅通行。', images: [photo(4)] },
      { title: '相邻银行坡道', note: '大厦旁民生银行入口设有坡道、扶手和无障碍标识。', images: [photo(5), photo(6)] },
      { title: '楼内电梯', note: '楼内电梯空间可容纳轮椅，可用于楼层通行。', images: [photo(7), photo(8)] },
      { title: '一楼通往厕所', note: '一楼通往厕所的高差处设有坡道，厕所内部设施尚未确认。', images: [photo(9), photo(10)] },
      { title: '地图位置', note: '星火科技大厦位于富丰路与科兴路交叉口西南侧。', images: [photo(11)] },
      { title: '侧边车行出口', note: '侧边出口有人车混行和减速带，不建议作为轮椅首选入口。', images: [photo(12)] }
    ]
  },
  {
    id: 'metro',
    name: '富丰桥地铁站',
    category: '地铁站',
    address: '北京地铁16号线富丰桥站',
    latitude: 39.836228,
    longitude: 116.287023,
    result: 'pass',
    summary: 'B口只有台阶，不适合轮椅；A口和C口设有无障碍电梯及坡道，建议从这两个出入口通行。',
    shortSummary: 'B口不适合轮椅，建议走A口或C口',
    elev: true,
    toilet: true,
    hero: photo(20),
    advice: '轮椅用户请选择A口或C口；到站后可按无障碍标识前往电梯。',
    groups: [
      { title: 'B口', note: 'B口外部只有台阶且未见电梯，不适合轮椅通行。', images: [photo(13), photo(14), photo(15)] },
      { title: '站内前往A口', note: '站内前往A口的通道平整，并有连续方向标识。', images: [photo(16)] },
      { title: 'A口电梯', note: 'A口站内与地面均设电梯，可形成无台阶连接。', images: [photo(17), photo(18)] },
      { title: 'A口坡道', note: 'A口外侧设有带扶手坡道，通行时需留意临时停放车辆。', images: [photo(19), photo(20)] },
      { title: '无障碍提示', note: '现场提示牌标明无障碍电梯位于A口和C口附近。', images: [photo(21)] },
      { title: 'C口电梯', note: 'C口站内与地面均设电梯，可供轮椅出入。', images: [photo(22), photo(23)] }
    ]
  },
  {
    id: 'rtmart',
    name: '大润发（科兴店）',
    category: '商场',
    address: '北京市丰台区邻枫路1号',
    latitude: 39.835433,
    longitude: 116.289124,
    result: 'assist',
    summary: '入口有斜坡且通道顺畅；楼内照片显示的是倾斜自动步道，轮椅可用电梯位置及厕所无障碍厕位仍需确认。',
    shortSummary: '入口顺畅，楼层电梯和无障碍厕位待确认',
    elev: false,
    toilet: false,
    hero: photo(25),
    advice: '进入后先向工作人员确认普通电梯位置，不要把倾斜自动步道作为轮椅通行方案。',
    groups: [
      { title: '到达与入口', note: '门口有斜坡，超市入口平整且未见明显障碍物。', images: [photo(24), photo(25)] },
      { title: '楼层通行设备', note: '照片中是倾斜自动步道，轮椅应寻找普通电梯或向工作人员求助。', images: [photo(26)] },
      { title: '一楼厕所', note: '一楼厕所入口较宽且设低位洗手盆，无障碍厕位和扶手仍待确认。', images: [photo(27)] },
      { title: '地图位置', note: '大润发科兴店位于邻枫路1号，靠近富丰桥地铁站。', images: [photo(28)] }
    ]
  }
];

function findSite(id) {
  return sites.find(site => site.id === id);
}

module.exports = { sites, findSite };
