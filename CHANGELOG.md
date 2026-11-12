# Changelog

所有项目的重要变更都将记录在本文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [v1.2.1] - 2026-11-12

### 修复 (Bug Fixes)
- 修复项目表单中编辑器选项渲染逻辑

## [v1.2.0] - 2026-11-05

### 新功能 (Features)
- 记住上次选中的工作区并支持项目级编辑器选择
- 列表视图中显示项目备注 (description)

## [v1.1.1] - 2026-11-02

### 修复 (Bug Fixes)
- 更新图标资源与若干功能修复

## [v1.1.0] - 2026-09-04

### 新功能 (Features)
- 添加 Electron 打包为可执行文件的能力
- 解决工作区计数与项目状态的惰性更新问题

### 修复 (Bug Fixes)
- 修复全局环境变量污染导致的子进程环境错误
- 修复 Ctrl+F 快捷键失效
- 扫描目录输入裸盘符 (如 D:) 时解析到错误目录
- 修复排序路由 404 及若干界面/终端优化

### 重构 (Refactoring)
- 按运行时边界收敛散落的常量

### 文档 (Documentation)
- 重写 README 并补充 MIT 许可证

### 杂项 (Chores)
- ignore .codebuddy directory

### UI/UX 改进
- Electron 应用新增并应用图标
- 项目卡片新增"编辑"按钮
- 优化"移动到工作区"交互：级联子菜单 + 撤销反馈

## v1.0.0 - 2026-09-03

### 新功能 (Features)
- 实现开发者项目管理工作台初始版本
