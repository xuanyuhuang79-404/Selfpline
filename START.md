# Selfpline 本地稳定启动说明

## 1. 启动顺序

1. 先启动后端。
2. 确认后端监听 `localhost:8080`。
3. 再启动前端静态服务器。
4. 访问 `http://127.0.0.1:5800/index.html`。

## 2. 后端启动

本项目后端按 Java 17 编译运行。当前推荐 JDK 路径：

```text
C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot
```

如果终端里的 `mvn -version` 显示 Java 不是 17，请先在当前 PowerShell 会话设置：

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
mvn -version
```

在项目根目录运行：

```powershell
mvn -f backend/pom.xml spring-boot:run
```

默认端口来自 `backend/src/main/resources/application.yml`：

```yaml
server:
  port: 8080
```

启动完成后，后端应在 `http://localhost:8080` 提供服务。若显式启用了 `application-dev.yml`，请确保 `SERVER_PORT=8080`，否则需要同步修改前端 `API_BASE_URL` 和后端 CORS 来源。

## 3. 前端启动

当前前端是静态 `index.html` + 原生 CSS/JS，不需要 npm、Vite、Webpack、React 或 Vue。

推荐使用项目内置的固定端口静态服务器。它不会像 Live Server 一样自动跳端口；如果端口不可用，会直接提示原因。

当前固定前端端口为 `5800`。选择 `5800` 是因为部分 Windows 环境会保留 `5486-5585` 端口段，`5500` 可能无法绑定，Live Server 因此会反复跳到其他端口。

在项目根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-frontend.ps1
```

固定访问地址：

```text
http://127.0.0.1:5800/index.html
```

也可以在 VS Code 中运行任务：`Terminal` -> `Run Task...` -> `Start frontend static server`。

Live Server 仍保留为备选方案，项目已在 `.vscode/settings.json` 固定：

```json
{
    "liveServer.settings.host": "localhost",
    "liveServer.settings.port": 5800,
    "liveServer.settings.useLocalIp": false,
    "liveServer.settings.root": "/frontend"
}
```

固定访问地址：

```text
http://localhost:5800/index.html
http://127.0.0.1:5800/index.html
```

如果 `5800` 被占用，请先释放该端口。不要依赖 Live Server 自动跳到随机端口；确实需要改端口时，必须同时更新 `scripts/start-frontend.ps1` 的启动参数、`.vscode/settings.json`、`WebMvcConfig` 的 CORS 来源和本文档。

## 4. API 地址

所有前端请求统一走 `frontend/js/api/api-client.js`：

```js
const API_BASE_URL = 'http://localhost:8080/api';
```

登录接口：

```text
POST http://localhost:8080/api/user/login
```

注册接口：

```text
POST http://localhost:8080/api/user/register
```

前端端口只负责静态页面访问，不用于推断后端端口。

## 5. CORS 来源

后端开发环境允许以下前端来源：

```text
http://localhost:*
http://127.0.0.1:*
```

当前推荐前端地址仍是 `http://127.0.0.1:5800/index.html`。后端会优先通过 `CorsFilter` 处理 `/api/**` 的跨域请求，允许 `GET`、`POST`、`PUT`、`DELETE`、`OPTIONS`，允许请求头 `Content-Type`、`Authorization`、`Accept`，并暴露 `Authorization` 响应头。

前端连通性判断使用 `GET http://localhost:8080/api/health`，不会再请求 `http://localhost:8080/` 根路径。

## 6. 常见问题

- `8080` 被占用：关闭占用 `8080` 的进程，或统一修改 `application.yml`、`api-client.js` 和 CORS 配置后再启动。
- `5800` 被占用：关闭占用 `5800` 的进程，或统一修改前端静态服务器端口和 CORS 来源；不要让 Live Server 随机跳端口后继续联调。
- Live Server 一直从 `5584`、`5585` 跳端口：先运行 `netsh interface ipv4 show excludedportrange protocol=tcp` 查看 Windows 保留端口段；如果包含 `5500`，请使用本文推荐的 `scripts/start-frontend.ps1`。
- `ERR_CONNECTION_REFUSED`：通常表示后端未启动或端口不对，先运行 `mvn -f backend/pom.xml spring-boot:run`。
- `404`：表示接口路径不存在，请检查前端请求路径和后端 Controller 注解是否一致。
- CORS 错误：检查前端是否运行在 `localhost` 或 `127.0.0.1` 来源，并确认后端已重启加载最新 `WebMvcConfig`。

## 7. 前端错误提示

- 后端未启动：`后端服务未启动或无法连接，请先运行 mvn -f backend/pom.xml spring-boot:run`
- 接口 404：`接口路径不存在，请检查前后端接口路径`
- CORS 被阻止：`跨域请求被阻止，请检查后端 CORS 配置和前端端口`
- 后端 500：`后端服务异常，请查看后端日志`
