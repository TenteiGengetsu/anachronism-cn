# SF2e Anachronism 中文汉化

基于用户提供的SF2译名表与[SF2中文Wiki](https://sf2.huijiwiki.com/)制作的独立Babele补丁，适用于Foundry VTT14、PF2e8.6.0+、Babele2.9.1+和SF2e Anachronism2.4.0+。Foundry14验证标记沿用用户实测结论；放宽原模组版本上限不表示已核验未来版本的全部内容。

## 安装与更新

在Foundry“安装模组”中填写清单地址：

```text
https://raw.githubusercontent.com/TenteiGengetsu/anachronism-cn/main/module.json
```

在世界中启用Babele、SF2e Anachronism及本补丁，并选择简体中文。更新后先由GM重新进入世界，再让玩家刷新；保留按需加载即可。已导入世界的旧文档和角色副本不会自动替换。

也可下载[最新发布](https://github.com/TenteiGengetsu/anachronism-cn/releases/latest)或[仓库安装包](https://raw.githubusercontent.com/TenteiGengetsu/anachronism-cn/main/dist/anachronism-cn.zip)，解压至`Data/modules/sf2e-anachronism-zh-cn/`，该目录应直接包含`module.json`。

## 当前内容

保留29个导出翻译文件，覆盖5,616个主文档、9个角色包的698个角色与6,719个内嵌条目。主条目及合集采用“中文 English”名称，5,613条名称索引支持中英文搜索与GM/玩家按需读取。界面词典494条，处理异步展开、维持时间与254类授予能力引用名称。

[新增及修订译名汇总](reports/terms.tsv)合并0.3.0至0.3.7已交付记录，去除重复并采用最后确认译名，共946行。文件仅含“中文<TAB>English”，没有标题、版本、说明或状态列。已撤回的编程语言误译不纳入。

0.3.8清理历史重复报告和本地工作临时文件，汇总译名；运行脚本、翻译、双语名称索引及自动化与0.3.7逐字节一致。历史报告、分版译名与旧更新说明保存在[审校档案](reports/localization-audit.zip)，当前复查见[审计结果](reports/audit-0.3.7.json)、[499处字段差异](reports/changes-0.3.7.json)、[显示层验证](reports/display-validation-0.3.7.json)、[搜索索引验证](reports/search-index-validation-0.3.7.json)和[完整校验记录](reports/validation.json)。

## 自动化与显示边界

ID、UUID、规则、谓词、公式及解析用原值保持。内嵌条目、配件和额外字段使用身份及预期原文保护；原文变化时跳过对应覆盖。射程、时间等由PF2e解析的值保留英文，仅翻译显示文字；编辑区和表单原值保留。

唯一既有机械例外是用户明确授权的商用型圣洁模组：在Anachronism2.4.0中，将对邪秽目标的骰数由3d4修正为2d4，同时核对ID、完整源说明和规则。其他型号及不匹配的版本不套用此修正。

5,616个文档已通过Babele2.9.1原生映射、完整结果比较及原文/换ID/重排保护检查；32项实际Chrome DOM检查通过。新增显示脚本尚未在运行中的Foundry世界联调；第三方界面、改写过的原文或重新生成过的内嵌ID可能仍显示英文。枚举标识和代码语言名保留，脚本依赖已安装PF2e中文语言包处理系统本地化键。

## 来源与维护

译名表优先，其次SF2 Wiki，再依模组英文补译。清单里的“模组原文”指Anachronism2.4.0数据，不直接等同于官方出版物。模组、Wiki与官方规则有差异时分别记录；按中文规则圈约定，feet写“尺”、miles写“里”，数值不换算。

修改译文后运行`python tools/build_search_indexes.py`同步双语名称与轻量索引；发布流程检查生成结果与提交一致。源模组新增或改名时，应对应更新`tools/source-names.json`中的英文名称与ID清单。

复用PF2e中文译文的来源及GPLv3许可见[第三方声明](THIRD-PARTY-NOTICES.md)与[完整许可](licenses/GPL-3.0.txt)。
