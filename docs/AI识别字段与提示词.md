# AI 识别字段与提示词规范

## 1. 职责边界

AI 只负责从照片中提取**可见事实**并给出结构化预填：

- 是否看到台阶、坡道、电梯、门、厕所标识、无障碍标志；
- 可数出的台阶数；
- 可读取的门型、电梯状态、厕所开闭状态和通知文字；
- 对不确定项明确标注 `unknown`，并给出补拍建议。

AI **不得**直接输出“可以通行 / 不可通行”，也不得在缺少参照物时猜测宽度、坡度或高度。最终结论只由 `services/ruleEngine.js` 根据用户档案和已确认资料计算。

## 2. 唯一契约

- JSON Schema：`docs/ai-result.schema.json`
- 运行时清洗：`services/aiSchema.js`
- 预置演示结果：`data/aiResults.js`
- 人工确认页面：`pages/ai-confirm/ai-confirm`

真实模型返回结果必须与 Schema 一致；小程序端仍会执行一次清洗，非法枚举、越界数值和错误类型会被丢弃，不会直接写入地点资料。

### 顶层字段

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `facilityType` | string | 固定枚举 | 当前采集步骤对应的设施类型 |
| `detected` | object | 6 个布尔字段全部必填 | 是否看到某类设施 |
| `observable` | object | 只允许契约中的字段 | 可观察的结构化信息 |
| `ocrText` | string | 最多 500 字 | 照片中的通知、开放时间等文字 |
| `basis` | string | 最多 300 字 | 得出识别结果的画面依据 |
| `confidence` | string | `high/medium/low` | 置信等级，不是正确率 |
| `unknownFields` | string[] | 最多 12 项 | 无法判断的字段名 |
| `suggestRetake` | string[] | 最多 5 项 | 可执行的补拍建议 |

### `detected` 字段

| 字段 | 中文标签 | 判定要求 |
|---|---|---|
| `hasSteps` | 台阶 | 画面中明确存在高差台阶 |
| `hasRamp` | 坡道 | 画面中明确存在连续坡面 |
| `hasElevator` | 电梯 | 可见电梯门、轿厢或电梯标识 |
| `hasDoor` | 门 | 可见门体，不推断是否自动 |
| `hasToiletSign` | 厕所标识 | 可见卫生间或无障碍卫生间标识 |
| `hasAccessibleSign` | 无障碍标志 | 可见轮椅等无障碍标识 |

### `observable` 字段

| 字段 | 类型/范围 | 使用场景 |
|---|---|---|
| `stepCount` | 0-30 整数 | 台阶照；必须能逐级数清 |
| `thresholdHeight` | 0-50 cm | 门槛特写；无参照物时必须留空 |
| `doorWidth` | 30-200 cm | 门洞净宽；无参照物时必须留空 |
| `doorType` | 字符串，≤30 字 | 自动门、平开门、需他人开门等 |
| `elevatorStatus` | `normal/fault/unknown` | 电梯是否正常，以现场告示或状态灯为准 |
| `toiletStatus` | `open/closed/unknown` | 厕所开放状态，以门锁或告示为准 |
| `surface` | 字符串，≤80 字 | 路面材质或明显状况，仅描述可见内容 |

## 3. 分步骤采集要求

| 步骤 | 必拍内容 | 主要输出 | 常见错误 |
|---|---|---|---|
| `entrance` 入口全景 | 门体、坡道、台阶、两侧通道 | 设施特征、门型、坡道状态 | 只拍门、不拍地面高差 |
| `path` 连续通道 | 从道路到入口的完整路线、最窄处 | 路面描述、未知宽度 | 用局部照片推断整条路线 |
| `step` 台阶/坡道/门槛 | 正视高差，拍清级数和坡面 | 台阶数、坡道有无、门槛高 | 台阶被遮挡、斜拍导致误数 |
| `door` 门与开门方式 | 门型、把手、按钮、门洞 | 门型、门宽 | 把关闭的自动门判成无法进入 |
| `elevator` 电梯入口与通知 | 电梯门、楼层牌、维修告示 | 电梯有无、运行状态、OCR | 只凭电梯门判断正在运行 |
| `toilet` 无障碍厕所 | 标识牌、门、开闭告示 | 标识、厕所状态 | 把普通厕所标成无障碍厕所 |
| `notice` 现场文字 | 通知全文，保证清晰可读 | OCR 原文 | 只识别半句话、脑补日期 |
| `other` 其他障碍 | 障碍物与剩余通道全景 | 可见障碍描述 | 无参照物时估计剩余宽度 |

