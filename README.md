# mimo2openai

将 Xiaomi MiMo TTS API 转换为 OpenAI 兼容的 TTS 接口，部署在 Vercel 上。

## 功能

- 接收 OpenAI 格式的 `POST /v1/audio/speech` 请求
- 转换为 MiMo `POST /v1/chat/completions` 格式
- 支持非流式和流式（streaming）响应
- 支持 OpenAI 语音名称自动映射到 MiMo 预置音色
- 支持通过 `speed` 参数控制语速

## 语音映射

| OpenAI Voice | MiMo Voice | 描述 |
|---|---|---|
| `alloy` | `mimo_default` | 默认音色 |
| `echo` | `苏打` | 中文男声 |
| `fable` | `茉莉` | 中文女声 |
| `onyx` | `白桦` | 中文男声 |
| `nova` | `冰糖` | 中文女声 |
| `shimmer` | `Mia` | 英文女声 |
| `coral` | `Chloe` | 英文女声 |

也可直接使用 MiMo 音色名（如 `Milo`、`Dean` 等）。

## 部署

### 前置要求

- Node.js 18+
- Vercel 账号
- MiMo API Key（从 [platform.xiaomimimo.com](https://platform.xiaomimimo.com) 获取）

### 步骤

1. 将此项目推送到 GitHub
2. 在 Vercel 中导入该 GitHub 仓库
3. 无需配置环境变量（API Key 通过请求头传入）
4. 部署完成后即可使用

### 本地开发

```bash
npm install
npx vercel dev
```

## 使用示例

### 非流式

```bash
curl -X POST https://your-project.vercel.app/v1/audio/speech \
  -H "Authorization: Bearer $MIMO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"tts-1","input":"你好，世界！","voice":"nova"}' \
  --output speech.wav
```

### 流式

```bash
curl -X POST https://your-project.vercel.app/v1/audio/speech \
  -H "Authorization: Bearer $MIMO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"tts-1","input":"你好，世界！","voice":"nova","stream":true}' \
  --output speech.wav
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-mimo-api-key",
    base_url="https://your-project.vercel.app/v1"
)

speech = client.audio.speech.create(
    model="tts-1",
    voice="nova",
    input="你好，世界！"
)

with open("speech.wav", "wb") as f:
    f.write(speech.content)
```

## 请求参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `model` | string | 否 | 模型名称（会被忽略，始终使用 `mimo-v2.5-tts`） |
| `input` | string | 是 | 要合成的文本 |
| `voice` | string | 否 | 语音名称，默认 `mimo_default` |
| `response_format` | string | 否 | 响应格式，默认返回 WAV |
| `instructions` | string | 否 | 语音风格指令 |
| `speed` | number | 否 | 语速（0.25-4.0），通过自然语言指令控制 |
| `stream` | boolean | 否 | 是否启用流式响应 |

## 注意事项

- MiMo API 仅支持 WAV 和 PCM16 格式输出，因此无论请求的 `response_format` 是什么，实际返回的都是 WAV 格式音频
- `speed` 参数通过自然语言指令近似控制，效果可能不如原生支持精确
- 流式模式下，MiMo 返回的 SSE chunks 会被实时解码并转发为二进制音频流

## License

MIT
