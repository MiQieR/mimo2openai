# mimo2openai

将 Xiaomi MiMo TTS API 转换为 OpenAI 兼容的 TTS 接口，部署在 Vercel 上。

## 功能

- 接收 OpenAI 格式的 `POST /v1/audio/speech` 请求
- 转换为 MiMo `POST /v1/chat/completions` 格式
- 支持非流式和流式（streaming）响应
- 支持所有 MiMo 预置音色名直接使用
- 支持 OpenAI 音色名别名（alloy/echo/fable/onyx/nova/shimmer/coral）
- 支持通过 `instructions` 和 `speed` 参数控制语音风格

## 认证

本服务使用两层密钥：

| 环境变量 | 用途 | 存储位置 |
|---|---|---|
| `PROXY_API_KEY` | 用户认证密钥，配置在 TTS 客户端中 | Vercel 环境变量 |
| `MIMO_API_KEY` | MiMo API 密钥，用于转发请求 | Vercel 环境变量（不暴露给用户） |

用户通过 `Authorization: Bearer <PROXY_API_KEY>` 认证，服务端使用 `MIMO_API_KEY` 调用 MiMo API。

## 语音名称

支持直接使用 MiMo 音色名，也支持 OpenAI 音色名别名：

| OpenAI 别名 | MiMo 音色 | 语言 | 性别 |
|---|---|---|---|
| `alloy` | `mimo_default` | - | - |
| `echo` | `苏打` | 中文 | 男 |
| `fable` | `茉莉` | 中文 | 女 |
| `onyx` | `白桦` | 中文 | 男 |
| `nova` | `冰糖` | 中文 | 女 |
| `shimmer` | `Mia` | 英文 | 女 |
| `coral` | `Chloe` | 英文 | 女 |

直接使用 MiMo 音色名（如 `冰糖`、`Milo`、`Dean` 等）会原样传递，也可使用 `mimo_default`。

## 部署

### 前置要求

- Node.js 18+
- Vercel 账号
- MiMo API Key（从 [platform.xiaomimimo.com](https://platform.xiaomimimo.com) 获取）

### 步骤

1. 将此项目推送到 GitHub
2. 在 Vercel 中导入该 GitHub 仓库
3. 在 Vercel 项目 **Settings → Environment Variables** 中配置：
   - `MIMO_API_KEY` = 你的 MiMo API Key
   - `PROXY_API_KEY` = 自定义的代理密钥（随机字符串，用于客户端认证）
4. 部署完成后，在 TTS 客户端中配置：
   - API 地址：`https://your-project.vercel.app/v1`
   - API 密钥：你设置的 `PROXY_API_KEY` 值

### 本地开发

```bash
npm install
export MIMO_API_KEY="your-mimo-api-key"
export PROXY_API_KEY="your-proxy-key"
npx vercel dev
```

## 使用示例

### 非流式

```bash
curl -X POST https://your-project.vercel.app/v1/audio/speech \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"tts-1","input":"你好，世界！","voice":"冰糖"}' \
  --output speech.wav
```

### 流式

```bash
curl -X POST https://your-project.vercel.app/v1/audio/speech \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"tts-1","input":"你好，世界！","voice":"冰糖","stream":true}' \
  --output speech.wav
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-proxy-api-key",
    base_url="https://your-project.vercel.app/v1"
)

speech = client.audio.speech.create(
    model="tts-1",
    voice="冰糖",
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
| `voice` | string | 否 | 语音名称，默认 `mimo_default`。支持 MiMo 原名和 OpenAI 别名 |
| `response_format` | string | 否 | 响应格式，默认返回 WAV |
| `instructions` | string | 否 | 语音风格指令 |
| `speed` | number | 否 | 语速（0.25-4.0），通过自然语言指令控制 |
| `stream` | boolean | 否 | 是否启用流式响应 |

## 注意事项

- MiMo API 仅支持 WAV 和 PCM16 格式输出，因此无论请求的 `response_format` 是什么，实际返回的都是 WAV 格式音频
- `speed` 参数通过自然语言指令近似控制，效果可能不如原生支持精确
- 流式模式下，MiMo 返回的 SSE chunks 会被实时解码并转发为二进制音频流
- MiMo TTS 当前限时免费

## License

MIT
