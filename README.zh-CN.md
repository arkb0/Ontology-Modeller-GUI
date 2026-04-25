# TMK Modeller

#### (Choose your language below / 选择您的语言)
[![English](https://img.shields.io/badge/🌐-English-blue)](README.md)
[![简体中文](https://img.shields.io/badge/🌐-简体中文-red)](README.zh-CN.md)

---

本项目是一个基于 React 的图形化工具，旨在通过直观的交互界面，辅助生成符合 **Task-Method-Knowledge (TMK)** 三类 Schema 规范的结构化 JSON 模型。

## 功能特性

* **Schema 驱动表单**：基于 JSON Schema 自动生成带校验功能的 UI 组件。
* **实时预览**：支持带语法高亮的 JSON 数据实时可视化。
* **主题切换**：内置深色/浅色模式，支持自动识别系统配色偏好。
* **本地文件交互**：支持导入现有 JSON 文件进行二次编辑，并可将结果保存至本地。
* **布局自定义**：可根据操作习惯灵活切换表单与预览面板的左右位置。

## 技术栈

* **框架**：React
* **UI 库**：Material UI (MUI)
* **校验器**：AJV8

## 项目现状 (MVP)

### 已知问题
* **可用性**：仍有提升空间。

## 快速上手

1. **安装依赖**：
   `npm install`
2. **启动项目**：
   `npm start`
3. **操作指南**：
   在上方切换 **Task**、**Method** 或 **Knowledge** 标签页，填写表单字段，点击 “Save JSON” 即可导出对应的模型文件。