## 4. 提示词模板

### System Prompt

```text
你是“路见”校园无障碍信息平台的照片识别助手。你只提取照片中明确可见的事实，为人工确认提供预填，不判断某位用户能否通行。

必须遵守：
1. 只输出一个 JSON 对象，不要输出 Markdown、解释或代码围栏。
2. 严格遵循提供的 JSON Schema；六个 detected 字段必须全部给出布尔值。
3. 看不到、被遮挡、无法确认的内容一律标为 false 或写入 unknownFields，禁止猜测。
4. 没有标准参照物时，不得估算宽度、坡度或高度；相应数值留空并建议补拍。
5. 台阶数只有在画面能逐级数清时才填写。
6. OCR 只保留照片中实际出现的文字；看不清的部分不要补全。
7. basis 只描述画面证据，不写“适合轮椅”“可以通过”等结论。
8. confidence 表示识别可靠程度：清晰完整为 high，局部遮挡为 medium，无法确认主体为 low。
```

### User Prompt

```text
采集步骤：{{stepKey}}
步骤说明：{{stepTitle}}
拍摄要求：{{captureHint}}
是否有标准参照物：{{hasReferenceObject}}
用户补充说明：{{userNote}}

请分析随消息提供的照片，并按以下 Schema 返回 JSON：
{{jsonSchema}}
```

## 5. 输出示例

```json
{
  "facilityType": "steps",
  "detected": {
    "hasSteps": true,
    "hasRamp": false,
    "hasElevator": false,
    "hasDoor": false,
    "hasToiletSign": false,
    "hasAccessibleSign": false
  },
  "observable": {
    "stepCount": 4
  },
  "ocrText": "",
  "basis": "画面正对入口，可逐级数出 4 级连续台阶，未见坡面",
  "confidence": "high",
  "unknownFields": ["thresholdHeight"],
  "suggestRetake": []
}
```

## 6. 失败与脏数据处理

| 编码 | 场景 | 处理方式 |
|---|---|---|
| E01 | 图片模糊、运动拖影 | 返回 `confidence=low`，建议重拍 |
| E02 | 主体被车辆、行人或杂物遮挡 | 标记相关字段 unknown，建议补拍 |
| E03 | 无参照物却要求测量 | 数值留空，写入 `unknownFields` |
| E04 | OCR 只能读到部分文字 | 保留可读部分，并建议补拍通知全景 |
| E05 | 一张图包含多个设施 | 只输出与当前 `stepKey` 对应的设施 |
| E06 | 照片与采集步骤不符 | `facilityType=other`，`confidence=low` |
| E07 | 模型返回非 JSON 或字段缺失 | 服务端解析失败后进入人工兜底 |
| E08 | 超时、限流、服务不可用 | 页面显示失败原因，字段仍可人工填写 |

人工确认页在 AI 失败时会继续展示设施特征、台阶数、门型、电梯/厕所状态和 OCR 输入框，确保识别不可用不会阻断勘察流程。

## 7. 接入真实模型的顺序

1. 小程序上传压缩后的照片到云存储，只把 `fileID` 和步骤上下文发给云函数。
2. 云函数使用本文件提示词调用多模态模型，密钥只保存在服务端环境变量。
3. 云函数先按 `docs/ai-result.schema.json` 校验，再用等价于 `services/aiSchema.js` 的逻辑清洗。
4. 返回结果写入 `inspections` 与 `ai_logs`，由人工确认后才影响地点资料。
5. 保留 E07/E08 两条失败分支，禁止用默认“可通过”掩盖识别失败。
