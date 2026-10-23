# SF2e Anachronism 中文汉化

基于用户提供的 SF2 译名表与 [SF2 中文 Wiki](https://sf2.huijiwiki.com/) 制作的独立 Babele 中文补丁，适用于 Foundry VTT 14、PF2e 8.6.0+、Babele 2.9.1+ 和 **SF2e Anachronism 2.4.0**。

在 Foundry 的“安装模组”窗口填入下列清单地址：

```text
https://raw.githubusercontent.com/TenteiGengetsu/anachronism-cn/main/module.json
```

在世界中启用 Babele、SF2e Anachronism 与本中文补丁，并使用简体中文界面。也可下载 [安装包](https://raw.githubusercontent.com/TenteiGengetsu/anachronism-cn/main/dist/anachronism-cn.zip)，解压到 `Data/modules/sf2e-anachronism-zh-cn/`；该目录下应直接包含 `module.json`。

本版为 29 个导出文件提供翻译文件，涵盖职业、族裔、传承、背景、专长、动作、法术、装备、状态、神祇、怪物、预设角色与日志页面名称。译文覆盖是部分完成；名称与描述分别统计，详见 [覆盖统计](coverage.json)。缺少对应中文、存在版本冲突或无法保持原 HTML 与宏结构的部分保留英文；日志正文中尚未对应的段落亦保留英文。

译名表优先。Wiki 读取日期为 2026-10-23，读取主命名空间 5,017 页及 Data 命名空间 3,702 页，包含模板字段与嵌套能力。本机 Huiji 客户端在本次读取进程中使用 `sf2` 前缀；未修改全局 MCP 配置。此前仓库中的五个翻译文件在确认源压缩包及译名表哈希一致后复用，基线提交为 `8db9a45a72ec5da605491c38256ca0fb76f6f90f`。

本补丁通过 Babele 在内存中替换显示文字。内嵌物品与日志页面通过 ID 和预期原文匹配，改变过的描述不会被覆盖。UUID、骰式、规则元素、ID、数值字段和图片路径保持原值；源模组版本不为 2.4.0 时跳过注册。

[校验结果](reports/validation.json) 包括 Babele 2.9.1 原生条目匹配、字段映射、完整目标比较、输入不变和过期文本保护。未在运行中的 Foundry 世界实测。审校记录压缩包位于 `reports/localization-audit.zip`，包含每个改动字段的来源定位、Wiki 修订号、已确认冲突及待译字段清单。本次未执行 AoN／原书补证，也未用新译填补缺失的中文来源。


## 0.2.1 加载修复

修复中文语言代码 cn.foundry_chn 未注册导致 Babele 找不到译文的问题，并支持当前中文语言扩展的完整代码。源模组未启用或版本不匹配时会向 GM 显示提示。

通过 GitHub 清单安装的用户：上传此包中的仓库文件时，必须同时覆盖根目录 module.json、scripts/register.mjs 和 dist/anachronism-cn.zip；随后在 Foundry 更新本汉化至 0.2.1，重新进入世界。请同时启用本汉化、Babele 2.9.1 或更新版和 Anachronism 2.4.0，并选择中文界面。译文用于合集中加载的文档；已导入世界的旧副本需另行更新。

## 0.2.2 初始化修复

根据实际控制台日志修复：Babele 初始化早于 Foundry 核心语言设置的注册，0.2.1 在此时读取 core.language 会抛出异常，导致未注册译文。现于初始化阶段直接注册已知中文语言代码，扩展语言代码在 setup 阶段按 game.i18n.lang 补充，彻底移除汉化代码对 core.language 设置的访问；注册异常与未收到初始化事件分别显示提示。

通过清单安装的用户仍须将本版根目录 module.json、scripts/register.mjs 及 dist/anachronism-cn.zip 一并更新到仓库，然后在 Foundry 更新至 0.2.2 并重新进入世界。


## 0.2.3 动作续补与字段纠正

沿用 0.2.2 的 29 个翻译文件、加载脚本、注册语言代码及目录结构。本批只修改动作翻译文件；其余 28 个文件与加载脚本逐字节不变。

动作中文名称从 68/151 增至 89/151；含中文说明的动作从 49/151 增至 85/151。新增内容包括使节指令、科技法师与机械师动作、嵌套在族裔／变体专长中的反应动作，以及伤害、模板与检定的中文对齐。部分条目只有名称或部分段落已汉化。

纠正初学者幸运、重导能量等嵌套动作的触发／效果错位。对持续时间、技能动作、目标限制、邻接条件等与原条目不同的 Wiki 中文保留英文，并记录在 reports/review-conflicts.json 中；未用新译补齐缺失来源。原有数字字段、规则元素、UUID、宏参数与 HTML 标签保持原值。

安装或更新时保持现有路径：清单 module.json 与安装包 dist/anachronism-cn.zip 均已同步为 0.2.3。完整校验结果见 reports/validation.json；未在运行中的 Foundry 世界实测。
