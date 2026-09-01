import Foundation

enum TreasurePassiveEffect: String, CaseIterable {
    case extraTimeSec
    case comboThreshold
    case reviewSlots
    case secondChance
    case clueExtra
}

struct TreasurePassive: Identifiable, Equatable {
    let id: String
    let chapter: Int
    let name: String
    let fragmentName: String
    let effect: TreasurePassiveEffect
    let value: Int
    let description: String
    let symbolName: String
}

struct TreasurePassiveBonuses: Equatable {
    var extraTimeSeconds = 0
    var comboThresholdReduction = 0
    var reviewSlots = 0
    var secondChances = 0
    var extraClues = 0

    static let none = TreasurePassiveBonuses()
}

struct ChoiceSecondChanceDecision: Equatable {
    var shouldFinalize: Bool
    var usedChances: Int
    var disabledOptions: Set<String>
}

struct TreasurePassiveEngine {
    static let maxFragments = 10

    static let catalog: [TreasurePassive] = [
        TreasurePassive(
            id: "dashanbian_shard",
            chapter: 1,
            name: "打神鞭",
            fragmentName: "靈光碎片",
            effect: .comboThreshold,
            value: 1,
            description: "號令諸神：連擊提前一級亮起。",
            symbolName: "bolt.fill"
        ),
        TreasurePassive(
            id: "qiankunquan_shard",
            chapter: 2,
            name: "乾坤圈",
            fragmentName: "純金殘片",
            effect: .comboThreshold,
            value: 1,
            description: "擲出如流星：連擊再提前一級。",
            symbolName: "circle.fill"
        ),
        TreasurePassive(
            id: "sanjianliangren_shard",
            chapter: 3,
            name: "三尖兩刃刀",
            fragmentName: "神鋒碎刃",
            effect: .secondChance,
            value: 1,
            description: "鋒銳無匹：研墨選擇題多一次刪去錯項的機會。",
            symbolName: "shield.lefthalf.filled"
        ),
        TreasurePassive(
            id: "yinhundeng_shard",
            chapter: 4,
            name: "引魂燈",
            fragmentName: "幽火晶石",
            effect: .clueExtra,
            value: 1,
            description: "照徹迷局：每句可多看一則不同角度的線索。",
            symbolName: "lightbulb.fill"
        ),
        TreasurePassive(
            id: "zhuxianjian_shard",
            chapter: 5,
            name: "誅仙古劍",
            fragmentName: "混元劍鞘",
            effect: .extraTimeSec,
            value: 20,
            description: "劍鞘鎮陣：每關多 20 秒。",
            symbolName: "hourglass"
        ),
        TreasurePassive(
            id: "zhenzhi_shard",
            chapter: 6,
            name: "青玉鎮紙",
            fragmentName: "殘玉",
            effect: .extraTimeSec,
            value: 15,
            description: "壓得住浮躁的筆：每關多 15 秒。",
            symbolName: "hourglass"
        ),
        TreasurePassive(
            id: "chengxin-zhi_shard",
            chapter: 7,
            name: "澄心堂紙",
            fragmentName: "裁片",
            effect: .reviewSlots,
            value: 3,
            description: "紙夠寬：每日複習名額增加 3 句。",
            symbolName: "doc.fill"
        ),
        TreasurePassive(
            id: "zihao-bi_shard",
            chapter: 8,
            name: "宣州紫毫",
            fragmentName: "殘鋒",
            effect: .secondChance,
            value: 1,
            description: "筆鋒聽話：研墨選擇題再多一次補救機會。",
            symbolName: "paintbrush.fill"
        ),
        TreasurePassive(
            id: "tinggui-mo_shard",
            chapter: 9,
            name: "廷珪墨",
            fragmentName: "碎塊",
            effect: .reviewSlots,
            value: 2,
            description: "墨夠濃：每日複習名額再增加 2 句。",
            symbolName: "drop.fill"
        ),
        TreasurePassive(
            id: "duanxi-yan_shard",
            chapter: 10,
            name: "端溪硯",
            fragmentName: "殘石",
            effect: .clueExtra,
            value: 1,
            description: "硯池映文脈：每句再多一則不同角度的線索。",
            symbolName: "square.fill"
        ),
    ]

    func passive(forChapter chapter: Int) -> TreasurePassive? {
        Self.catalog.first { $0.chapter == chapter }
    }

    func isComplete(_ passive: TreasurePassive, in progress: LocalAppProgress) -> Bool {
        guard let item = progress.world?.treasures[passive.id] else { return false }
        return item.complete || item.sources.count >= Self.maxFragments
    }

    func bonuses(in progress: LocalAppProgress) -> TreasurePassiveBonuses {
        var result = TreasurePassiveBonuses.none
        for passive in Self.catalog where isComplete(passive, in: progress) {
            switch passive.effect {
            case .extraTimeSec:
                result.extraTimeSeconds += passive.value
            case .comboThreshold:
                result.comboThresholdReduction += passive.value
            case .reviewSlots:
                result.reviewSlots += passive.value
            case .secondChance:
                result.secondChances += passive.value
            case .clueExtra:
                result.extraClues += passive.value
            }
        }
        return result
    }

    func reviewLimit(base: Int = 5, in progress: LocalAppProgress) -> Int {
        max(0, base) + max(0, bonuses(in: progress).reviewSlots)
    }

    func choiceSecondChanceDecision(
        given: String,
        answer: String,
        options: [String],
        usedChances: Int,
        extraChances: Int,
        disabledOptions: Set<String>
    ) -> ChoiceSecondChanceDecision {
        guard given != answer, usedChances < 1 + max(0, extraChances) else {
            return ChoiceSecondChanceDecision(
                shouldFinalize: true,
                usedChances: usedChances,
                disabledOptions: disabledOptions
            )
        }
        var disabled = disabledOptions
        disabled.insert(given)
        if let removable = options.first(where: {
            $0 != answer && $0 != given && !disabled.contains($0)
        }) {
            disabled.insert(removable)
        }
        return ChoiceSecondChanceDecision(
            shouldFinalize: false,
            usedChances: usedChances + 1,
            disabledOptions: disabled
        )
    }

    func grantingChapterFragment(
        chapter: Int,
        levelID: Int,
        to progress: LocalAppProgress
    ) -> LocalAppProgress {
        guard let passive = passive(forChapter: chapter) else { return progress }
        var next = progress
        var world = next.world ?? .fresh
        var item = world.treasures[passive.id] ?? LocalTreasureProgress(sources: [], complete: false)
        let source = "level:\(levelID)"
        guard !item.sources.contains(source) else { return progress }
        item.sources.append(source)
        item.complete = item.complete || item.sources.count >= Self.maxFragments
        world.treasures[passive.id] = item
        next.world = world
        return next
    }

    func reconcilingCompletedLevels(
        _ levels: [Level],
        in progress: LocalAppProgress
    ) -> LocalAppProgress {
        levels
            .filter { (progress.levels[String($0.id)]?.stars ?? 0) > 0 }
            .sorted { $0.id < $1.id }
            .reduce(progress) { result, level in
                grantingChapterFragment(chapter: level.chapter, levelID: level.id, to: result)
            }
    }
}
