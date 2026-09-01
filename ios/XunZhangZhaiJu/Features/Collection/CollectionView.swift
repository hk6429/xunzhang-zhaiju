import SwiftUI

struct CollectionView: View {
    private enum Tab: String, CaseIterable {
        case phrases = "摘句"
        case wrongBook = "待補的字"
        case treasures = "法寶閣"
    }

    @EnvironmentObject private var container: AppContainer
    @State private var searchText = ""
    @State private var tab: Tab = .phrases
    @State private var typeFilter = "全部"
    @State private var dynastyFilter = "全部"

    var body: some View {
        VStack(spacing: 0) {
            Picker("摘句集分類", selection: $tab) {
                ForEach(Tab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding()

            switch tab {
            case .phrases:
                phrasePane
            case .wrongBook:
                wrongBookPane
            case .treasures:
                treasurePane
            }
        }
        .foregroundStyle(AppTheme.primaryText)
        .background(AppTheme.background)
        .navigationTitle("摘句集")
    }

    @ViewBuilder
    private var phrasePane: some View {
        if collectedPhrases.isEmpty {
            emptyCollection
        } else {
            VStack(spacing: 0) {
                if dueReviewPhrases.isEmpty {
                    Label("今日已複習完畢", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(AppTheme.secondaryText)
                        .padding(.horizontal)
                        .padding(.bottom, 10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityIdentifier("spaced-review-complete")
                } else {
                    NavigationLink {
                        DailyPracticeView(
                            phrases: container.content?.phrases ?? [],
                            phraseIDs: dueReviewPhrases.map(\.id),
                            purpose: .spacedReview
                        )
                    } label: {
                        Label("今日待複習 \(dueReviewPhrases.count) 句", systemImage: "arrow.triangle.2.circlepath")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.accent)
                    .padding(.horizontal)
                    .padding(.bottom, 10)
                    .accessibilityIdentifier("spaced-review-button")
                }
                HStack {
                    filterMenu("文體", selection: $typeFilter, values: typeValues)
                    filterMenu("朝代", selection: $dynastyFilter, values: dynastyValues)
                    Spacer()
                    Text("\(filteredPhrases.count) 句")
                        .font(.caption)
                        .foregroundStyle(AppTheme.secondaryText)
                }
                .padding(.horizontal)
                List(filteredPhrases) { phrase in
                    NavigationLink {
                        KnowledgeCardView(phrase: phrase)
                    } label: {
                        VStack(alignment: .leading, spacing: 5) {
                            HStack {
                                Text(phrase.text).font(.headline)
                                if container.progress.mastery?[phrase.id]?.mastered == true {
                                    Image(systemName: "checkmark.seal.fill")
                                        .foregroundStyle(AppTheme.accent)
                                }
                            }
                            Text("\(phrase.type.rawValue)・\(phrase.meaning)")
                                .font(.subheadline)
                                .lineLimit(2)
                        }
                    }
                }
                .scrollContentBackground(.hidden)
                .searchable(text: $searchText, prompt: "搜尋摘句、作者或朝代")
            }
        }
    }

    private var emptyCollection: some View {
        VStack(spacing: 16) {
            Image("CollectionHeroes")
                .resizable()
                .scaledToFit()
                .clipShape(RoundedRectangle(cornerRadius: 22))
            Text("摘句集還是空的").font(.title2.bold())
            Text("親手找出的真言會收進這裡；請仙人直接揭示的句子，要下次自己破解才算收藏。")
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.secondaryText)
        }
        .padding()
    }

    @ViewBuilder
    private var wrongBookPane: some View {
        if wrongPhrases.isEmpty {
            VStack(spacing: 14) {
                Image(systemName: "pencil.and.scribble")
                    .font(.system(size: 50))
                    .foregroundStyle(AppTheme.accent)
                Text("目前沒有待補的字").font(.title2.bold())
                Text("答錯的句子會來這裡候補；連續答對兩次，就能重新出發。")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(AppTheme.secondaryText)
            }
            .padding()
        } else {
            VStack(spacing: 12) {
                NavigationLink {
                    DailyPracticeView(
                        phrases: container.content?.phrases ?? [],
                        phraseIDs: wrongBookReviewPhrases.map(\.id),
                        purpose: .wrongBook
                    )
                } label: {
                    Label("現在複習 \(wrongBookReviewPhrases.count) 句", systemImage: "arrow.triangle.2.circlepath")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.accent)
                .padding(.horizontal)
                List(wrongPhrases) { phrase in
                    VStack(alignment: .leading, spacing: 5) {
                        Text(phrase.text).font(.headline)
                        let item = container.progress.mastery?[phrase.id]
                        Text("答錯 \(item?.wrong ?? 0) 次・連對 \(item?.correctStreak ?? 0) 次")
                            .font(.caption)
                            .foregroundStyle(AppTheme.secondaryText)
                    }
                }
                .scrollContentBackground(.hidden)
            }
        }
    }

    private var treasurePane: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("封神故事法寶")
                    .font(.title2.bold())
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 155), spacing: 12)], spacing: 12) {
                    ForEach(container.content?.story.treasures ?? []) { treasure in
                        let progress = container.progress.world?.treasures[treasure.id]
                        VStack(alignment: .leading, spacing: 9) {
                            Image(TreasurePresentation.assetName(for: treasure.id))
                                .resizable()
                                .scaledToFit()
                                .frame(maxWidth: .infinity, minHeight: 88, maxHeight: 112)
                                .accessibilityHidden(true)
                            Text(treasure.name).font(.headline)
                            Text(treasure.description)
                                .font(.caption)
                                .foregroundStyle(AppTheme.secondaryText)
                            ProgressView(
                                value: Double(min(2, progress?.sources.count ?? 0)),
                                total: 2
                            )
                            .tint(AppTheme.accent)
                            .accessibilityHidden(true)
                            Text(progress?.complete == true ? "法寶已完整" : "碎片 \(progress?.sources.count ?? 0) / 2")
                                .font(.caption.bold())
                            Label(
                                (progress?.complete == true ? "已生效：" : "集齊後：")
                                    + TreasurePresentation.abilityLabel(for: treasure.ability),
                                systemImage: progress?.complete == true ? "sparkles" : "lock.fill"
                            )
                            .font(.caption)
                            .foregroundStyle(progress?.complete == true ? AppTheme.accent : AppTheme.secondaryText)
                        }
                        .frame(maxWidth: .infinity, minHeight: 280, alignment: .topLeading)
                        .padding()
                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                        .accessibilityElement(children: .combine)
                        .accessibilityIdentifier("treasure-\(treasure.id)")
                    }
                }

                Text("十章修煉法寶")
                    .font(.title2.bold())
                    .padding(.top, 4)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 155), spacing: 12)], spacing: 12) {
                    ForEach(TreasurePassiveEngine.catalog) { passive in
                        let progress = container.progress.world?.treasures[passive.id]
                        let fragmentCount = min(TreasurePassiveEngine.maxFragments, progress?.sources.count ?? 0)
                        let complete = progress?.complete == true
                            || fragmentCount >= TreasurePassiveEngine.maxFragments
                        VStack(alignment: .leading, spacing: 9) {
                            Image(systemName: passive.symbolName)
                                .font(.system(size: 46, weight: .bold))
                                .foregroundStyle(AppTheme.accent)
                                .frame(maxWidth: .infinity, minHeight: 74)
                                .accessibilityHidden(true)
                            Text(passive.name).font(.headline)
                            Text("第 \(passive.chapter) 章・\(passive.fragmentName)")
                                .font(.caption)
                                .foregroundStyle(AppTheme.secondaryText)
                            ProgressView(
                                value: Double(fragmentCount),
                                total: Double(TreasurePassiveEngine.maxFragments)
                            )
                            .tint(AppTheme.accent)
                            .accessibilityHidden(true)
                            Text(complete ? "法寶已集齊" : "碎片 \(fragmentCount) / \(TreasurePassiveEngine.maxFragments)")
                                .font(.caption.bold())
                            Label(
                                (complete ? "已生效：" : "集齊後：") + passive.description,
                                systemImage: complete ? "sparkles" : "lock.fill"
                            )
                            .font(.caption)
                            .foregroundStyle(complete ? AppTheme.accent : AppTheme.secondaryText)
                        }
                        .frame(maxWidth: .infinity, minHeight: 245, alignment: .topLeading)
                        .padding()
                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                        .accessibilityElement(children: .combine)
                        .accessibilityIdentifier("passive-treasure-\(passive.id)")
                    }
                }
            }
            .padding()
        }
    }

    private var collectedPhrases: [Phrase] {
        guard let phrases = container.content?.phrases else { return [] }
        let order = Dictionary(uniqueKeysWithValues: container.progress.collection.enumerated().map { ($0.element, $0.offset) })
        return phrases.filter { order[$0.id] != nil }.sorted { order[$0.id, default: 0] < order[$1.id, default: 0] }
    }

    private var filteredPhrases: [Phrase] {
        return collectedPhrases.filter {
            (typeFilter == "全部" || $0.type.rawValue == typeFilter)
                && (dynastyFilter == "全部" || $0.dynasty == dynastyFilter)
                && (searchText.isEmpty || [$0.text, $0.meaning, $0.author ?? "", $0.dynasty ?? ""]
                    .contains { $0.localizedCaseInsensitiveContains(searchText) })
        }
    }

    private var wrongPhrases: [Phrase] {
        let ids = container.progress.wrongBook ?? []
        let byID = Dictionary(uniqueKeysWithValues: (container.content?.phrases ?? []).map { ($0.id, $0) })
        return ids.compactMap { byID[$0] }
    }

    private var dueReviewPhrases: [Phrase] {
        let phrases = container.content?.phrases ?? []
        let limit = TreasurePassiveEngine().reviewLimit(in: container.progress)
        let ids = LearningQuizEngine().dueReviewPhraseIDs(
            phrases: phrases,
            progress: container.progress,
            dateKey: TaiwanDate.dateKey(),
            limit: limit
        )
        let byID = Dictionary(uniqueKeysWithValues: phrases.map { ($0.id, $0) })
        return ids.compactMap { byID[$0] }
    }

    private var wrongBookReviewPhrases: [Phrase] {
        let limit = TreasurePassiveEngine().reviewLimit(in: container.progress)
        return Array(wrongPhrases.prefix(limit))
    }

    private var typeValues: [String] {
        ["全部"] + Array(Set(collectedPhrases.map { $0.type.rawValue })).sorted()
    }

    private var dynastyValues: [String] {
        ["全部"] + Array(Set(collectedPhrases.compactMap(\.dynasty))).sorted()
    }

    private func filterMenu(
        _ title: String,
        selection: Binding<String>,
        values: [String]
    ) -> some View {
        Menu {
            ForEach(values, id: \.self) { value in
                Button(value) { selection.wrappedValue = value }
            }
        } label: {
            Label(selection.wrappedValue == "全部" ? title : selection.wrappedValue, systemImage: "line.3.horizontal.decrease.circle")
        }
    }
}

private enum TreasurePresentation {
    static func assetName(for id: String) -> String {
        switch id {
        case "dashen-bian": return "TreasureDashenBian"
        case "qiankun-quan": return "TreasureQiankunQuan"
        case "sanjian-liangren-dao": return "TreasureSanjianLiangrenDao"
        case "yinhun-deng": return "TreasureYinhunDeng"
        case "zhuxian-jian": return "TreasureZhuxianJian"
        default: return "TreasureDashenBian"
        }
    }

    static func abilityLabel(for ability: String) -> String {
        switch ability {
        case "revealHiddenNode": return "顯示本章尚未發現的事件節點"
        case "openRouteShortcut": return "開啟返回未探索支線的捷徑"
        case "previewEventChoice": return "預覽事件選項的效果類型"
        case "revealDailyEncounter": return "標出當日奇遇所在區域"
        case "unlockTrueEnding": return "解鎖空白天書真結局入口"
        default: return "收藏能力待揭曉"
        }
    }
}
