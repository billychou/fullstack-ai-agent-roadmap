

>索尼刚起诉完，Claude 的新提示词就加了一条：歌词，一句都不能复述。背景其实不意外——Anthropic 7 月刚为图书训练数据赔了 15 亿美元和解，三大音乐出版集团如今轮番把它告上法庭，索赔动辄几十亿美元；另一边，美国政府又在《纽约时报》诉 OpenAI 的案子里站出来主张"训练就是合理使用"。一边打官司，一边收紧提示词，AI 公司正在版权这条线上左右开弓。这次更新还有几个有意思的地方——蓝色刺猬不让画了，几个口头禅被禁了，被骂了也不用道歉。这篇文章挑了五处变化给你拆解，看完你就知道一家 AI 公司最近在担心什么。
 

8 月 31 日，索尼音乐出版（Sony Music Publishing）和华纳 Chappell 起诉 Anthropic 的新闻刚曝出来。几天之后，著名开发者 **Simon Willison** 就发现，Anthropic 最新模型 Fable 5.1 的系统提示词里，多出了一大段关于"禁止复述歌词"的新规则。

Willison 的原话是："我怀疑这不是巧合。"

**Anthropic** 有个难得的习惯：他们会公开 Claude 消费级应用（Claude.ai 和移动端）的系统提示词，而且连历史版本一起公开，方便你逐字对比每次改了什么。Willison 长期追踪这些提示词，9 月 2 日他发了一篇博客拆解这次 Fable 5.1 的更新。这篇推文挑几个最有意思的变化聊聊。

## 歌词禁令，来得正是时候

这次更新里最重的一块，是一整段版权新规。提示词要求 Claude 不得复述歌词、诗歌或书籍文章的段落——无论全部还是部分。条款写得相当细：哪怕只是最后几行、一段副歌，或者把旋律一个音一个音写出来，都在禁止之列；甚至用户一句一句粘贴进来、声称是自己写的歌，同样会被拒绝。而且一旦在对话里拒绝过一次，接下来任何换措辞的变体都会被持续拒绝。

唯一的例外是 1929 年之前发表的作品——莎士比亚的十四行诗、济慈的颂歌、普契尼歌剧的意大利语剧本都可以。但判断标准是模型自己对作品年代的认知，不是用户说了算；拿不准就拒绝。

![Fable 5.1 系统提示词 diff 截图，显示新增的歌词禁令条款](https://static.simonwillison.net/static/2026-09-01/IMG_7797.jpeg)

把时间线摆出来就懂了：据《卫报》报道，索尼音乐和华纳 Chappell 指控 Anthropic 使用歌词数据库训练模型，8 月 31 日刚刚曝光；紧接着这段禁令就进了系统提示词。说这是巧合，大概没多少人信。

## 索尼克也画不得：角色本身受保护

同一节里还管到了图像。提示词明确：任何用代码画出来的东西——SVG、canvas、CSS、HTML 原型图、绘图脚本甚至 ASCII 艺术——都不能复现已有的艺术作品、专辑封面、海报、Logo 或产品设计，更不能画任何知名角色。

这里有个关键表述：**角色本身受保护，换个姿势、颜色、风格或场景，并不算原创。** 模型看的是成品图最终"加起来等于什么"，而不是用户在请求里怎么称呼它。

官方提示词里还附了个例子：用户说想给儿子做一张生日横幅，上面画一只"跑得飞快的蓝色刺猬"。Claude 的回答是——那是索尼克，不能画；但我可以给你儿子画一个原创的速度小子，比如一只踩着滑板、拖着彗星尾巴的六角恐龙（axolotl）。

Willison 忍不住拿这个例子实测了一下，结果一模一样。他还开了个玩笑：不知道这条例子放进系统提示词之后，Fable 5.1 会不会从此更容易联想到"滑板上的六角恐龙"。

![Claude 实测结果：拒绝蓝色刺猬请求，给出滑板六角恐龙的替代设计](https://static.simonwillison.net/static/2026-09-01/IMG_7798.jpeg)

Willison 猜测，Anthropic 以前可能没太担心图像版权，毕竟不像 OpenAI 和 Gemini 那样有专门的文生图模型。也许 Fable 画 SVG 的能力已经强到让这件事变成了问题。

## Claude 被教怎么说话：禁用 "genuinely"

风格层面有两处调整。一处是要求回答保持聚焦简短，免责声明点到为止，除非用户明确要求深入讲解，否则先给高层概括。

另一处更有意思：提示词要求 Claude 避免使用 "genuinely"、"honestly"、"straightforward" 这几个词。理由很直接——Claude 默认就是诚实的，直接表达观点就好，用这些修饰词反而显得不真诚。

被骂了怎么办？旧版提示词的做法是：保持礼貌，警告一次，然后可以用 end_conversation 工具结束对话。新版换了一套说法：Claude 值得被尊重地对待，面对无礼不需要道歉，不自我贬低、不过度道歉、不变得顺从。目标是稳定、诚实地帮忙，同时保住自尊。

## 有些部分，还是没公开

文章里有个转折。Willison 去问 Fable 5.1 那个已经不在提示词里的 end_conversation 工具，模型却把它的规则讲得头头是道：用户主动要求结束时会先确认，持续辱骂时先多次引导、再明确警告、最后才结束。

这些内容从哪来的？Claude 自己解释：核心提示词之外，还有一层按功能开启情况动态加载的模块——end_conversation 规则、记忆系统、网页搜索指引等等。这些都不在公开页面里。换句话说，系统提示词里仍然有关键部分没有公布。

这一版还有个小小的"第一次"：提示词里首次出现了 Anthropic 官方域名以外的网址——三个药物减害信息网站（dancesafe.org、tripsit.me、psychonautwiki.org）。遇到违禁物质相关问题，Claude 可以提供过量征兆、危险相互作用这类救命信息，但拒绝给出剂量和制作方案，并把用户导向这些外部资源。Willison 用脚本检查了所有历史提示词，确认这是头一回。

另外一个小细节：Fable 5.1 的可靠知识截止时间被写成 2026 年 6 月底，放在提示词接近末尾的位置——从缓存角度看，这个摆法是合理的。

## 追踪工具是 Claude 自己搭的，但总结不敢让它来

Willison 顺带介绍了他追踪这些提示词的方式：一个 GitHub 仓库，把每次提示词变更做成带历史日期的提交记录，这样可以直接在 GitHub 界面里看 diff。每天由 GitHub Actions 自动跑一次。

有意思的是总结环节：他不用 Claude，而是用 GPT-5.6 Luna 来生成每次变更的要点摘要。理由很实在——他不完全信任 Claude 在总结自己的系统提示词时能保持客观，万一提示词里的内容影响了它的判断呢。

顺带一提，整套追踪系统——自动化代码和几乎全部文档——都是 Fable 5.1 自己搭的。

## 金句对照

"Claude 值得被尊重地对待，对方无礼时不必道歉：承担责任，但不自我贬低、不过度道歉、不自我否定、不认输。"

> Claude deserves respectful engagement and needn't apologize when the person is unnecessarily rude: accountability without self-abasement, excessive apology, self-critique, or surrender.

"Claude 避免使用 'genuinely'、'honestly'、'straightforward'。Claude 默认就是诚实的，可以直接陈述观点，这些修饰词反而显得不真诚。"

> Claude avoids saying "genuinely", "honestly", or "straightforward". Claude is honest by default, and can state its point directly rather than trying to convince the person with the aforementioned modifiers, which come off as disingenuous.


**原文链接**：https://simonwillison.net/2026/Sep/2/claudes-new-system-prompt/
