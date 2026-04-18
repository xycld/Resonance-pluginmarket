# 贡献指南

## 提交新插件

1. 在独立 GitHub 仓库维护插件代码，根目录包含 `manifest.json`
2. Fork 本仓库
3. 在 `plugins-list/` 创建 `{plugin-name}.json`
4. 提交 PR，标题格式：`Add plugin: {plugin-name}`

### manifest.json 要求

```json
{
  "manifest_version": 3,
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "插件描述",
  "author": "Your Name",
  "permissions": ["storage"],
  "hooks": ["audio:beforeRecord"],
  "providers": [],
  "entry": "index.js",
  "api_version": "3.0"
}
```

### 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 读写插件私有存储 |
| `network` | 发起网络请求 |
| `content:read` | 读取歌词/曲库内容 |
| `content:write` | 写入歌词/曲库内容 |
| `audio:read` | 读取音频数据 |
| `audio:write` | 写入音频数据 |
| `fs` | 文件系统读写 |

### 安全要求

- 禁止 `eval`、`child_process` 等危险 API
- ZIP 大小不超过 5MB
- 权限申请需与实际功能匹配
