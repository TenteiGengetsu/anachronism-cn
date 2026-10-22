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

