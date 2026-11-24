# 5,000 词版本：资料来源与授权

## VOLUBILIS 泰中词典
Belisan / VOLUBILIS: https://belisan-volubilis.blogspot.com/
使用 VOLUBILIS-Duo-Max-ZHO.xlsx 中的泰语词头、中文释义和等级参考。
CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
修改包括筛选去重、中文简体化、部分释义修订、追加学习分级、分词及教学例句。

## LEXiTRON 2.0
Copyright NECTEC. 数据页面：https://opend-portal.nectec.or.th/en/dataset/lexitron-2-0
使用 Thai-English 文件中的例句与释义参考，遵循本目录 LEXiTRON-LICENSE.txt 的完整许可。
This product is created by the adaptation of LEXiTRON developed by NECTEC (http://www.nectec.or.th/).
筛选并改编部分例句，添加中文翻译及分词释义。LEXiTRON 原例句不因其他资料的许可而改为 CC BY-SA。

## 维基词典 / Kaikki / Wiktextract
中文维基词典和英文维基词典贡献者，Kaikki.org / Wiktextract 整理。
https://kaikki.org/dictionary/Thai/index.html
CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
英文词典补充发音、非引文例句与译义参考；各例句保留源页面链接。

## 教学整理和音频
新增 2,528 词，共计 5,000 词；每个新增词有整句例句、中文翻译、逐词释义及本地音频。
部分基础例句自编，部分中文翻译逐条整理，其余最初由本地翻译模型生成，已于 2026-09-19 完成一轮 AI 逐句校核，详见文末。
词条、分词释义、自动罗马音和例句尚未经过母语教师逐条审核。逐词释义须结合整句语境理解。
音频由 gTTS 与 Microsoft Edge 的泰语合成发音生成，保存在 dist/audio；软件运行时不调用在线语音服务。
词频与分级参考 FrequencyWords / OpenSubtitles2018：https://github.com/hermitdave/FrequencyWords （CC BY-SA 4.0）。
源文件 URL 与 SHA-256 见 source-downloads.json。构建工具和模型权重不属于学习软件运行依赖。


## 2026-09-18 例句常用词补漏

新增 79 个原本仅出现在例句中的常用词，总词数 5,079。例如 ละลาย（溶解；融化）。新词进入词汇学习、词库检索、每日一学和课程测验，包含罗马拼音、例句、整句中文翻译、分词释义以及离线音频。

词义与读音参考英文维基词典 / Kaikki（https://en.wiktionary.org/）及 VOLUBILIS（https://belisan-volubilis.blogspot.com/），遵循 CC BY-SA 4.0；例句复用原词条，保留原来源和许可记录，部分中文译文按语境修订。每个新词条保留例句来源词字段。原有 5,000 个词条和编号不变，音频直接复用现有统一女声文件。

本批优先补充常用词，没有将所有例句分词自动纳入；数字、人名、标点和可疑拆词片段未批量添加。词义、分级和例句仍为教学整理，未经母语教师逐条审核。更新后按 Ctrl+F5 刷新。


## 2026-09-19 整句中文翻译校核

原标记“自动翻译 · 待校核”的 2,064 条整句译文已完成一次 AI 逐句对照校核：修订 1,685 条，确认保留 379 条，待校核数为 0。重点纠正主语、否定、遗漏、数量单位、地名及专业词误译。已校核例句移除该提示，之后新加入的未校核自动译文仍会显示提示。

校核前后文本、词条编号、来源及有疑义的原句说明，保存在 dist/licenses/translation-review-20260919.json。全库仍为 5,079 词、5,760 条义项例句；泰语原句、罗马音、逐词参考释义、离线音频和学习规则不变。少数原句本身不完整或年份有误的地方，译文作明确说明。

本轮为 AI 翻译校核，不是母语教师或专业教材审定。原例句中的历史、医学和法律陈述不代表当前事实指导。自动罗马音和介绍性例句用法的原有标记保留。更新后按 Ctrl+F5 刷新。


## 2026-09-19 按使用频率重新分级

全部 5,079 个词按综合语料词频重新排序，原课程、词义领域、词长和学习进度均不参与分级。新分配如下：

| 等级 | 词数 | 当前词库内频率顺序 |
|---|---:|---|
| 入门 | 300 | 1—300 |
| 初级 | 600 | 301—900 |
| 中级 | 1,000 | 901—1,900 |
| 中高级 | 1,000 | 1,901—2,900 |
| 高级 | 1,000 | 2,901—3,900 |
| 专业级 | 1,179 | 3,901—5,079 |

“专业级”表示最低频学习组，包含日常少用词，不要求是专业术语。排名针对本词库，并非泰语所有词的总排名，也不是官方能力考试等级。

词频以 [Thai National Corpus（TNC）](https://pythainlp.org/docs/5.3/api/corpus.html#module-pythainlp.corpus.tnc) 为主（60%），结合 [OSCAR Thai / ICU](https://github.com/PyThaiNLP/pythainlp-corpus/blob/master/db.json)（30%）和 [Thai Textbook Corpus（TTC）](https://pythainlp.org/docs/5.3/api/corpus.html#module-pythainlp.corpus.ttc)（10%）。各语料先换算为每百万频次再加权；词组匹配 TNC 的连续二词、三词频率，不用组成词频率推算整词频率。前三种语料未收录时，以 [Phupha](https://doi.org/10.5281/zenodo.18490474) 的每百万频次乘 0.3 补充。权重是本软件的学习方案。

4,993 个词有频率记录（其中 51 个使用补充语料）；86 个未收录词暂列专业级末段，并在词条详情说明。未收录不等于现实中从不使用；统计受语料年代、体裁和分词方式影响。没有人工按词义挪动等级。

逐词原等级、新等级、频次、综合分数和名次见 dist/licenses/frequency-levels-20260919.json；记录也包含数据来源、文件摘要和计算方式。词条编号、内容和全部音频不变。沿用已完成的菜单顺序调整和例句罗马拼音隐藏。更新后按 Ctrl+F5 刷新。
