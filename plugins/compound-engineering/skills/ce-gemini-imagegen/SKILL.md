---
name: ce-gemini-imagegen
description: 使用 Gemini API（Nano Banana Pro）生成和编辑 images 时使用此 skill。适用于从 text prompts 创建 images、编辑 existing images、应用 style transfers、生成带文字的 logos、创建 stickers、product mockups，或任何 image generation/manipulation task。支持 text-to-image、image editing、multi-turn refinement，以及从多个 reference images 组合。
---

# Gemini Image Generation（Gemini 图像生成，Nano Banana Pro）

使用 Google 的 Gemini API 生成和编辑 images。必须设置 environment variable `GEMINI_API_KEY`。

## Default Model（默认 Model，默认模型）

| Model（模型） | Resolution（分辨率） | Best For（适用场景） |
|-------|------------|----------|
| `gemini-3-pro-image-preview` | 1K-4K | All image generation（默认） |

**Note：** 始终使用此 Pro model。只有在明确要求时才使用其他 model。

## Quick Reference（快速参考）

### Default Settings（默认设置）
- **Model（模型）:** `gemini-3-pro-image-preview`
- **Resolution（分辨率）:** 1K（默认，options：1K、2K、4K）
- **Aspect Ratio（宽高比）:** 1:1（默认）

### Available Aspect Ratios（可用宽高比）
`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`

### Available Resolutions（可用分辨率）
`1K` (default), `2K`, `4K`

## Core API Pattern（核心 API 模式）

```python
import os
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# Basic generation (1K, 1:1 - defaults)
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["Your prompt here"],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
    ),
)

for part in response.parts:
    if part.text:
        print(part.text)
    elif part.inline_data:
        image = part.as_image()
        image.save("output.png")
```

## Custom Resolution & Aspect Ratio（自定义分辨率与宽高比）

```python
from google.genai import types

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[prompt],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",  # Wide format
            image_size="2K"       # Higher resolution
        ),
    )
)
```

### Resolution Examples（分辨率示例）

```python
# 1K (default) - Fast, good for previews
image_config=types.ImageConfig(image_size="1K")

# 2K - Balanced quality/speed
image_config=types.ImageConfig(image_size="2K")

# 4K - Maximum quality, slower
image_config=types.ImageConfig(image_size="4K")
```

### Aspect Ratio Examples（宽高比示例）

```python
# Square (default)
image_config=types.ImageConfig(aspect_ratio="1:1")

# Landscape wide
image_config=types.ImageConfig(aspect_ratio="16:9")

# Ultra-wide panoramic
image_config=types.ImageConfig(aspect_ratio="21:9")

# Portrait
image_config=types.ImageConfig(aspect_ratio="9:16")

# Photo standard
image_config=types.ImageConfig(aspect_ratio="4:3")
```

## Editing Images（编辑 Images）

将 existing images 与 text prompts 一起传入：

```python
from PIL import Image

img = Image.open("input.png")
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["Add a sunset to this scene", img],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
    ),
)
```

## Multi-Turn Refinement（多轮细化）

使用 chat 做 iterative editing：

```python
from google.genai import types

chat = client.chats.create(
    model="gemini-3-pro-image-preview",
    config=types.GenerateContentConfig(response_modalities=['TEXT', 'IMAGE'])
)

response = chat.send_message("Create a logo for 'Acme Corp'")
# Save first image...

response = chat.send_message("Make the text bolder and add a blue gradient")
# Save refined image...
```

## Prompting Best Practices（Prompting 最佳实践）

### Photorealistic Scenes（写实场景）
包含 camera details：lens type、lighting、angle、mood。
> "A photorealistic close-up portrait, 85mm lens, soft golden hour light, shallow depth of field"
> 中文含义：写实近景肖像，85mm 镜头，柔和 golden hour 光线，浅景深。

### Stylized Art（风格化艺术）
明确指定 style：
> "A kawaii-style sticker of a happy red panda, bold outlines, cel-shading, white background"
> 中文含义：开心 red panda 的 kawaii-style sticker，粗描边，cel-shading，白色背景。

### Text in Images（图片中的文字）
明确 font style 和 placement：
> "Create a logo with text 'Daily Grind' in clean sans-serif, black and white, coffee bean motif"
> 中文含义：创建带有 "Daily Grind" 文字的 logo，clean sans-serif，黑白配色，coffee bean motif。

### Product Mockups（产品 Mockups）
描述 lighting setup 和 surface：
> "Studio-lit product photo on polished concrete, three-point softbox setup, 45-degree angle"
> 中文含义：polished concrete 上的 studio-lit product photo，three-point softbox setup，45 度角。

## Advanced Features（高级功能）

### Google Search Grounding（Google Search Grounding，Google 搜索 grounding）
基于 real-time data 生成 images：

```python
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["Visualize today's weather in Tokyo as an infographic"],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        tools=[{"google_search": {}}]
    )
)
```

### Multiple Reference Images（最多 14 张 Reference Images）
组合来自多个 sources 的 elements：

```python
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[
        "Create a group photo of these people in an office",
        Image.open("person1.png"),
        Image.open("person2.png"),
        Image.open("person3.png"),
    ],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
    ),
)
```

## Important：File Format & Media Type（文件格式与媒体类型）

**CRITICAL：** Gemini API 默认以 JPEG format 返回 images。保存时始终使用 `.jpg` extension，以避免 media type mismatches。

```python
# CORRECT - Use .jpg extension (Gemini returns JPEG)
image.save("output.jpg")

# WRONG - Will cause "Image does not match media type" errors
image.save("output.png")  # Creates JPEG with PNG extension!
```

### Converting to PNG（如有需要）

如果你特别需要 PNG format：

```python
from PIL import Image

# Generate with Gemini
for part in response.parts:
    if part.inline_data:
        img = part.as_image()
        # Convert to PNG by saving with explicit format
        img.save("output.png", format="PNG")
```

### Verifying Image Format（验证图片格式）

使用 `file` command 检查 actual format 与 extension：

```bash
file image.png
# If output shows "JPEG image data" - rename to .jpg!
```

## Notes（说明）

- 所有 generated images 都包含 SynthID watermarks
- Gemini 默认返回 **JPEG format**：始终使用 `.jpg` extension
- Image-only mode（`responseModalities: ["IMAGE"]`）不能与 Google Search grounding 一起使用
- editing 时，以 conversationally 方式描述 changes：model 理解 semantic masking
- 为了速度默认使用 1K resolution；当 quality 很关键时使用 2K/4K
